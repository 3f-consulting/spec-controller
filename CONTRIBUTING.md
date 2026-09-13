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

**Before opening a PR, run `pnpm verify`.** That is the whole local check — one
command, not a list to assemble by hand:

```
pnpm install --frozen-lockfile
pnpm verify
```

`pnpm verify` (`scripts/verify.sh`) runs every gate ci.yml runs except the ones it names
as it goes, in ci.yml's order and on ci.yml's own command lines, stopping at the first red
and naming the gate that died. Read the script's header for why both the order and the
command strings are load-bearing.

**The last gate is the self-reconciliation, and it reads what the two suites emitted.** It is
`pnpm spec-controller balance` — the product's own binary, run over this tree with this tree's
scan surfaces (3F-3293). A `--vitest` or `--cucumber` path it is handed and cannot find is a
**setup fault, not a verdict**: it exits 2 naming the flag and the path, because reconciling
against a report that does not exist would report every obligation as unobserved, which means
*the suite did not run*, never *the code is wrong*. Running the ladder in order emits both. If you
are running the gate on its own, emit them first:

```
pnpm test --reporter=default --reporter=json --outputFile.json="$SPEC_CONTROLLER_EVIDENCE_DIR/vitest.json"
pnpm cucumber --format json:"$SPEC_CONTROLLER_EVIDENCE_DIR/cucumber.json"
```

**Nobody maintains that list, including this document.** The gates are *derived* from
`.github/workflows/ci.yml` on every run: each `run:` step invoking a `package.json` script
becomes a local gate (3F-2444). A step added to CI is gated locally with no edit here and
none to the script.

That is the second attempt at this. This document once listed five gates and said CI ran
the same steps — CI ran thirteen, so an implementer who followed it correctly still skipped
`lint:complexity`, and a red build was reported green (3F-2402). 3F-2420 replaced the prose
list with a list inside the script, which then drifted the same way: `lint:anemic-domain`
arrived with a CI step and no gate line, leaving `pnpm verify` a proper subset of CI for four
commits. A hand-maintained list drifts wherever it is kept; a derivation has nothing to keep.

**Every converted check is a CI step, carrying its `@SCN` as the step's `id:`.** A converted check
is both a row of `specController.fitnessChecks` and a `run:` step whose `id:` cites that row — the
command in the pipeline, the obligation in the scenario, the observation in the run's own record of
what its steps did.

**A check that only held our vocabulary is deleted rather than converted.** With one `@fitness` tag,
a characteristic is a label on a row rather than a token the parser reads, so a check policing which
characteristic words a manifest may name has nothing left to police.

**What `pnpm verify` leaves out, it prints** — the step and the reason, every run, rather
than in prose somebody has to keep true. **Today it leaves out nothing**, and the closing line
says so by not mentioning an omission at all (3F-3165). The exclusion list is a target's to
write, in `specController.ciOnlyExclusions`; this repository's is empty. It held one entry —
`lint:scn-subissues`, whose inputs come from the pull request, so locally it answered on less
than it needed and redded correct work — until that check learnt to say *I examined nothing*
instead, with an ending of its own. **The printed reason is the source; this paragraph is
orientation.** An exclusion excusing a step CI no longer runs still reds the ladder, and an
excluded step CI runs behind a gate still reds it: such a step has one chance to run where
every gate has two, so a red ahead of it takes it off the board without reporting it unrun.

`bash scripts/verify.sh --list` prints the gates without running them.

**Three rows are MEASURED — their evidence is a number rather than an exit code.** Each has a
configured row in `specController.fitnessChecks` naming the characteristic, the command that
prints the number, and the bar the ledger holds it to. That command is a CI step of its own; it
writes what it read into the run's measurement record, and the self-reconciliation does the
comparing. The
row is answered when its command *wrote* a number — whether that number is inside its bar is the
ledger's sentence, in one place.

**Two of the three read what this run itself produced, which is why their steps run LAST.**
`pnpm test` and `pnpm cucumber` are both wrapped in `timeStepCli`: each times its suite and writes
a TIMINGS RECORD, and `@SCN-FIT-012` (the unit suite, at most 75s) and `@SCN-FIT-013` (the
behavioural suite, at most 150s) read their own row back out of it. Producer then reader, in that
order — put those steps ahead of the suites and both rows read `missing` while you do exactly what
you were told.

**The third reads a number no local run takes.** `@SCN-FIT-002` — this repository's own domain-core
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
— every one of them is a gate of `pnpm ladder` or a command you can type — and their teeth are their
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
the tree: `pnpm verify` and `ci.yml` both resolve the evidence root to a temp
directory (`SPEC_CONTROLLER_EVIDENCE_DIR`, defaulted to `$RUNNER_TEMP` / `$TMPDIR`),
so a report appearing under version control is now a deliberate act rather than an
accident a guard has to catch. Kept reports belong in an external store.

## Publishing

Publishing is gated on a green CI run existing on `origin` — never publish from a
local-only green. Making the repo public and `npm publish` are deliberate operator
actions taken after CI is proven green on origin.
