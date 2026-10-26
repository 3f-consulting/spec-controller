@TGT
Feature: an @e2e-via-cucumber evidence-observation fixture target

  A FIXTURE feature (NOT under features/) standing in for a target repo whose Cucumber
  report proves an @e2e scenario with NO vitest evidence (@SCN-RPT-017). The single named
  scenario carries an @e2e evidence obligation, so only an e2e observation answers it;
  the fixture's cucumber report supplies exactly that (tag-derived, per @SCN-LDG-011).
  The census must PROJECT that parsed e2e observation — counting it under e2e, not the
  caller-named integration fallback — so the report's evidence-observation views (Test
  volume, attributed, the E2e cell) agree with the reconciler.

  This file lives under tests/fixtures/ (NOT features/), so this repository's own checks,
  which scan features/*.feature only, never see @TGT / @SCN-TGT-NNN.

  Rule: the fixture target names a single e2e scenario

    @e2e @SCN-TGT-101
    Scenario: the target names an e2e-level scenario proven via cucumber
      Given the target repo's source
