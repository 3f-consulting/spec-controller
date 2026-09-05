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

**What `pnpm verify` leaves out, it prints** — the step and the reason, every run, rather
than in prose somebody has to keep true. Today that is `lint:scn-subissues`, which reconciles
the pull request's diff against its ticket. It is left out not because it cannot run here —
it can, and that is the trap: one of its inputs is CI-supplied, so locally it answers on less
than it needs and reds correct work. **The printed reason is the source; this paragraph
is orientation.** An exclusion excusing a step CI no longer runs reds the ladder. It also runs
*first* in CI, ahead of every gate: a step CI is the only place to run has one chance where
every other gate has two, and a red in anything ahead of it would abort the job and take it
off the board without reporting it unrun — so the ladder reds if it ever stops running first.

`bash scripts/verify.sh --list` prints the gates without running them.

**Two gates read a number no local run takes.** `@SCN-MUT-011` — this repository's own
domain-core mutation score — is a CONVERTED fitness check: its configured row in
`specController.fitnessChecks` names the characteristic, the command that prints the number
(`pnpm --silent mutation:score`) and the `domain` gate its bar is sourced from. So
`cucumber:fitness` runs that command and posts what it printed, and `balance:self`
reconciles the number against the gate's banked kill floor.

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
Skipping it fails `@SCN-MUT-011` in the fitness pass and leaves `balance:self` reporting
it as `missing` — the true sentence rather than a false red: no measurement arrived.

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
