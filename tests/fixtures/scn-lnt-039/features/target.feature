@CVT
Feature: a converted target's fitness corpus, whose row still carries the characteristic it was written with

  A FIXTURE feature standing in for ANOTHER repository, read cross-repo by spec-controller via
  --features. Its scenario carries the fitness axis tag and its own @SCN, and a row of that
  repository's specController.fitnessChecks names it with a characteristic — the word this reader
  retired (3F-3525) — and a command. Nothing reads the word now; the run's record of the check's
  step is what answers the row, and the report names the key (@SCN-LNT-039).

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code registry
  check nor the scenario-to-sub-issue gate sees the CVT code — they scan features/*.feature only.

  Rule: the tree stays inside its thresholds

    @fitness @SCN-CVT-001
    Scenario: the codebase stays under its complexity threshold
