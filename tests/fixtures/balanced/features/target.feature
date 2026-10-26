@BAL
Feature: an all-balanced reconciliation fixture target

  A FIXTURE feature (NOT under features/) standing in for a target repo whose
  reconciliation is fully in balance: every scenario's evidence obligation
  is satisfied by a passing observation, no observation cites a phantom claim
  (no phantom claim), no observation cites nothing (no unnamed claim), and the target names
  no fitness functions — so run with a guardless --package-json it reconciles with ZERO
  reconciling items anywhere. The all-balanced target the exit-code gate (@SCN-CLI-004
  / @SCN-CLI-005) exits 0 over.

  This file lives under tests/fixtures/ (NOT features/), so this repository's own checks,
  which scan features/*.feature only, never see @BAL / @SCN-BAL-NNN.

  Rule: the fixture target names two satisfied unit-level scenarios

    @unit @SCN-BAL-001
    Scenario: the target names a first satisfied unit-level scenario
      Given the target repo's source

    @unit @SCN-BAL-002
    Scenario: the target names a second satisfied unit-level scenario
      Given the target repo's source
