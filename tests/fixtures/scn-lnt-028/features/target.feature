@CVT
Feature: a target's fitness corpus, whose one check found violations on the run recorded beside it

  A FIXTURE feature standing in for ANOTHER repository, read cross-repo by spec-controller via
  --features. The scenario carries the bare fitness axis tag and its own @SCN, and a row of that
  repository's specController.fitnessChecks names it.

  THE CHECK IS A BARE COMMAND AND NOT ONE OF THAT REPOSITORY'S SCRIPTS, which is what leaves the
  run's record as the only thing observing this row. A script handle behind a guard prefix would be
  DISCOVERED from the workflow file, and the derivation's own credit would be the one the ledger
  matched — so the reading under test would be untested while its arm stayed green.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code registry
  check nor the scenario-to-sub-issue gate sees the CVT code — they scan features/*.feature only.

  Rule: the tree stays inside its thresholds

    @fitness @SCN-CVT-001
    Scenario: the codebase stays under its complexity threshold
