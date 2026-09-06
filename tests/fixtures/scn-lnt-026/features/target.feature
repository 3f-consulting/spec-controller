@CVT
Feature: a converted target's fitness corpus, whose pass reported both scenarios as skipped

  A FIXTURE feature standing in for ANOTHER repository, read cross-repo by spec-controller via
  --features. Both of its scenarios carry the bare fitness axis tag and their own @SCN, and a row
  of that repository's specController.fitnessChecks names each of them with a characteristic and a
  command.

  THE TWO ROWS DIFFER IN EXACTLY ONE THING. The first names the ending by which its command says it
  examined nothing; the second names none. Everything else about the pair — the axis tag, the
  corpus, the report, the shape of the row — is identical, so any reading that tells them apart can
  only have read that one field.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code registry
  check nor the scenario-to-sub-issue gate sees the CVT code — they scan features/*.feature only.

  Rule: the tree stays inside its thresholds

    @fitness @SCN-CVT-001
    Scenario: the codebase stays under its complexity threshold

    @fitness @SCN-CVT-002
    Scenario: every scenario in the corpus is traceable to its own sub-issue
