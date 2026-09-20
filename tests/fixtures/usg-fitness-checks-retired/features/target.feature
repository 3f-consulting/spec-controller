@CVT
Feature: a target's fitness corpus, beside a manifest still carrying the retired fitnessChecks key

  A FIXTURE feature standing in for ANOTHER repository, read cross-repo by spec-controller via
  --features. Its scenario carries the fitness axis tag and its own @SCN, and that is the whole
  declaration of the check (3F-3582). The repository's package.json ALSO still carries
  specController.fitnessChecks, naming the same @SCN — deliberately, because what this fixture is
  for is that the key is NAMED as retired and changes nothing (@SCN-USG-024).

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code registry
  check nor the scenario-to-sub-issue gate sees the CVT code — they scan features/*.feature only.

  Rule: the tree stays inside its thresholds

    @fitness @SCN-CVT-001
    Scenario: the codebase stays under its complexity threshold
