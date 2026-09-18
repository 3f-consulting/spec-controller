#!/usr/bin/env bash
#
# THE FRESHNESS WINDOW, WRITTEN ONCE, AND THE ONLY AGE-VERSUS-WINDOW COMPARISON IN THIS TREE
# (3F-3200). A measurement is placed only while it is still young enough to be about the code it
# will settle. Every row that is placed asks this file, and nothing else anywhere holds a window or
# compares an age to one — three arrangements that happen to agree is the state this replaces.
#
# IT IS SOURCED, NOT RUN, AND DELIBERATELY NOT A `package.json` SCRIPT. This is not a gate — it is a
# rule a placement asks — and the way a thing here becomes a gate is by acquiring a `run:` step of
# ci.yml, which the product's own discovery then reports as a candidate fitness check. Excusing one
# costs an entry in `specController.notChecks`, as `Resolve the evidence root` has. A derived local
# ladder used to be the other reason; it left at 3F-3475 and this one is the whole of it.
#
# AND IT TAKES AN EPOCH SECOND, NEVER AN ISO STRING. Parsing a run's `createdAt` is GNU
# `date -u -d` syntax that a BSD `date` refuses — measured at 3F-3156: with a BSD `date`, a run one
# hour old and a run forty hours old both placed nothing, for the same wrong reason. A caller
# reading a file's mtime instead would need `stat`, which spells its flags differently on either
# platform again. Both are the CALLER's transport problem, so both stay at the caller: the one path
# every placed row goes through needs only POSIX `date -u +%s`, and no portability term sits in it.

# 26 h = a 24 h cadence + 2 h margin, in seconds. The derivation, never the bare number: a consumer
# whose sweep runs twice daily reads the rule and gets 14, rather than copying 93600 and inheriting
# a cadence that is not theirs. `on.schedule` in mutation.yml is the cadence half; the margin is
# what keeps ONE late start from ageing a measurement out, while TWO missed sweeps still do.
MAX_AGE=93600

# Given the moment a measurement was taken and the name of what is being placed, answer whether it
# is still inside the window — refusing on stderr and returning non-zero when it is not.
#
# THE AGE IT COMPUTED IS LEFT IN `FRESHNESS_AGE` FOR THE CALLER'S OWN SENTENCE. A placement that
# succeeds says how old what it placed is, and recomputing the age at the call site would be a
# second subtraction over a clock that has moved since. One subtraction, read twice.
#
# A NEGATIVE AGE IS REFUSED BEFORE THE WINDOW IS CONSULTED, because it is the one arithmetic that
# would otherwise pass every window there is: a measurement dated in the future is a clock nobody
# can reason about, and `-gt` says nothing about it.
inside_the_freshness_window() {
  local measured_at="$1"
  local what="$2"

  FRESHNESS_AGE=$(( $(date -u +%s) - measured_at ))

  if [ "${FRESHNESS_AGE}" -lt 0 ]; then
    echo "place: ${what} is dated ${FRESHNESS_AGE#-}s in the future; nothing is placed." >&2
    return 1
  fi

  if [ "${FRESHNESS_AGE}" -gt "${MAX_AGE}" ]; then
    echo "place: ${what} measured ${FRESHNESS_AGE}s ago, past the ${MAX_AGE}s window; nothing is placed. The row will read missing, which is the true sentence: the measurement has lapsed." >&2
    return 1
  fi

  return 0
}
