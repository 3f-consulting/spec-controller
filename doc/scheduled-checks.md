# Scheduled checks — measure on a cadence, gate on every push

Some quality checks cost more than a per-push ladder can afford — a full mutation
sweep, a long soak, a large end-to-end matrix. You still want their verdict to
hold the line on every push. The pattern: run the check on a schedule, and on
each push feed its latest result to `balance` while it is still recent enough to
be about this code.

`spec-controller` does not run your schedule or move your files. It reconciles a
measurement you hand it, the same way it reconciles a Vitest report you hand it.
Getting last night's number into today's push is ordinary CI — upload an
artifact, download it, check its age. There is no spec-controller machinery to
install for any of that; this page just shows the pattern.

The workflow below is the one this repository runs against itself, in
[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) and
[`.github/workflows/mutation.yml`](../.github/workflows/mutation.yml). It is
written out here rather than summarised because a recipe that disagrees with the
pipeline it came from is worse than no recipe.

---

## The scenario is the registry

A scheduled check is not a new kind of thing. It is a **stepless fitness
scenario** — a `@<check>` tag plus a threshold in `specController.thresholds`,
exactly like `@ci-run-time`. The only difference is cadence: the measurement
arrives from last night's run rather than from this one's. There is no separate
registry to maintain — your `.feature` corpus already names every evidence
obligation, this one included. Author the scenario, give it a threshold, and the
reconciliation treats a stale-or-missing nightly number the way it treats any
obligation with no evidence: out of balance.

---

## Moving the measurement — native CI, nothing to install

Your nightly produces a measurement file — the same JSON `balance --measurements`
reads. Two native steps carry it from the nightly run to the push run.

**Nightly**, after the check has measured, upload the file:

```yaml
- uses: actions/upload-artifact@v7
  with:
    name: nightly-measurements
    path: runs/self-balance/measurements.json
    # A sweep that measured nothing uploads nothing, and the push run then finds
    # no artefact — which reconciles `missing`, the true sentence for it.
    if-no-files-found: ignore
    # The artefact only has to outlast the gap between two runs of the schedule.
    retention-days: 14
```

**On push**, fetch the latest successful nightly's file. Every branch below that
cannot finish the job places nothing, says why on stderr, and exits 0 — the
reason is in [*Fail-closed*](#fail-closed--on-any-ambiguity-place-nothing), and
the reason this step comes **first** in the job is in
[*Ordering*](#ordering--the-fetch-runs-before-your-own-producers).

```yaml
- name: Borrow the scheduled check's measurement
  env:
    GH_TOKEN: ${{ github.token }}
    # The three terms that are the whole contract with the schedule: which
    # workflow took the measurement, what it left the measurement under, and how
    # long that number stays close enough to true about this code.
    WORKFLOW: nightly.yml
    ARTEFACT: nightly-measurements
    MAX_AGE: "129600"          # 36 hours, in seconds — your cadence, your number
  run: |
    # NO `-e`, DELIBERATELY. Every failure below is answered where it happens
    # with a sentence and `exit 0`; `-e` would turn one of them into a red step,
    # which is the one reading this must never manufacture.
    set -uo pipefail

    # Downloaded to scratch, never straight into the tree: nothing reaches
    # runs/ until it has been read and found to be a measurement.
    into="${RUNNER_TEMP}/borrowed-measurement"
    rm -rf "${into}"
    mkdir -p "${into}"

    if ! latest="$(gh run list --workflow "${WORKFLOW}" --status success \
      --limit 1 --json databaseId,createdAt)"; then
      echo "borrow: could not list runs of ${WORKFLOW}; nothing is placed." >&2
      exit 0
    fi

    id="$(printf '%s' "${latest}" | jq -r '.[0].databaseId // empty')"
    when="$(printf '%s' "${latest}" | jq -r '.[0].createdAt // empty')"
    if [ -z "${id}" ] || [ -z "${when}" ]; then
      echo "borrow: ${WORKFLOW} names no successful run carrying both an id and a createdAt; nothing is placed." >&2
      exit 0
    fi

    # A timestamp that will not parse must not be arithmetic. Unguarded, the
    # subtraction below would produce a number anyway, and the window comparison
    # would pass on it.
    if ! measured_at="$(date -u -d "${when}" +%s 2>/dev/null)"; then
      echo "borrow: run ${id} reports createdAt ${when}, which is not a moment this runner can read; nothing is placed." >&2
      exit 0
    fi
    age=$(( $(date -u +%s) - measured_at ))

    # A run dated in the future is a clock nobody can reason about, and it is the
    # one arithmetic that would otherwise pass every window there is.
    if [ "${age}" -lt 0 ]; then
      echo "borrow: run ${id} is dated ${age#-}s in the future; nothing is placed." >&2
      exit 0
    fi

    if [ "${age}" -gt "${MAX_AGE}" ]; then
      echo "borrow: run ${id} measured ${age}s ago, past the ${MAX_AGE}s window; nothing is placed. The row will read missing, which is the true sentence: the schedule has lapsed." >&2
      exit 0
    fi

    if ! gh run download "${id}" --name "${ARTEFACT}" --dir "${into}"; then
      echo "borrow: run ${id} left no ${ARTEFACT} to download; nothing is placed." >&2
      exit 0
    fi

    # Found by name wherever the upload put it: an artefact holding one file and
    # an artefact holding a tree flatten differently.
    found="$(find "${into}" -type f -name measurements.json -print -quit)"
    if [ -z "${found}" ]; then
      echo "borrow: ${ARTEFACT} from run ${id} holds no measurements.json; nothing is placed." >&2
      exit 0
    fi

    # WHAT ARRIVED IS READ BEFORE IT IS PLACED. An empty or malformed payload
    # copied into the tree would settle nothing while reading exactly like a
    # payload that was never fetched, so the two are told apart here.
    if ! jq -e '(.measurements | type) == "array" and (.measurements | length) > 0' \
      "${found}" >/dev/null 2>&1; then
      echo "borrow: measurements.json from run ${id} carries no measurements to place; nothing is placed." >&2
      exit 0
    fi

    # A plain copy, because this step runs before your own producers and so
    # nothing has posted yet. runs/ is gitignored, so on a fresh checkout the
    # first contributor to the job is what creates it.
    mkdir -p runs/self-balance
    cp "${found}" runs/self-balance/measurements.json
    echo "borrow: placed ${ARTEFACT} from run ${id}, measured ${age}s ago, inside the ${MAX_AGE}s window:"
    jq -r '.measurements[] | "borrow:   \(.scnId) \(.checkTag) = \(.measured)"' \
      runs/self-balance/measurements.json
```

Then your own suites run, and the reconciliation reads one file:

```yaml
- name: Reconcile
  run: |
    npx spec-controller balance \
      --features ./features \
      --measurements ./runs/self-balance/measurements.json \
      --format md:reconciliation.md \
      --format json:reconciliation.json
```

---

## The one permission it needs

`gh run list` and `gh run download` read **another workflow's** runs, which the
job's default token does not do unless you say so:

```yaml
permissions:
  contents: read
  actions: read
```

Write the block out rather than leaning on the repository default, so that a
default tightened elsewhere reds here, naming the permission. Without
`actions: read` the fetch returns nothing and places nothing — which is the same
observable outcome as a schedule that has lapsed, and you will go looking for the
wrong fault.

---

## Ordering — the fetch runs before your own producers

Your push run's own measured checks (`@ci-run-time` and friends) write into the
same `runs/self-balance/measurements.json`, and each posts **beside** what it
finds: it reads the existing file and replaces only its own row. The borrowed
nightly row therefore sits beside them **only if it is placed first** — the two
suite producers are then the merge.

Place it after them and it does not merge, it **overwrites**: the copy above (and
`gh run download --dir runs/self-balance` writing straight into the tree, which
is why this recipe downloads to scratch instead) replaces the whole file,
discarding every row your own run had just measured. Those obligations then
reconcile `missing` and the build reds on rows that were, in fact, measured.

So the borrow step goes **above** the steps that run your suites. This is the
whole of the ordering rule, and it is why nothing in it needs a `jq` merge.

---

## Freshness — one comparison, no recorded timestamp

Last night's number should gate today's push only while it is recent. That is the
nightly run's own creation time against a window you choose — and `gh run list`
gives you `createdAt`, so you never record a timestamp yourself. Inside the
window, place the file; past it, do not. When no fresh measurement is placed,
`balance` finds none for that check and reconciles it `missing` — so a schedule
that quietly stopped running reds on its own, and one that ran and failed reads
`failing`, on the same books.

Read the **run's** clock, never the payload's. A measurement cannot outlive the
run that took it, so the run's own `createdAt` bounds anything the payload could
claim — and unlike the payload's, it is not written by the very run being judged.
A `measuredAt` stamped into the artefact is a fact GitHub already records.

The reconciler never learns the time: "now" is the run's own instant, an input,
and a measurement that was not placed is simply not there to reconcile. The
window is yours — a nightly wants ~26 h, a twice-daily check less; it is a fact
about your cadence, so it lives in your workflow, not in the tool.

---

## Fail-closed — on any ambiguity, place nothing

Every branch of the step above that cannot finish the job does the same three
things: places nothing, prints why on stderr, and **exits 0**. That is not
leniency — it is the opposite, and it is worth being explicit about why, because
the permissive version of this step is easy to write by accident.

**Place nothing.** A number the step cannot vouch for must not reach the tree. No
successful run; a run naming no id or no `createdAt`; a `createdAt` that will not
parse; an age that comes out negative; an age past the window; a download that
fails; an artefact holding no `measurements.json`; a payload that is not JSON, or
whose `measurements` array is absent or empty — each of those is a case where the
step does not know what it has, and the one outcome that must be unreachable is a
stale or unattributable number posting as a fresh pass. An unguarded
`date -d "$created"`, or a window comparison with no negative-age arm, gets you
exactly that: a future-dated or unreadable timestamp satisfying the window and
placing the file anyway.

**Exit 0.** The step is not the arbiter — the ledger is. An unplaced file leaves
the obligation reconciling `missing`, and the reconciliation reds on the row that
owed the measurement: one loud place, the same reading a schedule that quietly
stopped running produces. A step that redded here as well would make a green
build depend on two arbiters agreeing, and the second arbiter would report the
fault twice under two different names.

So there is exactly one way to read this pipeline, and it is the reconciliation
report. Everything the borrow step knows, it says on stderr; everything it
decides, it decides by placing a file or not placing one.

---

## Ownership

`spec-controller` observes, and is run as a tool. It is not in your enforcement
path. You own the check, its schedule, its freshness window, and the handful of
CI lines above that move its result. Nothing here imports spec-controller — you
invoke `balance` and hand it a file. How the file got there is your pipeline's
business, and it is plain GitHub Actions.
