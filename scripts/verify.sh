#!/usr/bin/env bash
#
# THE SINGLE LOCAL GREEN-CHECK — `pnpm verify` (3F-2420).
#
# CONTRIBUTING.md used to list five gates and then say "CI runs the same steps".
# `.github/workflows/ci.yml` ran thirteen. An implementer following that doc CORRECTLY
# still never ran `lint:complexity` — which is how 3F-2402 stamped Implementation on a
# red build. The fault is the subset, not the person: a green-check assembled by hand
# from prose is a green-check that silently narrows. So it is assembled once, here, and
# the doc names this one command instead of a list that can drift again.
#
# THE ORDER IS ci.yml's ORDER, NOT A CONVENIENT ONE. A local pass has to mean what CI
# means, and the tail of the ladder is genuinely order-dependent: `lint:self-balance`
# reconciles this repository against the two JSON reports `test` and `cucumber` emit, so
# both must run AHEAD of it and must write to exactly the paths ci.yml writes
# (runs/self-balance/vitest.json, runs/self-balance/cucumber.json). Run out of order, the
# gate reports every obligation unobserved — "the suite did not run", not "the code is
# wrong". `runs/` is gitignored with no re-includes and `lint:no-committed-reports`
# enforces that, so both reports stay local and are never committed.
#
# WHAT IS LEFT OUT, AND WHY — SAID OUT LOUD. `lint:scn-subissues` is ci.yml's thirteenth
# step and is deliberately NOT run here. It judges the pull request's diff through
# GITHUB_BASE_SHA / GITHUB_HEAD_REF and has no answer outside a PR context, so it is
# CI-only by construction. Naming the omission is the point: an unexplained gap in a
# green-check is the exact failure mode this file exists to close.
#
# THE SCRIPT NAME CARRIES NO OBSERVED PREFIX, ON PURPOSE. `runningStaticChecks` treats a
# package.json script as a RUNNING static check when its name starts with an observed
# prefix (`lint:` / `guard:`) and a CI `run:` step invokes it. This is an aggregator over
# the checks, not a check of its own; calling it `lint:verify` would register a phantom
# static check on spec-controller's own ledger and red `lint:self-balance` as an uncited
# one. `verify` is outside the observed set, so the ledger is unchanged.
#
# FAIL-FAST, AND NAME THE GATE. The first red stops the ladder and the last line says
# which gate died. A green-check whose failure output does not say what failed is a
# green-check people stop running.

set -euo pipefail

# Run one gate, announcing it before and naming it if it reds.
gate() {
  local name="$1"
  shift
  printf '\n===== verify: %s =====\n' "$name"
  if "$@"; then
    return 0
  fi
  printf '\nverify: FAILED at gate: %s\n' "$name" >&2
  printf 'verify: the ladder stopped here; the gates after it did not run.\n' >&2
  exit 1
}

gate lint:feature-codes         pnpm lint:feature-codes
gate lint:no-committed-reports  pnpm lint:no-committed-reports
gate lint:scn-tags              pnpm lint:scn-tags
gate lint:complexity            pnpm lint:complexity
gate lint:complexity-exceptions pnpm lint:complexity-exceptions
gate lint:blocked-vocabulary    pnpm lint:blocked-vocabulary
gate typecheck                  pnpm typecheck
gate lint:adopted-vocabulary    pnpm lint:adopted-vocabulary
gate lint:exempt-data-floor     pnpm lint:exempt-data-floor
gate test                       pnpm test --reporter=default --reporter=json --outputFile.json=runs/self-balance/vitest.json
gate cucumber                   pnpm cucumber --format json:runs/self-balance/cucumber.json
gate lint:self-balance          pnpm lint:self-balance

printf '\nverify: all 12 local gates green (lint:scn-subissues is CI-only — see the header).\n'
