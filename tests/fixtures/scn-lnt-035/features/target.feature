@CVT
Feature: a converted target's fitness corpus, whose rows still carry the bars they were written with

  A FIXTURE feature standing in for ANOTHER repository, read cross-repo by spec-controller via
  --features. Both of its scenarios carry the bare fitness axis tag and their own @SCN, and a row
  of that repository's specController.fitnessChecks names each of them with a characteristic, a
  command and a bar written while bars were read — atMost on the first, an atLeast naming a
  mutation gate beside an atMost on the second. Nothing reads a bar now; the run's record of each
  check's step is what answers its row (@SCN-LNT-035).

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code registry
  check nor the scenario-to-sub-issue gate sees the CVT code — they scan features/*.feature only.

  Rule: the tree stays inside its bars

    @fitness @SCN-CVT-001
    Scenario: the codebase stays under its complexity bar

    @fitness @SCN-CVT-002
    Scenario: the domain's mutation score stays above its gate
