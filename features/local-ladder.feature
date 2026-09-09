@LAD
Feature: The local green-check runs the ladder CI runs, derived rather than listed

  `pnpm verify` is this repository's single local green-check (3F-2420). It was built
  because CONTRIBUTING.md listed five gates while CI ran thirteen, and an implementer
  who followed that document CORRECTLY still shipped a red — "a green-check assembled
  by hand from prose is a green-check that silently narrows".

  THE SAME FAILURE RECURRED ONE LAYER IN. The list moved out of prose and into a
  script, and the script still drifted by hand: lint:anemic-domain landed with a CI
  step and no matching gate line, so pnpm verify has been a proper SUBSET of CI ever
  since. Moving a hand-maintained list somewhere tidier does not stop it being
  hand-maintained.

  SO THE LADDER IS DERIVED, NOT LISTED. Every ci.yml run: step that invokes a
  package.json script is a gate, in ci.yml's order, running ci.yml's command verbatim.
  A gate cannot be forgotten, because nobody adds one. The order is not a convenience:
  balance:self reconciles this repository against the two JSON reports test and
  cucumber emit, so both must run ahead of it and must write the paths ci.yml writes.
  Carrying the command string rather than re-typing it is what holds those paths
  together — a check reconciling gate NAMES would green while a flag drifted.

  WHAT IS LEFT OUT MUST SAY WHY, AND THE REASON MUST STILL HOLD. Naming the omission
  out loud was already the header's rule; it moves from a comment into a value the
  emitter prints. An exclusion whose script CI no longer runs reds as stale — the
  ratchet shape lint:complexity-exceptions and lint:exempt-data-floor already use.

  AND THE ONE THING LEFT OUT RUNS FIRST. An excluded step has one chance where every
  gate has two, and a run: step that reds aborts the job — so any gate ahead of the
  excluded step can take it off the board without ever reporting it unrun. Not absent,
  not disabled: unreached, which is the one shape the ledger cannot see, because when
  the job dies first the ledger is never asked either. It looks identical to green from
  outside. So position stops being a convention this derivation happens to preserve and
  becomes a property it asserts.

  AND A GATE'S RED MUST ABORT THE JOB, OR IT IS NOT A GATE. Everything above rests on a
  premise 3F-3042 measured and then ruled acceptable rather than engineered away: a green CI
  run is the state in which every unconditional step ran, because a run: step that reds
  aborts the job. continue-on-error is the one attribute that severs job green from step
  ran — a step carrying it runs, reds, and leaves the job green — and this derivation read
  every step's run: and discarded every other key, so it could not see one. A ruling whose
  premise nothing holds is an honour convention, and this repository rules by mechanism, so
  the premise is held here (@SCN-LAD-008).

  WHAT A GREEN HERE DOES NOT ESTABLISH. That the ladder is SUFFICIENT — it says the
  local ladder is CI's ladder, and whether CI's ladder is the right one is a separate
  judgement this makes no claim about. And one hand-maintained artefact survives on
  purpose: the exclusion list, which is the TARGET's to write and which THIS repository
  leaves empty (3F-3165). Adding to it narrows the local ladder deliberately,
  with a written reason, in a reviewed diff — a decision, not drift. It never narrows
  CI, so a gate it dodges still reds on the pull request. AND NOTHING FENCES WHETHER A
  WRITTEN REASON IS TRUE. Staleness is fenced (@SCN-LAD-005) and position is fenced
  (@SCN-LAD-007); truth is not, and this repository carried a reason that was false the
  day it was written for the four weeks between 3F-2444 and 3F-3041, every gate green
  throughout. Ruled the same way, and for a stronger cause: the obvious check on a
  reason — make it name an env: key the derived gate drops — would have passed that
  one, which named two real ones. A reviewed diff is the ceiling here.

  Rule: every CI step that invokes a package.json script is a local gate

    @integration @SCN-LAD-001
    Scenario: the ladder is every CI script step, in ci.yml's order
      Given a CI config whose steps invoke three package.json scripts in a fixed order
      When the local ladder is derived from it
      Then the ladder gates exactly those three scripts, in the CI config's order

  Rule: a CI step's red must abort the job

    A gate is a step whose red is the job's verdict. continue-on-error severs the two: the
    step runs, reds, and the job stays green, so the gate is a gate in name only — and it is
    indistinguishable from a passing one by every reading downstream of the run. A job
    carrying the attribute does that to every run: step under it at once, which is why the
    job's own key is read as well as the step's.

    THE VALUE IS READ IN THE SAFE DIRECTION, the direction this parse already takes on a
    document it cannot read at all. Absent, false, or the string false is the only
    arrangement that vouches for a step; anything else does not, an expression included,
    because a value this derivation cannot resolve is a value it must not vouch for.

    @integration @SCN-LAD-008
    Scenario: a CI step whose red the job would swallow reds the ladder, naming it
      Given a CI config whose gate carries continue-on-error
      When the local ladder is built over it
      Then the ladder reds, naming the step whose red would not abort the job
      And a job-level continue-on-error reds the same way, naming every gate under it
      And the same config without the attribute reds nothing

  Rule: a step left out of the local ladder names why, and the reason must still hold

    @integration @SCN-LAD-004
    Scenario: an excluded CI-only step is not a gate, and its reason is printed
      Given a CI config running a step its target excludes from the local ladder
      When the local ladder is built over it
      Then the excluded step is not a gate
      And the ladder names it, with the reason it is left out

    @integration @SCN-LAD-005
    Scenario: an exclusion naming a script CI does not run reds as stale
      Given a CI config that no longer runs the step the exclusion excuses
      When the local ladder is built over it
      Then the ladder reds, naming the stale entry

  Rule: a step left out of the local ladder runs ahead of every gate

    @integration @SCN-LAD-007
    Scenario: an excluded step CI runs behind a gate reds, naming the gates ahead of it
      Given a CI config running the step its target excludes behind two of its gates
      When the local ladder is built over it
      Then the ladder reds, naming the excluded step and the gates that run ahead of it
      And the same step run ahead of every gate reds nothing

  Rule: the derived ladder holds over the real repository

    @integration @SCN-LAD-006
    Scenario: pnpm verify lists every CI script this repository runs, cucumber:fitness among them
      Given the real spec-controller repository
      When the local green-check lists the ladder it would run
      Then it lists every script the real CI runs, in CI's order
      And cucumber:fitness is one of them
      And the count it reports is the number of gates it listed
