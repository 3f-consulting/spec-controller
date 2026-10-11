@CVT
Feature: a target's fitness corpus, whose one check found violations the job it ran in never heard about

  A FIXTURE feature standing in for ANOTHER repository, read cross-repo by spec-controller via
  --features. The scenario carries the bare fitness axis tag and its own @SCN, and that
  repository's CI states the @SCN as the `id:` of the step that runs its check.

  ITS PIPELINE SWALLOWED THE RED, WHICH IS THE WHOLE POINT OF THIS TARGET. The check ran and found
  violations; its step carries continue-on-error, so the job was handed a success and went green.
  The record beside it says both things, and only one of them is this axis's business.

  THE CHECK IS A BARE COMMAND AND NOT ONE OF THAT REPOSITORY'S SCRIPTS, which is realistic rather than
  load-bearing. What leaves the run's record the only thing observing them is the composition: a run handed its own record is answered for its CONFIGURED
  rows by that record, so the derivation reader does not answer them a second time.
  Until the membership rule inverted, the isolation was the prefix set's accident — a command
  that is not a script matched no prefix — and an accident is not a guarantee.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code registry
  check nor the scenario-to-sub-issue gate sees the CVT code — they scan features/*.feature only.

  Rule: the tree stays inside its thresholds

    @fitness @SCN-CVT-001
    Scenario: the codebase stays under its complexity threshold
