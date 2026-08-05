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

`pnpm verify` (`scripts/verify.sh`) runs every gate ci.yml runs except the one named
below, in ci.yml's order, stopping at the first red and naming the gate that died. Read
the script's header for why the order is load-bearing; do not reproduce the gate list
here — the script is the list. This document used
to list five of them and claim CI ran the same steps — CI ran thirteen, so an
implementer who followed it correctly still skipped `lint:complexity`, and a red build
was reported green (3F-2402). A hand-copied list drifts every time a gate is added; a
command cannot.

**The one gate `pnpm verify` leaves out is `lint:scn-subissues`**, which reconciles the
pull request's diff against its ticket. It reads `GITHUB_BASE_SHA` / `GITHUB_HEAD_REF`
and has no answer outside a PR context, so it is CI-only by construction and runs on
your PR rather than on your machine. Nothing else is excluded.

## Reports live outside the repo

Reconciliation reports are never committed. `pnpm lint:no-committed-reports` fails
the build if any report artefact is tracked under `runs/`. Reports belong in an
external store, not in version control.

## Publishing

Publishing is gated on a green CI run existing on `origin` — never publish from a
local-only green. Making the repo public and `npm publish` are deliberate operator
actions taken after CI is proven green on origin.
