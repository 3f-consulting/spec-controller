# Contributing to spec-controller

## Change discipline

Every change to `main` goes through a pull request. Direct pushes to `main` are
blocked by branch protection; a PR that passes CI is the only path in.

1. **Branch** off `origin/main`: `git switch -c <your-branch> origin/main`.
2. **Commit** with an intent-first message. Work tied to a tracked item leads with
   its ID, e.g. `[3F-1413] adopt PR discipline before publish`.
3. **Open a PR.** Draft while in progress; mark ready for review when it stands up.
4. **CI must be green.** The `ci` check is a required status check — a PR cannot
   merge until it passes.
5. **Merge** with squash once CI is green: `gh pr merge --squash --delete-branch`.

Branch protection currently requires a passing `ci` check and a PR, with zero
required approvals (a solo maintainer self-merges on green). Required approvals
earn their place once there is a second reviewer.

## The CI gate

CI (`.github/workflows/ci.yml`) runs on every push to `main` and every PR, on
ubuntu with a frozen lockfile. It is the single source of truth for "green" — a
local pass on one machine is not evidence the gate holds in CI.

**CI is the gate, and it is the only green.** No single local command reproduces it, and
deliberately so: this repository once *derived* a local ladder from `ci.yml` so that a
hand-assembled green-check could not silently narrow — and that derivation was 1,400 lines of
check code of our own, in an exemplar whose whole claim is that a consumer writes none. It was
deleted at 3F-3475. A consumer's pipeline is their gate, and ours is ours.

The history is kept because it is why this document still lists no gates. It once listed five
and said CI ran the same steps — CI ran thirteen, so an implementer who followed it *correctly*
skipped `lint:complexity` and a red build was reported green (3F-2402). 3F-2420 moved the list
into a script, which drifted the same way within four commits. **A hand-maintained list drifts
wherever it is kept**, so there is none here either: read `.github/workflows/ci.yml`, which is
the pipeline and the list at once.

Before opening a PR, install with a frozen lockfile and run what your change touches:

```
export SPEC_CONTROLLER_EVIDENCE_DIR="$(mktemp -d)"
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm test
pnpm cucumber
```

**None of that is a green-check, and a local pass is not evidence.** A red there is real and
worth fixing before you push; a green across all of it says nothing about the gates it leaves
out. The pull request's CI run is the verdict, and the only one.

**The self-reconciliation reads what the two suites emitted.** It is
`pnpm spec-controller balance` — the product's own binary, run over this tree with this tree's
scan surfaces (3F-3293). A `--vitest` or `--cucumber` path it is handed and cannot find is a
**setup fault, not a verdict**: it exits 2 naming the flag and the path, because reconciling
against a report that does not exist would report every obligation as unobserved, which means
*the suite did not run*, never *the code is wrong*. So emit both first, into the evidence root
exported above:

```
pnpm test --reporter=default --reporter=json --outputFile.json="$SPEC_CONTROLLER_EVIDENCE_DIR/vitest.json"
pnpm cucumber --format json:"$SPEC_CONTROLLER_EVIDENCE_DIR/cucumber.json"
```

**It will still end at exit 1 on your machine, and that is the design rather than a fault** —
see *A LOCAL SELF-RECONCILIATION REPORTS EVERY FITNESS ROW AS `missing`* below. Measured at
3F-3475, and again once the run-time rows became step outcomes: every command above green, and the
reconciliation out of balance on `@SCN-FIT-012`, `@SCN-FIT-013` and `@SCN-FIT-002` — the first two
because their evidence is their step's outcome in the run's own step record, the third because the
step that PLACES its measurement is a step of `ci.yml`, and your machine runs no pipeline.

**Every converted check is a CI step, carrying its `@SCN` as the step's `id:`.** A converted check
is both a row of `specController.fitnessChecks` and a `run:` step whose `id:` cites that row — the
command in the pipeline, the obligation in the scenario, the observation in the run's own record of
what its steps did.

**A check that only held our vocabulary is deleted rather than converted.** With one `@fitness` tag,
a characteristic is a label on a row rather than a token the parser reads, so a check policing which
characteristic words a manifest may name has nothing left to police.

**What a step left out of the local run costs you, nothing prints any more.** There was a
mechanism here — a derived ladder that named every omission and its reason on every run, and
redded on an exclusion excusing a step CI no longer ran. It left with the derivation (3F-3475),
and so did `specController.ciOnlyExclusions`, which nothing reads. What is left is the pipeline
itself: a step you did not run locally is a step you find out about on the pull request.

**One row is MEASURED — its evidence is a number rather than an exit code.** It has a configured
row in `specController.fitnessChecks` naming the characteristic, the command that prints the
number, and the bar the ledger holds it to. That command is a CI step of its own; it writes what it
read into the run's measurement record, and the self-reconciliation does the comparing. The row is
answered when its command *wrote* a number — whether that number is inside its bar is the ledger's
sentence, in one place.

**The two run-time rows are not measured, and nothing here times a suite.** `@SCN-FIT-012` (the
unit suite) and `@SCN-FIT-013` (the behavioural suite) are step-outcome rows: `ci.yml` runs each
suite under `timeout 75` and `timeout 150`, the step carries the row's `@SCN` as its `id:`, and the
row names no bar. A suite past its limit fails its step, and the ledger reads that outcome as it
reads any other converted check's.

**The measured row reads a number no local run takes.** `@SCN-FIT-002` — this repository's own domain-core
mutation score — names `pnpm --silent mutation:score` and holds it to the `atLeast` on its own row.
That same integer is the `break` threshold `stryker.config.mjs` reads back off the row, so the
ledger and the runner cannot disagree about where the floor is.

A mutation sweep costs 8-12 minutes on CI, so it runs nightly
(`.github/workflows/mutation.yml`) and leaves what it measured as a SWEEP RECORD; CI places
that record into `mutation-measurements.json` while it is still young enough to be about
the code being judged. **The window is the producer's cadence plus a margin — 24 h + 2 h = 26 h**
for a nightly. Past it nothing is placed at all: the command then has nothing to print, its own
step reds and the self-reconciliation reds on the row, which reads `missing`.
That is how a nightly that stops running says so.

On your machine there is nothing to place, so run the sweep once:

```
pnpm mutation
```

That is ~45 seconds locally and writes the sweep record, so `pnpm --silent mutation:score` has a
number to print. Skipping it fails that command and leaves the self-reconciliation reporting the row as
`missing` — the true sentence rather than a false red: no measurement arrived.

**A LOCAL SELF-RECONCILIATION REPORTS EVERY FITNESS ROW AS `missing`, AND THAT IS THE DESIGN RATHER
THAN A FAULT.** A local run cannot settle a fitness row — only CI produces a step record. The
fitness axis's credit journal is the CI run's own record of what each of its steps did, dumped by an
`if: always()` step of `ci.yml`. Your machine runs no pipeline, so the self-reconciliation is handed
no record, nothing is raised for any configured row, and each reconciles
`missing` — out of balance at exit 1, and NOT unsound: a run handed no record of itself is a
different fact from a run whose record carried nothing. **The checks themselves still run locally**
— every one of them is a step of `ci.yml` you can type at a shell — and their teeth are their
own exit codes, unchanged. What a local run does not have is the ledger's view of them, and the one
place that view is real is CI.

**And `measurements.json` — the credit stream — persists between local runs and
is merged into, not rewritten.** CI starts cold; your machine does not. A row you renamed, or a
producer you withheld to plant a fault, will find its own previous output waiting, so a plant can
green on evidence it never produced and a stale credit can reconcile as a phantom row citing an
unknown scenario. **Clear the artefact as part of any plant, and say what state the root was in
when you report the result.**

## The report's `### Static checks` line, and which of its zeros is vacuous

**`0 uncited static check(s)` has two readings and they are not the same claim.** Over a
**populated** discoverable set it means every discovered check cites a scenario — a zero the axis
reached. Over an **empty** set it means nothing was discoverable — a zero it inherited. A capability
exercised by nothing and reporting green is the fault this product is named for, so read the
denominator, never the zero: `0 uncited out of N discovered` is the sentence that distinguishes
them.

The discoverable set is every step of the workflows `--ci` names that is not a declared behavioural
runner, the reconciler itself, or a step the manifest lists in `notChecks`; each check step carries
its row's `@SCN` as its `id:`, so a discovered check that cites nothing is the only thing the count
is reporting. The number beside it is produced by a different mechanism and is not vacuous: it
counts the credits the static rows post, the measured rows being answered by a number rather than by
an exit code.

**Two retirements are in play here and they are not the same one.** The `lint:`/`guard:` **script
prefixes** were retired by
[3F-3343](3F-3343) — a widening, not a removal: a prefixed
script is still observed, because every step is, so no major version was engaged
(the reasoning is on that ticket). The **`specController.staticChecks` registry** is
still honoured and is now inert, and its actual removal is
[3F-3161](3F-3161)'s. **That removal no longer waits on a
consumer and no longer engages a major version** — the compatibility commitment was withdrawn on
2026-09-13 ([3F-3376](3F-3376)) because it was made to nobody,
and measurement found no consumer routing credits through the registry at all. Stated here, in
`features/uncited-static-checks.feature`, and in
[`doc/converting-a-fitness-check.md`](./doc/converting-a-fitness-check.md), so a reader who meets
the zero is not left to infer which one it is.

## Reports live outside the repo

Reconciliation reports are never committed. Nothing in the pipeline writes one into
the tree: `ci.yml` resolves the evidence root to a temp directory
(`SPEC_CONTROLLER_EVIDENCE_DIR`, `$RUNNER_TEMP` on a runner, whatever you export locally),
so a report appearing under version control is now a deliberate act rather than an
accident a guard has to catch. Kept reports belong in an external store.

## Publishing

Publishing is gated on a green CI run existing on `origin` — never publish from a
local-only green. Making the repo public and `npm publish` are deliberate operator
actions taken after CI is proven green on origin.
