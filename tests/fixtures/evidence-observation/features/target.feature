@TGT
Feature: a evidence observation-reconciliation fixture target

  A FIXTURE feature (NOT under features/) standing in for a target repo whose Vitest /
  Cucumber reports the evidence observation reconciliation reads (@SCN-RPT-010). It declares
  two scenarios so the fixture reports can carry evidence observations attributed to a DECLARED
  scenario, alongside a phantom-id (an @SCN no scenario here declares) and cites-no-scenario evidence observation
  results — the spanning partition the @integration arm asserts balances.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code
  registry lint nor the scenario↔sub-issue gate sees @TGT / @SCN-TGT-NNN — they scan
  features/*.feature only.

  Rule: the fixture target declares scenarios at two levels

    @unit @SCN-TGT-001
    Scenario: the target declares a unit-level scenario
      Given the target repo's source

    @integration @SCN-TGT-002
    Scenario: the target declares an integration-level scenario
      Given the target repo's source
