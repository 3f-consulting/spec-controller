@CVT
Feature: a converted target's fitness corpus, whose two checks both held on the run recorded beside it

  A FIXTURE feature standing in for ANOTHER repository, read cross-repo by spec-controller via
  --features. Both of its scenarios carry the bare fitness axis tag and their own @SCN, and a row
  of that repository's specController.fitnessChecks names each of them with a characteristic and a
  command. No characteristic tag appears anywhere in this file, and that repository configures no
  check registry at all — so the only route from either scenario to a characteristic is its row.

  NEITHER CHECK IS ONE OF THAT REPOSITORY'S SCRIPTS, which is realistic rather than
  load-bearing. What leaves the run's record the only thing observing them is the composition: a run handed its own record is answered for its CONFIGURED
  rows by that record, so the derivation reader does not credit them a second time (3F-3360).
  Until the membership rule inverted, the isolation was the prefix set's accident — a command
  that is not a script matched no prefix — and an accident is not a guarantee.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code registry
  check nor the scenario-to-sub-issue gate sees the CVT code — they scan features/*.feature only.

  Rule: the tree stays inside its thresholds

    @fitness @SCN-CVT-001
    Scenario: the codebase stays under its complexity threshold

    @fitness @SCN-CVT-002
    Scenario: every scenario in the corpus is traceable to its own sub-issue
