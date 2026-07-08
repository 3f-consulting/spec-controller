@CVL
Feature: config vocabulary lint

  A FIXTURE feature (NOT under features/) standing in for a target repo whose by-feature
  cut the full-name mapping labels (@SCN-RPT-006). It declares the @CVL header
  code, so discoverFeatures maps CVL → its filename slug "config-vocabulary-lint" — the
  by-feature cut renders "config-vocabulary-lint (CVL)". The lone scenario is
  missing (no test report in this fixture run) → out-of-balance → it surfaces
  in the by-feature cut.

  This file lives under tests/fixtures/ (NOT features/), so the feature-code registry lint
  doesn't see @CVL / @SCN-CVL-NNN.

  @unit @SCN-CVL-001
  Scenario: a coded scenario with no backing evidence
    Given the target repo's source
