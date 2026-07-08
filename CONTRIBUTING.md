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
local pass on one machine is not evidence the gate holds in CI. The gates, in order:

```
pnpm install --frozen-lockfile
pnpm lint:feature-codes        # every declared @<FFF> feature code is unique and registered
pnpm lint:no-committed-reports # no reconciliation report artefact is tracked under runs/
pnpm typecheck
pnpm test                      # vitest (@unit)
pnpm cucumber                  # @integration / @e2e / @performance scenarios
```

Run the whole sequence locally before opening a PR; CI runs the same steps.

## Reports live outside the repo

Reconciliation reports are never committed. `pnpm lint:no-committed-reports` fails
the build if any report artefact is tracked under `runs/`. Reports belong in an
external store, not in version control.

## Publishing

Publishing is gated on a green CI run existing on `origin` — never publish from a
local-only green. Making the repo public and `npm publish` are deliberate operator
actions taken after CI is proven green on origin.
