@CVT
Feature: a converted target's fitness corpus, four measured checks and no static one

  A FIXTURE feature standing in for ANOTHER repository, read cross-repo by spec-controller via
  --features. All four of its scenarios carry the bare fitness axis tag and their own @SCN, and a
  row of that repository's specController.fitnessChecks names each of them. Every row carries a bar,
  which is the whole of what makes all four of them measured.

  EACH ROW'S COMMAND IS WHAT WRITES ITS NUMBER DOWN, which is this fixture's point. Two of them
  write a readable number into the run's record, one writes nothing at all, and one writes a row no
  reader could take as a number — so the four rows differ in nothing but what their commands left
  behind, and everything the assertions see can only be that.

  NO CHECK HERE IS ONE OF THAT REPOSITORY'S SCRIPTS AND NO WORKFLOW STANDS BESIDE IT, which is realistic rather than
  load-bearing. What leaves the run's record the only thing observing them is the composition: a run handed its own record is answered for its CONFIGURED
  rows by that record, so the derivation reader does not credit them a second time (3F-3360).
  Until the membership rule inverted, the isolation was the prefix set's accident — a command
  that is not a script matched no prefix — and an accident is not a guarantee.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code registry check
  nor the scenario-to-sub-issue gate sees the CVT code — they scan features/*.feature only.

  Rule: the tree stays inside its bars

    @fitness @SCN-CVT-020
    Scenario: the unit suite stays under its run-time ceiling

    @fitness @SCN-CVT-021
    Scenario: the domain's mutation score stays above its floor

    @fitness @SCN-CVT-022
    Scenario: the codebase stays under its complexity ceiling

    @fitness @SCN-CVT-023
    Scenario: the documented paths stay accurate
