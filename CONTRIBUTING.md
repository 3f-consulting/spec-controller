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

**The ladder is much shorter than it was, and nothing stopped being checked.** Most of the
`lint:` steps left `ci.yml` at 3F-3165 and `typecheck` followed at 3F-3166: they are rows of
`specController.fitnessChecks` now, and the `cucumber:fitness` gate runs them. The last `lint:`
step went at 3F-3167 — `lint:check-characteristics`, and that one is a DELETION rather than a
conversion: it held the words a manifest names to the portfolio roster, and the collapse to one
`@fitness` tag makes a characteristic a label on a row rather than a token the parser reads. So
`ci.yml` now carries no `lint:` step at all, and a check you are looking for is either a gate here
or a row there — `pnpm ladder` plus that manifest key are between them the whole set.

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
prints the number, and the bar the ledger holds it to. `cucumber:fitness` runs the command and
posts what it printed; `balance:self` does the comparing. The scenario passes when its command
*yielded* a number — whether that number is inside its bar is the ledger's sentence, in one place.

**Two of the three read what this run itself produced, which is why the fitness pass runs LAST.**
`pnpm test` and `pnpm cucumber` are both wrapped in `timeStepCli`: each times its suite and writes
a TIMINGS RECORD, and `@SCN-FIT-012` (the unit suite, at most 75s) and `@SCN-FIT-013` (the
behavioural suite, at most 150s) read their own row back out of it. Producer then reader, in that
order — put `cucumber:fitness` ahead of the suites and both rows read `missing` while you do
exactly what you were told. **The fitness pass's own run time is unmeasured, and must be**: the pass
that observes cannot be inside what it observes.

**The third reads a number no local run takes.** `@SCN-FIT-002` — this repository's own domain-core
mutation score — names `pnpm --silent mutation:score` and sources its bar from the `domain` gate's
banked kill floor.

A mutation sweep costs 8-12 minutes on CI, so it runs nightly
(`.github/workflows/mutation.yml`) and leaves what it measured as a SWEEP RECORD; CI borrows
that record into `runs/mutation/measurements.json` while it is still young enough to be about
the code being judged. A score older than 36 hours is not placed at all — the command then has
nothing to print, `cucumber:fitness` reds on the scenario and `balance:self` reds on the
row, which reads `missing`. That is how a nightly that stops running says so.

On your machine there is nothing to borrow, so run the sweep once:

```
pnpm mutation
```

That is ~45 seconds locally and writes the sweep record, after which `pnpm verify` is green.
Skipping it fails `@SCN-FIT-002` in the fitness pass and leaves `balance:self` reporting
it as `missing` — the true sentence rather than a false red: no measurement arrived.

**And `runs/self-balance/measurements.json` — the credit stream — persists between local runs and
is merged into, not rewritten.** CI starts cold; your machine does not. A row you renamed, or a
producer you withheld to plant a fault, will find its own previous output waiting, so a plant can
green on evidence it never produced and a stale credit can reconcile as a phantom row citing an
unknown scenario. **Clear the artefact as part of any plant, and say what state the root was in
when you report the result.**

## The report's `### Static checks` line, and which of its zeros is vacuous

`0 uncited static check(s)` over this tree means **the discoverable set is empty**, not that a
populated one came back clean. Every fitness command left `ci.yml` at 3F-3139, so there is no
`lint:`/`guard:` script for a `run:` step to invoke and `runningStaticChecks` observes nothing.
The number beside it is not vacuous and is not produced by the same mechanism: `11 static check(s)
run` counts the credits the **converted rows** post — eleven of the fourteen, the other three being
measured and so not static checks.

A capability exercised by nothing and reporting green is the fault this product is named for, and
it is ours until [3F-3161](3F-3161) retires script discovery
altogether — sequenced after the consumer still routing credits through it has migrated. Stated
here, in `features/uncited-static-checks.feature`, and in
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
