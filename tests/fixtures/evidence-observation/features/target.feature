@TGT
Feature: a evidence observation-reconciliation fixture target

  A FIXTURE feature (NOT under features/) standing in for a target repo whose Vitest /
  Cucumber reports the evidence observation reconciliation reads (@SCN-RPT-010). It names
  two scenarios so the fixture reports can carry evidence observations attributed to a NAMED
  scenario, alongside a phantom claim's id (an @SCN no scenario here names) and cites-no-scenario evidence observation
  results — the spanning partition the @integration arm asserts balances.

  This file lives under tests/fixtures/ (NOT features/), so this repository's own checks,
  which scan features/*.feature only, never see @TGT / @SCN-TGT-NNN.

  Rule: the fixture target names scenarios at two levels

    @unit @SCN-TGT-001
    Scenario: the target names a unit-level scenario
      Given the target repo's source

    @integration @SCN-TGT-002
    Scenario: the target names an integration-level scenario
      Given the target repo's source
