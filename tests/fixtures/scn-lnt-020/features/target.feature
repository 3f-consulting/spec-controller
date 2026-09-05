@HCV
Feature: a half-converted target's fitness corpus

  A FIXTURE feature standing in for ANOTHER repository, read cross-repo by spec-controller via
  --features. Both of its scenarios carry the bare fitness axis tag; only ONE of them is named
  by a row of that repository's specController.fitnessChecks. That is the half-converted corpus
  this fixture exists for — the tag moved and the row was never written — and every input the
  claim rests on lives in this directory.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code registry
  check nor the scenario-to-sub-issue gate sees the HCV code — they scan features/*.feature only.

  Rule: the tree stays inside its thresholds

    @fitness @SCN-HCV-001
    Scenario: the codebase stays under its complexity threshold

    @fitness @SCN-HCV-002
    Scenario: the tree stays above its mutation floor
