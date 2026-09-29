@CVT
Feature: an annotated target's fitness corpus, one of whose two checks states the row it runs

  A FIXTURE feature standing in for ANOTHER repository, read cross-repo by spec-controller via
  --features. Each scenario carries the bare fitness axis tag and its own @SCN.

  THE CORPUS IS WHOLE AND THE ANNOTATION IS NOT, which is this fixture's whole subject. Both
  scenarios are in the corpus and both checks run in that repository's CI; the pipeline states the
  code of one of them. So the difference the ledger reports is the annotation and nothing else.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code registry
  check nor the scenario-to-sub-issue gate sees the CVT code — they scan features/*.feature only.

  Rule: the tree stays inside its thresholds

    @fitness @SCN-CVT-001
    Scenario: the codebase stays under its complexity threshold

    @fitness @SCN-CVT-002
    Scenario: every feature file carries a registered header code
