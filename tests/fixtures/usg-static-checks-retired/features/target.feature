@TSR
Feature: a fixture target whose manifest still nominates a static check through the retired tiebreak

  Planted for @SCN-USG-022. This tree's package.json still configures
  `specController.staticChecks`, naming `check:types` as the static check among the two scripts
  (`check:format` declared first, `check:types` second) a single CI step invokes together — the
  old, retired way of settling which of several scripts a step's check is (3F-3396 deleted the
  tiebreak) — deliberately, so the arm proves the report both NAMES the retired key and reports
  the step under the first script it invokes rather than the one the list nominated.

  NEITHER SCRIPT IS CITED, deliberately — the check the step is reported under lands on the
  suspense row either way, and nothing about this fixture's corpus is about that citation; it is
  here only to give discovery a pipeline to read.

  Rule: a rule holding the target to nothing this axis can cite

    @unit @SCN-TSR-001
    Scenario: the target source is exercised
      Given the target source
