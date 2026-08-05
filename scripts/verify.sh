#!/usr/bin/env bash
#
# THE SINGLE LOCAL GREEN-CHECK — `pnpm verify` (3F-2420), with its ladder DERIVED (3F-2444).
#
# CONTRIBUTING.md used to list five gates and then say "CI runs the same steps".
# `.github/workflows/ci.yml` ran thirteen. An implementer following that doc CORRECTLY
# still never ran `lint:complexity` — which is how 3F-2402 stamped Implementation on a
# red build. The fault is the subset, not the person: a green-check assembled by hand
# from prose is a green-check that silently narrows.
#
# THE SAME FAILURE THEN RECURRED HERE. 3F-2420 moved the list out of prose and into this
# script, where it still had to be maintained by hand — and it was not. `lint:anemic-domain`
# landed in 1f7977f with a ci.yml step and no matching `gate` line, so `pnpm verify` was a
# proper SUBSET of CI for four commits while this header said otherwise. Moving a
# hand-maintained list somewhere tidier does not stop it being hand-maintained.
#
# SO THE LIST IS GONE. `pnpm ladder` derives the gates from ci.yml — every `run:` step that
# invokes a package.json script, in ci.yml's order, carrying ci.yml's command VERBATIM — and
# this script runs what it is handed. A gate cannot be forgotten here, because nobody adds
# one here. (packages/spec-controller/static-checks/localLadder.ts; @SCN-LAD-001..006.)
#
# THE COMMAND IS CARRIED, NOT RE-TYPED, AND THAT IS LOAD-BEARING. `lint:self-balance`
# reconciles this repository against the two JSON reports `test` and `cucumber` emit, so both
# must run AHEAD of it and must write exactly the paths ci.yml writes
# (runs/self-balance/vitest.json, runs/self-balance/cucumber.json). Run against paths nothing
# wrote, the gate reports every evidence obligation unobserved — "the suite did not run", not
# "the code is wrong". A reconciler comparing gate NAMES would have greened while a flag
# drifted; running ci.yml's own command string cannot. `runs/` is gitignored with no
# re-includes and `lint:no-committed-reports` enforces that, so both reports stay local and
# are never committed.
#
# WHAT IS LEFT OUT IS PRINTED, NOT COMMENTED. `pnpm ladder` names every excluded step and its
# reason on stderr each run. It used to be named here, in prose — which is the arrangement
# that had already stopped being true. An exclusion excusing a step CI no longer runs reds
# the ladder rather than sitting on as licence (@SCN-LAD-005).
#
# THE SCRIPT NAMES CARRY NO OBSERVED PREFIX, ON PURPOSE. `runningStaticChecks` treats a
# package.json script as a RUNNING static check when its name starts with an observed
# prefix (`lint:` / `guard:`) and a CI `run:` step invokes it. Neither `verify` nor `ladder`
# is a check — one aggregates them, the other lists them — so a `lint:` name would register a
# phantom static check on spec-controller's own ledger and red `lint:self-balance` as an
# uncited one. Both stay outside the observed set, and the ledger is unchanged.
#
# FAIL-FAST, AND NAME THE GATE. The first red stops the ladder and the last line says
# which gate died. A green-check whose failure output does not say what failed is a
# green-check people stop running.
#
# `--list` prints the ladder without running it. What a green-check is about to run is a fair
# question to ask it, and it is what @SCN-LAD-006 asserts against — satisfying yourself that
# this script consumes the derivation by READING it is the move that let the old subset live.

set -euo pipefail

list_only=false
if [[ "${1:-}" == "--list" ]]; then
  list_only=true
fi

# Build the ladder first, whole. A stale exclusion, or a step the ladder cannot represent,
# stops everything here with the fault named — before a single gate has run. A partial ladder
# that runs and looks green is the failure this file exists to remove.
if ! ladder=$(pnpm --silent ladder); then
  printf '\nverify: the ladder could not be built; no gate has run.\n' >&2
  exit 1
fi

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

count=0
while IFS=$'\t' read -r name command; do
  [[ -z "$name" ]] && continue
  count=$((count + 1))
  if [[ "$list_only" == true ]]; then
    printf 'gate %s\n' "$name"
  else
    gate "$name" bash -c "$command"
  fi
done <<<"$ladder"

# The count is the length of the ladder that just ran — derived, not maintained, so it cannot
# disagree with it. The old line said "12" while CI ran 14; a number someone has to keep true
# is a number that eventually is not.
if [[ "$list_only" == true ]]; then
  printf '\nverify: would run all %d local gates (the omission and its reason are above).\n' "$count"
else
  printf '\nverify: all %d local gates green (the omission and its reason are above).\n' "$count"
fi
