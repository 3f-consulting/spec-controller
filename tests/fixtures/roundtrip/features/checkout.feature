@CHK
Feature: a round-trip fixture target with a coded out-of-balance feature

  A FIXTURE feature (NOT under features/) standing in for a target repo whose banked
  spec-reconciliation.json is regenerated to markdown from the JSON alone (@SCN-RMD-007).
  It declares the @CHK header code (slug "checkout") and two scenarios: a
  unit-level one an attributed Vitest result balances, and an integration-level one with
  NO evidence observation — missing, so it is out-of-balance and surfaces in the
  by-feature cut as "checkout (CHK)". That coded out-of-balance row is what gives the
  round-trip teeth: without the feature titles on the JSON (@SCN-RMD-006) the regenerated
  by-feature cut would name the bare code and DIVERGE from the direct render.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code
  registry lint nor the scenario-sub-issue gate sees @CHK / @SCN-CHK-NNN — they scan
  features/*.feature only.

  Rule: the fixture target declares a balanced unit scenario and an out-of-balance integration scenario

    @unit @SCN-CHK-001
    Scenario: the target declares a unit-level scenario an evidence observation balances
      Given the target repo's source

    @integration @SCN-CHK-002
    Scenario: the target declares an integration-level scenario with no evidence observation
      Given the target repo's source
