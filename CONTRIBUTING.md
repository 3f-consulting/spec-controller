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
see *A LOCAL SELF-RECONCILIATION READS `ci.yml`, NOT A RUN* below. Measured at 3F-3501 with the
pinned binary: every command above green, and the reconciliation out of balance on `@SCN-FIT-012`
and `@SCN-FIT-013` alone. Those are the two run-time rows, and their steps are the suites' runners,
so nothing credits them without the run's own step record — which only CI writes. Every other
fitness row reads `satisfied` from `ci.yml`'s text, `@SCN-FIT-002` included, and that is not a
verdict on any check.

**Every converted check is a CI step, carrying its `@SCN` as the step's `id:`.** A converted check
is a `@fitness` scenario and a `run:` step whose `id:` is that scenario's `@SCN` — the command in
the pipeline, the obligation in the scenario, the observation in the run's own record of what its
steps did. Nothing else declares it (3F-3582).

**A check that only held our vocabulary is deleted rather than converted.** With one `@fitness` tag
and no word classifying a check at all (3F-3525), there is nothing for a check policing such words
to police.

**What a step left out of the local run costs you, nothing prints any more.** There was a
mechanism here — a derived ladder that named every omission and its reason on every run, and
redded on an exclusion excusing a step CI no longer ran. It left with the derivation (3F-3475),
and so did `specController.ciOnlyExclusions`, which nothing reads. What is left is the pipeline
itself: a step you did not run locally is a step you find out about on the pull request.

**The two run-time rows are not measured, and nothing here times a suite.** `@SCN-FIT-012` (the
unit suite) and `@SCN-FIT-013` (the behavioural suite) are step-outcome rows: `ci.yml` runs each
suite under `timeout 75` and `timeout 150`, the step carries the row's `@SCN` as its `id:`, and the
row names no bar. A suite past its limit fails its step, and the ledger reads that outcome as it
reads any other converted check's.

**The mutation row is not measured either, and it reads a verdict no local run takes.**
`@SCN-FIT-002` — this repository's own domain-core mutation score — is a step-outcome row with no
bar. `ci.yml`'s `Mutation score` step carries its `@SCN` as its `id:` and asks stock `gh` whether the
newest `mutation.yml` run on `main`, created inside the last 26 hours, concluded `success`. The bar
is the 95 `stryker.config.mjs` states as `thresholds.break`, and it is written nowhere else.

A mutation sweep costs 8-12 minutes on CI, so it runs nightly (`.github/workflows/mutation.yml`).
**The window is the schedule's cadence plus a margin — 24 h + 2 h = 26 h** for a nightly. A lapsed,
crashed or below-bar sweep fails the step, and on an ordinary push that reds the job before the
self-reconciliation runs, so the lapse shows as a red job rather than a `failing` line. The recipe,
and what reading a verdict instead of a number gives up, is
[`doc/scheduled-checks.md`](./doc/scheduled-checks.md).

To see the score on your machine, run the sweep:

```
pnpm mutation
```

That is `stryker run` and nothing else. It exits non-zero below 95, and the report is under
`reports/mutation/`. Nothing a local run does settles the row. A local self-reconciliation does
read `@SCN-FIT-002` `satisfied`, but only because `ci.yml` carries the `Mutation score` step: it
runs no sweep and asks `gh` nothing — see below.

**A LOCAL SELF-RECONCILIATION READS `ci.yml`, NOT A RUN, AND THAT IS THE DESIGN RATHER THAN A
FAULT.** A local run cannot settle a fitness row — only CI produces a step record. The fitness
axis's credit journal is the CI run's own record of what each of its steps did, dumped by an
`if: always()` step of `ci.yml`. Your machine runs no pipeline, so the self-reconciliation is handed
no record, and a run handed no record reconciles exactly as it did before there was one
(`@SCN-LNT-027`). What answers is the running-check observer alone, and it reads `ci.yml`'s text
(`@SCN-USG-001`): a configured row whose step it reads as a check is credited `satisfied` — a credit
that says the step is in the pipeline and its job does not survive its red, **not that the check
ran, let alone passed**. A row whose step runs one of the named behavioural runners is not a check
to that reader, so nothing credits it and it reconciles `missing`. So the run is out of balance at
exit 1, and NOT unsound: a run handed no record of itself is a different fact from a run whose
record carried nothing, which makes every configured row broken evidence and exits 4. **The checks
themselves still run locally** — every one of them is a step of `ci.yml` you can type at a shell —
and their teeth are their own exit codes, unchanged. What a local run does not have is the ledger's
view of them: a fitness row's local `satisfied` is a view of the pipeline's text, and the one place
the view of a run is real is CI.

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
counts the credits the configured rows' steps post, each answered by its step's exit code.

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
[`doc/adopting-fitness-checks.md`](./doc/adopting-fitness-checks.md), so a reader who meets
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
