@BAL
Feature: an all-balanced reconciliation fixture target

  A FIXTURE feature (NOT under features/) standing in for a target repo whose
  reconciliation is fully in balance: every scenario's evidence obligation
  is satisfied by a passing observation, no observation cites an undeclared scenario
  (no phantom), no observation cites nothing (no suspense), and the target declares
  no static checks — so run with a guardless --package-json it reconciles with ZERO
  reconciling items anywhere. The all-balanced target the exit-code gate (@SCN-CLI-004
  / @SCN-CLI-005) exits 0 over.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code
  registry lint nor the scenario↔sub-issue gate sees @BAL / @SCN-BAL-NNN — they scan
  features/*.feature only.

  Rule: the fixture target declares two satisfied unit-level scenarios

    @unit @SCN-BAL-001
    Scenario: the target declares a first satisfied unit-level scenario
      Given the target repo's source

    @unit @SCN-BAL-002
    Scenario: the target declares a second satisfied unit-level scenario
      Given the target repo's source
