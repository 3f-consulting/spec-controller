@CVT
Feature: a converted target's fitness corpus, whose four checks ended four different ways on one run

  A FIXTURE feature standing in for ANOTHER repository, read cross-repo by spec-controller via
  --features. Each of its scenarios carries the bare fitness axis tag and its own @SCN, and that
  repository's CI states each @SCN as the `id:` of the step that runs its check. No word naming
  what a check is about appears anywhere in this file — a scenario's own title says it.

  NO ROW CAN ASK FOR A SKIP, and no field remains with which to try, so the third step's
  skip is broken evidence by the only route there is.

  THE FOUR ROWS ARE OTHERWISE IDENTICAL IN SHAPE — fitness functions, one command
  apiece, one step apiece wired the same way — so anything the four are heard to say differently
  came from what the run's record says about their steps and from nowhere else.

  NONE OF THE FOUR COMMANDS IS ONE OF THAT REPOSITORY'S SCRIPTS, which is realistic rather than
  load-bearing. What leaves the run's record the only thing observing them is the composition: a run handed its own record is
  answered for its CONFIGURED rows by that record, so the derivation reader does not answer them
  a second time. Until the membership rule inverted, the isolation was the prefix set's
  accident — a command that is not a script matched no prefix — and an accident is not a
  guarantee.

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
