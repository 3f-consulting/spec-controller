@CVT
Feature: a converted target's fitness corpus, carrying one of the two scenarios its rows name

  A FIXTURE feature standing in for ANOTHER repository, read cross-repo by spec-controller via
  --features. Its one scenario carries the bare fitness axis tag and its own @SCN, and a row of
  that repository's specController.fitnessChecks names it.

  THE SECOND ROW'S SCENARIO IS NOT HERE, AND THAT IS THE FIXTURE'S WHOLE SUBJECT. The manifest
  names two checks and the corpus carries one, which is an emptied corpus in miniature: the
  Evidence Obligation went with the scenario and the credit went with the pass, so before this rule
  the second check appeared nowhere at all and the run balanced over it.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code registry
  check nor the scenario-to-sub-issue gate sees the CVT code — they scan features/*.feature only.

  Rule: the tree stays inside its thresholds

    @fitness @SCN-CVT-001
    Scenario: the codebase stays under its complexity threshold
