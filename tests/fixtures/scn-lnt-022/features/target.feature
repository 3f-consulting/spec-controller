@CVT
Feature: a converted target's fitness corpus, one static check and one measured

  A FIXTURE feature standing in for ANOTHER repository, read cross-repo by spec-controller via
  --features. Both of its scenarios carry the bare fitness axis tag and their own @SCN, and a row
  of that repository's specController.fitnessChecks names each of them. The two rows differ in
  exactly one thing: the second names a bar, which is the whole of what makes it measured.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code registry
  check nor the scenario-to-sub-issue gate sees the CVT code — they scan features/*.feature only.

  Rule: the tree stays inside its thresholds

    @fitness @SCN-CVT-001
    Scenario: the codebase stays under its complexity threshold

    @fitness @SCN-CVT-003
    Scenario: the domain's mutation score stays above its floor
