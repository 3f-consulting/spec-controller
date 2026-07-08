@TGT
Feature: an @e2e-via-cucumber evidence-observation fixture target

  A FIXTURE feature (NOT under features/) standing in for a target repo whose Cucumber
  report proves an @e2e scenario with NO vitest evidence (@SCN-RPT-017). The single declared
  scenario carries an @e2e evidence obligation, so the reconciler expects an e2e observation;
  the fixture's cucumber report supplies exactly that (tag-derived, per @SCN-LDG-011 / 3F-1434).
  The census must PROJECT that parsed e2e observation — counting it under e2e, not the
  caller-declared integration fallback — so the report's evidence-observation views (Test
  volume, attributed, the E2e cell) agree with the reconciler.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code
  registry lint nor the scenario↔sub-issue gate sees @TGT / @SCN-TGT-NNN — they scan
  features/*.feature only.

  Rule: the fixture target declares a single e2e scenario

    @e2e @SCN-TGT-101
    Scenario: the target declares an e2e-level scenario proven via cucumber
      Given the target repo's source
