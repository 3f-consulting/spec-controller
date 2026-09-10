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
# one here. (tests/checks/localLadder.ts; @SCN-LAD-001..006.)
#
# THE COMMAND IS CARRIED, NOT RE-TYPED, AND THAT IS LOAD-BEARING. The self-reconciliation
# reconciles this repository against the JSON reports `test` and `cucumber`
# emit, so both must run AHEAD of it and must write exactly the paths ci.yml writes — which
# they do by carrying ci.yml's own strings, resolved against the evidence root exported above. Run
# against paths nothing wrote, the gate reports every evidence obligation unobserved — "the suite
# did not run", not "the code is wrong". A reconciler comparing gate NAMES would have greened while
# a flag drifted; running ci.yml's own command string cannot. Those reports are this run's OUTPUT
# and land outside the working tree entirely (3F-3099), so there is nothing here to keep off the
# record by other means.
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
# phantom static check on spec-controller's own ledger and red the self-reconciliation as an
# uncited one. Both stay outside the observed set, and the ledger is unchanged.
#
# `spec-controller` IS THE THIRD, AND ITS REASON IS ONE STEP FURTHER (3F-3113, 3F-3293). It is not
# a check either — it is the workspace CLI, which ci.yml invokes with the `balance` command and this
# repository's own scan surfaces — and it is the one whose `lint:` spelling would put the
# RECONCILIATION'S OWN VERDICT on the ledger that verdict is about. It keeps its teeth regardless:
# this ladder is derived from ci.yml, which consults no prefix, so the gate still runs here at the
# same position under the handle of the binary it is.
#
# FAIL-FAST, AND NAME THE GATE. The first red stops the ladder and the last line says
# which gate died. A green-check whose failure output does not say what failed is a
# green-check people stop running.
#
# `--list` prints the ladder without running it. What a green-check is about to run is a fair
# question to ask it, and it is what @SCN-LAD-006 asserts against — satisfying yourself that
# this script consumes the derivation by READING it is the move that let the old subset live.

set -euo pipefail

# WHERE THIS LADDER'S EVIDENCE LANDS, SET ONCE — the local counterpart of `ci.yml`'s job-level
# `env:` key (3F-3099).
#
# THE GATES BELOW ARE CI'S OWN COMMAND STRINGS, CARRIED VERBATIM, so the two suites and the fitness
# pass name their report paths against this variable exactly as CI does. Exporting it here is what
# makes those strings resolve to somewhere a local shell can write; unset, they would resolve
# against the filesystem root and the ladder would red on a path rather than on the code.
#
# AND IT KEEPS THE SHELL AND THE TYPESCRIPT AGREEING BY CONSTRUCTION. The self-reconciliation names
# this variable in ci.yml's own command string, and the three measured producers resolve the same
# base through `measurementArtefact.ts`, whose first rung is this variable — so one value reaches
# everything the ladder runs, whichever side of the boundary it is on. A caller who has already
# chosen one keeps it.
verify_temp="${TMPDIR:-/tmp}"
export SPEC_CONTROLLER_EVIDENCE_DIR="${SPEC_CONTROLLER_EVIDENCE_DIR:-${verify_temp%/}/spec-controller-self-balance}"

list_only=false
if [[ "${1:-}" == "--list" ]]; then
  list_only=true
fi

# Build the ladder first, whole. A stale exclusion, or a step the ladder cannot represent,
# stops everything here with the fault named — before a single gate has run. A partial ladder
# that runs and looks green is the failure this file exists to remove.
# THE EMITTER'S stderr IS CAPTURED AND RE-EMITTED, NOT SWALLOWED. It carries the omissions and
# their reasons, which is the one thing a reader of a green-check has to see; capturing it is only
# so the closing line below can tell whether there WAS one (3F-3165).
ladder_notes=$(mktemp)
trap 'rm -f "$ladder_notes"' EXIT
if ! ladder=$(pnpm --silent ladder 2>"$ladder_notes"); then
  cat "$ladder_notes" >&2
  printf '\nverify: the ladder could not be built; no gate has run.\n' >&2
  exit 1
fi
cat "$ladder_notes" >&2

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
#
# AND THE OMISSION CLAUSE IS CONDITIONAL, because as of 3F-3165 there is usually nothing omitted.
# The emitter prints an omission and its reason to stderr for every exclusion the TARGET names,
# and this repository names none — so a closing line that always pointed at one would be sending
# a reader to look for something that is not there, which is the same class of untrue sentence
# this whole ladder exists to remove.
if [[ -s "$ladder_notes" ]]; then
  omission=' (the omission and its reason are above)'
else
  omission=''
fi
if [[ "$list_only" == true ]]; then
  printf '\nverify: would run all %d local gates%s.\n' "$count" "$omission"
else
  printf '\nverify: all %d local gates green%s.\n' "$count" "$omission"
fi
