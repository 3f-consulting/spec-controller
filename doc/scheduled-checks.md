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
- uses: actions/upload-artifact@v4
  with:
    name: nightly-measurements
    path: runs/self-balance/measurements.json
```

**On push**, fetch the latest successful nightly's file and reconcile:

```yaml
- name: Fetch last night's measurement, if it is still fresh
  env:
    GH_TOKEN: ${{ github.token }}
  run: |
    run_id=$(gh run list --workflow nightly.yml --status success \
      --limit 1 --json databaseId,createdAt --jq '.[0].databaseId // empty')
    created=$(gh run list --workflow nightly.yml --status success \
      --limit 1 --json createdAt --jq '.[0].createdAt // empty')
    if [ -n "$run_id" ]; then
      age=$(( $(date +%s) - $(date -d "$created" +%s) ))
      if [ "$age" -le 86400 ]; then           # 24h window — your cadence, your number
        gh run download "$run_id" --name nightly-measurements --dir runs/self-balance
      fi
    fi

- name: Reconcile
  run: |
    npx spec-controller balance \
      --features ./features \
      --measurements ./runs/self-balance/measurements.json \
      --format md:reconciliation.md \
      --format json:reconciliation.json
```

Your push run's own measured checks (`@ci-run-time`) write into the same
`runs/self-balance/measurements.json`; the fetched nightly rows sit beside them,
so one `--measurements` read gives `balance` every measured row.

---

## Freshness — one comparison, no recorded timestamp

Last night's number should gate today's push only while it is recent. That is the
nightly run's own creation time against a window you choose — and `gh run list`
gives you `createdAt`, so you never record a timestamp yourself. Inside the
window, place the file; past it, do not. When no fresh measurement is placed,
`balance` finds none for that check and reconciles it `missing` — so a schedule
that quietly stopped running reds on its own, and one that ran and failed reads
`failing`, on the same books.

The reconciler never learns the time: "now" is the run's own instant, an input,
and a measurement that was not placed is simply not there to reconcile. The
window is yours — a nightly wants ~26 h, a twice-daily check less; it is a fact
about your cadence, so it lives in your workflow, not in the tool.

---

## Ownership

`spec-controller` observes, and is run as a tool. It is not in your enforcement
path. You own the check, its schedule, its freshness window, and the handful of
CI lines above that move its result. Nothing here imports spec-controller — you
invoke `balance` and hand it a file. How the file got there is your pipeline's
business, and it is plain GitHub Actions.
