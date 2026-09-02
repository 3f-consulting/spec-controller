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
than in prose somebody has to keep true. Today that is `lint:scn-subissues`, which
reconciles the pull request's diff against its ticket: it reads `GITHUB_BASE_SHA` /
`GITHUB_HEAD_REF` and has no answer outside a PR context, so it runs on your PR rather than
on your machine. An exclusion excusing a step CI no longer runs reds the ladder.

`bash scripts/verify.sh --list` prints the gates without running them.

**One gate reads a number no local run takes.** `lint:self-balance` reconciles
`@SCN-MUT-011` — this repository's own domain-core mutation score — against the bar in
`specController.thresholds`. A mutation sweep costs 8-12 minutes on CI, so it runs nightly
(`.github/workflows/mutation.yml`) and CI restores that score into the run while it is still
young enough to be about the code being judged; a score older than 36 hours is not restored
at all, the row reads `missing`, and the gate reds — which is how a nightly that stops
running says so. On your machine there is nothing to restore, so run the sweep once:

```
pnpm mutation
```

That is ~45 seconds locally and posts the score beside the run's other measurements, after
which `pnpm verify` is green. Skipping it leaves `lint:self-balance` reporting
`@SCN-MUT-011` as `missing`, which is the true sentence rather than a false red: no
measurement arrived.

## Reports live outside the repo

Reconciliation reports are never committed. `pnpm hygiene:no-committed-reports` fails
the build if any report artefact is tracked under `runs/`. Reports belong in an
external store, not in version control.

## Publishing

Publishing is gated on a green CI run existing on `origin` — never publish from a
local-only green. Making the repo public and `npm publish` are deliberate operator
actions taken after CI is proven green on origin.
