@CVT
Feature: a converted target's fitness corpus, carrying a scenario for one of the two checks its manifest declares

  A FIXTURE feature standing in for ANOTHER repository, read cross-repo by spec-controller via
  --features. Its one scenario carries the bare fitness axis tag and its own @SCN, and a row of
  that repository's specController.fitnessChecks names it.

  THE SECOND ROW HAS NO SCENARIO ANYWHERE IN THIS CORPUS, AND THAT IS WHAT THIS TARGET IS FOR. It
  is a check that repository has declared and never specified: the manifest says which
  characteristic it is owed at, and nothing in the corpus says what it asserts. Before the rule
  this fixture exists for, such a row raised nothing, so the run read balanced over it.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code registry
  check nor the scenario-to-sub-issue gate sees the CVT code — they scan features/*.feature only.

  Rule: the tree stays inside its thresholds

    @fitness @SCN-CVT-001
    Scenario: the codebase stays under its complexity threshold
