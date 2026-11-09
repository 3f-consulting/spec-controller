@BFP
Feature: a fixture target whose evidence still cites a scenario whose feature file is gone

  A FIXTURE feature (NOT under features/) for @CLM-RPT-030 — the stranded-citation shape a
  deletion leaves. The target names two unit-level scenarios: one proven, one with
  no evidence at all, so exactly one scenario row is out of balance. Its vitest.json also
  cites @CLM-BFP-099, which no feature file names — standing in for a feature file deleted
  while its tests still cite it — so the run carries one phantom claim's row, which is
  always out of balance and names no feature to be grouped under.

  This file lives under tests/fixtures/ (NOT features/), so this repository's own checks,
  which scan features/*.feature only, never see @BFP / @CLM-BFP-NNN.

  Rule: the fixture target names a proven scenario and an unproven one

    @unit @CLM-BFP-001
    Scenario: the target names a proven unit-level scenario
      Given the target repo's source

    @unit @CLM-BFP-002
    Scenario: the target names a unit-level scenario nothing proves
      Given the target repo's source
