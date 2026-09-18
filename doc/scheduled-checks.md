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

The workflow below is the one this repository grew against itself, in
[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) and
[`.github/workflows/mutation.yml`](../.github/workflows/mutation.yml). It is
written out here rather than summarised because a recipe that disagrees with the
pipeline it came from is worse than no recipe.

**Where a converted check differs, and why it is not in the recipe.** Under conversion the
characteristic, the command and the bar live in one row of `specController.fitnessChecks`, and the
credit comes from the **step's own entry in the run record** — `balance` runs nothing. The nightly
then leaves its **sweep record** as `mutation-measurements.json` in the evidence root and the placement puts
it there, apart from the credit stream: a placed row sitting in `measurements.json` would be a
second credit for one evidence obligation. Nothing below depends on that. The recipe as written is
what an **unconverted** measured check needs, and it stays correct for a target that has not
converted.

---

## The scenario is the registry

A scheduled check is not a new kind of thing. It is a **`@fitness`
scenario** whose bar lives on its row of `specController.fitnessChecks`, exactly
like every other measured check. The only difference is cadence: the measurement
arrives from last night's run rather than from this one's. The scenario and the
row are **two authored artefacts, neither derived from the other** — a scenario
with no row, and a row with no scenario, are both faults something says out
loud. Author both, and the reconciliation treats a stale-or-missing nightly
number the way it treats any obligation with no evidence: out of balance.

---

## Moving the measurement — native CI, nothing to install

Your nightly produces a measurement file — the same JSON `balance --measurements`
reads. Two native steps carry it from the nightly run to the push run.

**The measurement is your run's OUTPUT, so it never lands in your checkout.** Both
jobs below resolve one directory on the runner's own disk and every path in the
recipe hangs off it. This repository learned that the hard way: it wrote its own
evidence into its own source tree, then grew a `.gitignore` block and a hygiene
check to hold back what it had chosen to do — three pieces of apparatus for a
condition it could simply remove. Removing the condition removed all
three.

Resolve it in a **step**, not a job-level `env:` key: `jobs.<id>.env` cannot read
the `runner` context, so a workflow naming `${{ runner.temp }}` there fails to
start. `$RUNNER_TEMP` is an ordinary variable inside a `run:` shell. The value
survives between steps because it is **one job** — one job is one runner
filesystem. Split the job in two and nothing reds: the placement's measurement stops
reaching the read, and the row reports `missing`, wearing the words a lapsed
schedule wears.

```yaml
- name: Resolve the evidence root
  run: echo "EVIDENCE_DIR=$RUNNER_TEMP/measurements" >> "$GITHUB_ENV"
```

Put that step in the **nightly** job and in the **push** job, spelled identically
in both — a disagreement between the two is silent, and reads downstream exactly
like a schedule that has lapsed.

**Nightly**, after the check has measured, upload the file:

```yaml
- uses: actions/upload-artifact@v7
  with:
    name: nightly-measurements
    path: ${{ env.EVIDENCE_DIR }}/measurements.json
    # A sweep that measured nothing uploads nothing, and the push run then finds
    # no artefact — which reconciles `missing`, the true sentence for it.
    if-no-files-found: ignore
    # The artefact only has to outlast the gap between two runs of the schedule.
    retention-days: 14
```

**Write the window once, in a file each placement sources.** The moment you have
a second thing to place — a suite timing, a coverage number — the window is
copied, and two copies that happen to agree are not one rule. Keep the file out
of your package scripts if, like this repository, you derive a local check ladder
from them: this is a rule a placement asks, not a gate anybody runs.

```bash
# scripts/freshness-window.sh — sourced, never run.
#
# 26 h = a 24 h cadence + 2 h margin, in seconds. Write the DERIVATION, never the
# bare number: a reader whose sweep runs twice daily gets 14 from the rule, rather
# than copying 93600 and inheriting a cadence that is not theirs.
MAX_AGE=93600

# Given the moment a measurement was taken and the name of what is being placed,
# answer whether it is still inside the window — refusing on stderr and returning
# non-zero when it is not. It takes an EPOCH SECOND and never an ISO string:
# parsing a run's `createdAt` and reading a file's mtime are spelled differently
# on GNU and BSD, and both are the caller's transport problem.
#
# The age it computed is left in `FRESHNESS_AGE` for the caller's own sentence,
# so a placement that succeeds can say how old what it placed is without a second
# subtraction over a clock that has moved since.
#
# A NEGATIVE AGE IS REFUSED BEFORE THE WINDOW IS CONSULTED: a measurement dated in
# the future is the one arithmetic that would otherwise pass every window there is.
inside_the_freshness_window() {
  local measured_at="$1"
  local what="$2"

  FRESHNESS_AGE=$(( $(date -u +%s) - measured_at ))

  if [ "${FRESHNESS_AGE}" -lt 0 ]; then
    echo "place: ${what} is dated ${FRESHNESS_AGE#-}s in the future; nothing is placed." >&2
    return 1
  fi

  if [ "${FRESHNESS_AGE}" -gt "${MAX_AGE}" ]; then
    echo "place: ${what} measured ${FRESHNESS_AGE}s ago, past the ${MAX_AGE}s window; nothing is placed. The row will read missing, which is the true sentence: the measurement has lapsed." >&2
    return 1
  fi

  return 0
}
```

**On push**, fetch the latest **finished** nightly's file. Every branch below that
cannot finish the job places nothing, says why on stderr, and exits 0 — the
reason is in [*Fail-closed*](#fail-closed--on-any-ambiguity-place-nothing), and
the reason this step comes **first** in the job is in
[*Ordering*](#ordering--the-fetch-runs-before-your-own-producers). What is left in
the step is this row's **transport** — which run to select, how to read its clock,
how to fetch and place what it left. Many transports, one rule.

```yaml
- name: Place the scheduled check's measurement
  env:
    GH_TOKEN: ${{ github.token }}
    # The three terms that are the whole contract with the schedule: which
    # workflow took the measurement, which LINE it was taken on, and what it left
    # the measurement under. HOW LONG that number stays close enough to true about
    # this code is not among them — it is in the sourced rule above, so that a
    # second placement cannot disagree with this one about the window.
    #
    # BRANCH IS WRITTEN OUT RATHER THAN DERIVED FROM `github.ref_name`. This
    # ladder also runs on pull requests, and nothing sweeps a feature branch — so
    # placing from the branch UNDER TEST would find no run and read `missing` on
    # every pull request. A pull request's measured row is therefore a statement
    # about the line it is merging into, not about itself, and that is deliberate.
    WORKFLOW: nightly.yml
    BRANCH: main
    ARTEFACT: nightly-measurements
  run: |
    # NO `-e`, DELIBERATELY. Every failure below is answered where it happens
    # with a sentence and `exit 0`; `-e` would turn one of them into a red step,
    # which is the one reading this must never manufacture.
    set -uo pipefail

    . scripts/freshness-window.sh

    # THIS STEP LEAVES THIS RUN'S MEASUREMENT IN THE EVIDENCE ROOT OR IT LEAVES
    # NOTHING, AND THAT IS ONE RULE RATHER THAN A BRANCH. Every path below that
    # does not place says "nothing is placed" and exits 0 — and on a root that
    # OUTLIVES the run, that sentence has no effect at all: an earlier run's copy
    # is still sitting here and the row's own command reads it. Removed HERE
    # rather than at each refusal, for the reason `set -e` is cleared once above:
    # eight paths out of this script place nothing and a ninth is one edit away,
    # and a guarantee resting on a hand-derived list of them rests on the list.
    #
    # AND IT REMOVES THIS ROW, NEVER THE ROOT. What goes is exactly the record
    # this step answers for; the test below decides whether it comes back. Other
    # placements' records, and anything deliberately under no window, are not
    # this step's to touch. Note the cost this takes deliberately: an absent
    # source removes a copy that may still be inside its window, so the row can
    # read `missing` where evidence arguably existed. The alternative needs the
    # measurement's time to survive a copy that carries the COPY's time instead,
    # and getting that wrong is a satisfied row on a stale number. Take the rule
    # that fails loudly.
    rm -f "${EVIDENCE_DIR}/measurements.json"

    # Downloaded to a scratch directory of its own, never straight to the path
    # the reconciliation reads: nothing reaches the evidence root until it has
    # been read and found to be a measurement.
    into="${RUNNER_TEMP}/placed-measurement"
    rm -rf "${into}"
    mkdir -p "${into}"

    # THE NEWEST FINISHED RUN, NEVER THE NEWEST SUCCESSFUL ONE. A run's
    # conclusion answers whether the nightly's own VERDICT passed; this is asking
    # what that night's sweep MEASURED, and the night that finds a regression is
    # exactly the night whose conclusion is `failure`. Filter on success and you
    # reach back past that run to the last green one and place ITS number —
    # settling today's bar with a measurement about an older tree, and
    # reconciling the row satisfied over a regression the sweep had already
    # detected and already said out loud. `gh` reads both a run's status and its
    # conclusion off this one flag; `completed` is the status, so it selects on
    # having FINISHED and on nothing else. It excludes `queued` and
    # `in_progress` on purpose: a sweep still running has nothing to hand across.
    if ! latest="$(gh run list --workflow "${WORKFLOW}" --branch "${BRANCH}" \
      --status completed --limit 1 --json databaseId,createdAt)"; then
      echo "place: could not list runs of ${WORKFLOW}; nothing is placed." >&2
      exit 0
    fi

    id="$(printf '%s' "${latest}" | jq -r '.[0].databaseId // empty')"
    when="$(printf '%s' "${latest}" | jq -r '.[0].createdAt // empty')"
    if [ -z "${id}" ] || [ -z "${when}" ]; then
      echo "place: ${WORKFLOW} names no finished run on ${BRANCH} carrying both an id and a createdAt; nothing is placed." >&2
      exit 0
    fi

    # A timestamp that will not parse must not be arithmetic. Unguarded, the
    # subtraction below would produce a number anyway, and the window comparison
    # would pass on it.
    if ! measured_at="$(date -u -d "${when}" +%s 2>/dev/null)"; then
      echo "place: run ${id} reports createdAt ${when}, which is not a moment this runner can read; nothing is placed." >&2
      exit 0
    fi
    # THE WINDOW IS ASKED HERE, BEFORE THE PAYLOAD IS FETCHED AND BEFORE ANYTHING
    # IS PLACED. A run past the window is never downloaded, so the reader
    # downstream meets no record at all. The shared rule refuses a negative age
    # too, and says why on stderr; this step's business is only that the refusal
    # happens HERE, ahead of the fetch.
    if ! inside_the_freshness_window "${measured_at}" "run ${id}"; then
      exit 0
    fi

    if ! gh run download "${id}" --name "${ARTEFACT}" --dir "${into}"; then
      echo "place: run ${id} left no ${ARTEFACT} to download; nothing is placed." >&2
      exit 0
    fi

    # Found by name wherever the upload put it: an artefact holding one file and
    # an artefact holding a tree flatten differently.
    found="$(find "${into}" -type f -name measurements.json -print -quit)"
    if [ -z "${found}" ]; then
      echo "place: ${ARTEFACT} from run ${id} holds no measurements.json; nothing is placed." >&2
      exit 0
    fi

    # WHAT ARRIVED IS READ BEFORE IT IS PLACED. An empty or malformed payload
    # copied into the tree would settle nothing while reading exactly like a
    # payload that was never fetched, so the two are told apart here.
    if ! jq -e '(.measurements | type) == "array" and (.measurements | length) > 0' \
      "${found}" >/dev/null 2>&1; then
      echo "place: measurements.json from run ${id} carries no measurements to place; nothing is placed." >&2
      exit 0
    fi

    # A plain copy, because this step runs before your own producers and so
    # nothing has posted yet. The evidence root is a directory on the runner, not
    # in the checkout, so the first contributor to the job is what creates it.
    if ! { mkdir -p "${EVIDENCE_DIR}" && cp "${found}" "${EVIDENCE_DIR}/measurements.json"; }; then
      # A HALF-WRITTEN COPY IS NOT A PLACEMENT EITHER. The removal above ran
      # before this `cp` began, so what a failure here can leave behind is this
      # run's own partial file — which the row's command would read as a
      # measurement. The one branch that can put something there without placing
      # it is the one branch that takes it away again.
      rm -f "${EVIDENCE_DIR}/measurements.json"
      echo "place: could not place ${ARTEFACT} from run ${id} into the evidence root; nothing is placed. The row will read missing, and this is NOT the lapsed schedule that sentence usually reports: the measurement arrived and this runner could not put it where the check that reports it reads it." >&2
      exit 0
    fi
    echo "place: placed ${ARTEFACT} from run ${id}, measured ${FRESHNESS_AGE}s ago, inside the ${MAX_AGE}s window:"
    jq -r '.measurements[] | "place:   \(.scnId) \(.checkTag) = \(.measured)"' \
      "${EVIDENCE_DIR}/measurements.json"
```

Then your own suites run, and the reconciliation reads one file:

```yaml
- name: Reconcile
  run: |
    npx spec-controller balance \
      --features ./features \
      --measurements "${EVIDENCE_DIR}/measurements.json" \
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

Your push run's own measured checks (`ci-run-time` and friends) write into the
same `${EVIDENCE_DIR}/measurements.json`, and each posts **beside** what it
finds: it reads the existing file and replaces only its own row. The placed
nightly row therefore sits beside them **only if it is placed first** — the two
suite producers are then the merge.

Place it after them and it does not merge, it **overwrites**: the copy above (and
`gh run download --dir "${EVIDENCE_DIR}"` unpacking straight over the file the
producers post into, which is why this recipe downloads to scratch instead)
replaces the whole file,
discarding every row your own run had just measured. Those obligations then
reconcile `missing` and the build reds on rows that were, in fact, measured.

So the placement step goes **above** the steps that run your suites. This is the
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

**Past the window is not "do not place" — it is "remove".** On an evidence root
that outlives the run, placing nothing has no effect: the last run's copy is
still there, and the row's own command settles the bar with a number this run has
already refused. Two outcomes on paper, one effect. So the placement's first act
is to delete the record it answers for, and the window test then decides whether
it comes back. If your root is a scratch directory GitHub discards between jobs
you will not notice the difference — which is luck rather than mechanism, and it
is not a property to build on.

**A placement may only remove what it OWNS, and in this recipe that is the whole
file — read why before you copy it.** `balance --measurements` takes ONE report,
so this page's single placed row writes straight into it and nothing else in the
run has written yet (see [*Ordering*](#ordering--the-fetch-runs-before-your-own-producers)):
everything the removal takes is last run's, and the `cp` in the recipe above
would have replaced all of it a moment later anyway. **That stops being true the
moment you have a second placed row.** Two placements into one file, and
whichever runs first removes the other's record as well — which is a root clear
wearing a row removal's clothes, and a fresh instance of the fault this rule
exists to close. Give each placed row its own record then, named for the row, and
have each row's own command read its own file and post its number into the
report. This repository shared one timings record between two rows until it hit
the neighbouring version of the same problem — a shared record has one AGE, so
one window decision placed or refused both rows together — and split it into a
file per row, before dropping timing records altogether for a `timeout` on each
suite's own step.

**One comparison means one file.** The window and the arithmetic against it live
in `scripts/freshness-window.sh`, sourced by every placement; the steps hold only
their own transport. Three placements that happen to agree on a number are three
rules, and the day one of them moves, the other two go on being green about a
window nobody is applying.

Read the **run's** clock, never the payload's. A measurement cannot outlive the
run that took it, so the run's own `createdAt` bounds anything the payload could
claim — and unlike the payload's, it is not written by the very run being judged.
A `measuredAt` stamped into the artefact is a fact GitHub already records.

The reconciler never learns the time: "now" is the run's own instant, an input,
and a measurement that was not placed is simply not there to reconcile.

**The window is a derivation, not a number you pick: your producer's cadence
plus a margin.** A nightly is **24 h + 2 h = 26 h**. A twice-daily sweep reads
the same rule and gets 14. Write the derivation into the sourced rule rather than
the figure, so a change of cadence carries its own answer — and keep it in your
pipeline, never in the tool: it is a fact about your pipeline, not about your
code.

---

## Fail-closed — on any ambiguity, place nothing

Every branch of the step above that cannot finish the job does the same three
things: leaves nothing of its own in the evidence root — the record it answers
for was removed at the top of the step, and nothing puts it back — prints why on
stderr, and **exits 0**. That is not
leniency — it is the opposite, and it is worth being explicit about why, because
the permissive version of this step is easy to write by accident.

**Place nothing.** A number the step cannot vouch for must not reach the tree. No
finished run; a run naming no id or no `createdAt`; a `createdAt` that will not
parse; an age that comes out negative; an age past the window; a download that
fails; an artefact holding no `measurements.json`; a payload that is not JSON, or
whose `measurements` array is absent or empty — each of those is a case where the
step does not know what it has, and the one outcome that must be unreachable is a
stale or unattributable number posting as a fresh pass. An unguarded
`date -d "$created"` gets you exactly that: an unreadable timestamp becoming
arithmetic anyway and satisfying the window. The negative-age and past-window
arms are not in the step at all — they are in the sourced rule, which is the only
place either comparison is written.

**Exit 0.** The step is not the arbiter — the ledger is. An unplaced file leaves
the obligation reconciling `missing`, and the reconciliation reds on the row that
owed the measurement: one loud place, the same reading a schedule that quietly
stopped running produces. A step that redded here as well would make a green
build depend on two arbiters agreeing, and the second arbiter would report the
fault twice under two different names.

So there is exactly one way to read this pipeline, and it is the reconciliation
report. Everything the placement step knows, it says on stderr; everything it
decides, it decides by placing a file or not placing one.

---

## Ownership

`spec-controller` observes, and is run as a tool. It is not in your enforcement
path. You own the check, its schedule, its freshness window, and the handful of
CI lines above that move its result. Nothing here imports spec-controller — you
invoke `balance` and hand it a file. How the file got there is your pipeline's
business, and it is plain GitHub Actions.
