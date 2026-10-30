@TGT
Feature: an @integration @e2e-via-cucumber evidence-observation fixture target

  A FIXTURE feature (NOT under features/) standing in for a target repo whose Cucumber
  report proves a single @integration @e2e scenario with NO vitest evidence (@SCN-RPT-018). The
  single scenario carries BOTH an integration and an e2e evidence obligation (its two
  tier tags), so one observation per tier answers them; the fixture's cucumber report
  supplies exactly one passing scenario, from which parseCucumber emits an integration AND an e2e
  observation (the per-tier emission, @SCN-LDG-014). The census must PROJECT both parsed
  observations — counting the scenario under integration AND e2e — so the report's
  evidence-observation views (Evidence observations, both cells) agree with the reconciler that both
  non-unit tiers are discharged by the one cucumber pass.

  This file lives under tests/fixtures/ (NOT features/), so this repository's own checks,
  which scan features/*.feature only, never see @TGT / @SCN-TGT-NNN.

  Rule: the fixture target names a single integration+e2e scenario

    @integration @e2e @SCN-TGT-102
    Scenario: the target names an integration-and-e2e-level scenario proven via cucumber
      Given the target repo's source
