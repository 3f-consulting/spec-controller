# Scheduled checks — measure on a cadence, gate on every push

Some quality checks cost more than a per-push ladder can afford: a full mutation
sweep, a long soak, a large end-to-end matrix. You still want their verdict to
hold the line on every push. The pattern is to run the check on a schedule,
**persist** its number, and on each push **restore** that number into the run's
ledger while it is still young enough to be about this code. Past its window it
posts nothing, the bar it would have settled reconciles `missing`, and the
ledger reds — a schedule that has quietly stopped cannot stay quiet.

This page is for anyone wiring such a check into their own CI. The two shipped
composite actions — `persist-measurements` and `restore-measurements` — plus the
CLIs behind them are a **library** you import into your pipeline. `spec-controller`
does not sit in your pipeline; you own your bars and their enforcement (see
[Ownership](#ownership)).

---

## The scenario is the registry

A scheduled check is not a new kind of thing. It is a **stepless fitness
scenario** — a `@<check>` tag plus a threshold in `specController.thresholds`,
exactly like `@ci-run-time`. The only difference is cadence: the measurement
arrives from last night's run rather than from this one's. There is no separate
registry of scheduled checks to maintain — your `.feature` corpus already names
every evidence obligation, this one included. Author the scenario, give it a
threshold, and the reconciliation treats a stale-or-missing nightly number the
same way it treats any obligation with no evidence: out of balance.

---

## Two halves, one shared term

Persist runs in the **scheduled** workflow; restore runs on **push**. The one
term the two must agree on is `artefact-name` — restore borrows what persist left
under that exact name, and that agreement is the whole contract between them.

- **Persist** (scheduled workflow, after the check has measured): dates the run's
  measurement artefact with the clock it measured on, and uploads it under
  `artefact-name`.
- **Restore** (push CI, before `balance`): downloads the latest *successful*
  scheduled run's artefact by `artefact-name` + `workflow`, and — if it is younger
  than `max-age` — posts its rows into this run's measurement artefact, the same
  file `balance --measurements` reads.

Neither action names a check, a runner, a workflow, or a repository in its body.
Everything that varies between projects is an input, so a second project with a
different cadence passes a different `max-age`, not a forked copy of the file.

---

## The freshness window

`max-age` (seconds) is how long the persisted number stays close enough to true
about the code this push is judging. Freshness is decided at the **restoring
run's own clock** — "now" is the run's timestamp, an input — so the decision is
deterministic and the reconciler never has to learn what time it is. A row that
has aged out simply never reaches the reconciler; it then reads `missing`,
already the true sentence, already out of balance. Aged out, absent, and
undated all read the same way: no fresh row. The loud default is the one that
reds.

Do not confuse `max-age` with `retention-days` (on persist, default `14`):

| Setting | Belongs to | What it governs |
|---|---|---|
| `retention-days` | persist | How long the uploaded **artefact** is kept. Has only to outlast the gap between two scheduled runs, so a fetch always finds *an* artefact. |
| `max-age` | restore | How long the **number** inside it is still worth posting — the freshness window over the artefact a fetch found. |

They are different facts and belong to the caller for different reasons. Set
`retention-days` comfortably longer than your schedule's period; set `max-age` to
the window past which last night's number no longer describes today's code.

---

## Wiring

Both actions reach their CLI by bin name with `npx --no`, so the version they run
is **your manifest's**, never one fetched from the registry behind your back. That
means `spec-controller` must be an installed dependency in the workspace before
either action runs (the published package ships its `dist/`, so the bins
`spec-controller-persist-measurements` and `spec-controller-restore-measurements`
resolve once it is installed).

### In the scheduled workflow

After your expensive check has run and posted its measurement into the run's
measurement artefact (`runs/self-balance/measurements.json`):

```yaml
- name: Persist last night's measurement
  uses: 3f-consulting/spec-controller/.github/actions/persist-measurements@main
  with:
    artefact-name: nightly-measurements
    retention-days: "14"
```

### On push

```yaml
- name: Restore last night's measurement while it is still fresh
  uses: 3f-consulting/spec-controller/.github/actions/restore-measurements@main
  with:
    artefact-name: nightly-measurements   # must match the persist above
    workflow: nightly.yml                  # file name, or the workflow's name:
    max-age: "86400"                       # 24h, in seconds

- name: Reconcile
  run: |
    npx spec-controller balance \
      --features ./features \
      --measurements ./runs/self-balance/measurements.json \
      --format md:reconciliation.md \
      --format json:reconciliation.json
```

Your push run's own measured checks (e.g. `@ci-run-time`) post into the same
`runs/self-balance/measurements.json`; restore merges the fresh nightly rows in
beside them, so one `--measurements` read gives `balance` every measured row.

> **Pinning.** The examples ref the actions at `@main` because the actions are
> not yet tagged for release. Pin to a tag or a commit SHA once they are — a
> third-party action on a moving branch is a supply-chain risk, and versioning
> the action's three-input contract is part of the launch hardening.

---

## Ownership

Two roles, kept distinct (operator ruling, 2026-08-26):

- A **project runs `spec-controller` as its own gate** — it owns its bars and the
  enforcement of them in its own CI.
- **`spec-controller` observes** portfolio quality-check health — whether a
  registered check ran, is fresh, and passed.

The freshness/restore mechanism ships as a **library** — a CLI plus composite
action a project imports into its own CI — **never `spec-controller` in the
project's path**. Build once, no per-project local reader. When you wire these
actions in, the bar is yours, the schedule is yours, the window is yours; the
library only supplies the dated-persist and fresh-restore plumbing so you do not
hand-roll the dating or the age check and drift over the one field the two halves
share (`measuredAt`).

---

## Action reference

### `persist-measurements`

| Input | Required | Default | Purpose |
|---|---|---|---|
| `artefact-name` | yes | — | The name to upload the dated measurement under. The restore that borrows it names the same one. |
| `retention-days` | no | `"14"` | How long the uploaded artefact is kept. Must outlast the gap between two scheduled runs. |

Reads the run's measurement artefact at `runs/self-balance/measurements.json`,
stamps it with `measuredAt` (the run's own clock), and uploads it. A run that
measured nothing uploads nothing (`if-no-files-found: ignore`) — the borrowing
run reads `missing`, out loud on the row that owed the number.

### `restore-measurements`

| Input | Required | Default | Purpose |
|---|---|---|---|
| `artefact-name` | yes | — | The uploaded artefact holding the persisted measurement. Must match the persist. |
| `workflow` | yes | — | The scheduled workflow whose latest successful run persisted it — its file name, or the `name:` it carries. |
| `max-age` | yes | — | How long, in seconds, the persisted number stays close enough to true about this code. |
| `github-token` | no | `${{ github.token }}` | The token the persisted artefact is fetched with. |

Downloads the latest successful run's artefact, and if it is younger than
`max-age`, posts its still-fresh rows into this run's measurement artefact for
`balance --measurements` to read.

---

## What each side says, and how to read it

The quiet paths are quiet because they are true; there is one loud path, and it
is a misuse rather than a verdict.

- **No scheduled run yet / no artefact uploaded / number past its window** — the
  restore logs a lapsed schedule and exits `0`, the rows read `missing`, and the
  ledger says so. This is the ordinary reading of a cadence, not a fault of the
  step's.
- **`::error::` … holds no `measurements.json` (exit 1)** — the artefact named by
  `artefact-name` is present but holds no measurement. This is the step pointed at
  the *wrong* upload: a fault in how it was called, not a lapsed cadence. Check
  which artefact `artefact-name` names.

Because a lapsed schedule and a genuinely missing number both surface as
`missing` on the ledger, the restore also prints what it fetched — the run id,
the workflow, and the files that arrived — on every run, so the log tells the two
apart rather than leaving them to be distinguished by absence.
