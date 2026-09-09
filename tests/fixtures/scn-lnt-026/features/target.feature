@CVT
Feature: a converted target's fitness corpus, whose four checks ended four different ways on one run

  A FIXTURE feature standing in for ANOTHER repository, read cross-repo by spec-controller via
  --features. Each of its scenarios carries the bare fitness axis tag and its own @SCN, and a row
  of that repository's specController.fitnessChecks names each of them with a characteristic and a
  command. No characteristic tag appears anywhere in this file, and that repository configures no
  check registry at all — so the only route from a scenario to a characteristic is its own row.

  NO ROW CAN ASK FOR A SKIP, and no field remains with which to try (3F-3252), so the third step's
  skip is broken evidence by the only route there is.

  THE FOUR ROWS ARE OTHERWISE IDENTICAL IN SHAPE — static, one characteristic apiece, one command
  apiece, one step apiece wired the same way — so anything the four are heard to say differently
  came from what the run's record says about their steps and from nowhere else.

  NONE OF THE FOUR COMMANDS IS ONE OF THAT REPOSITORY'S SCRIPTS, which is what leaves the run's
  record as the only thing observing these rows. A script handle behind a guard prefix would be
  DISCOVERED from the workflow file, and the derivation's own credit would be the one the ledger
  matched — so the reading under test would be untested while its arm stayed green.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code registry
  check nor the scenario-to-sub-issue gate sees the CVT code — they scan features/*.feature only.

  Rule: the tree stays inside its thresholds

    @fitness @SCN-CVT-001
    Scenario: the codebase stays under its complexity threshold

    @fitness @SCN-CVT-002
    Scenario: every scenario in the corpus is traceable to its own sub-issue

    @fitness @SCN-CVT-003
    Scenario: the codebase carries no duplicated block above its threshold

    @fitness @SCN-CVT-004
    Scenario: every documented command is one this repository still ships
