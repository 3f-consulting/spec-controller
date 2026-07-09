@PDS
Feature: a suffix-significance fixture target

  A FIXTURE feature (NOT under features/) standing in for a spec that carries a bare
  `@integration` scenario alongside an `@integrationpending` one. It is fed to the pure
  `parseScenarios` by the @SCN-PND-002 @integration step so the `pending` suffix's
  significance is exercised through the real parser WITHOUT planting a real
  `@integration`/`@integrationpending` pair in the scanned features/ corpus (fixture
  policy, evidence-manifesto §11B).

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code
  registry lint nor the scenario↔sub-issue gate sees @PDS / @SCN-PDS-NNN — they scan
  features/*.feature only. cucumber.js runs features/** only, so it is never executed as a
  scenario; it is read as a string via readFileSync. Its own @SCN ids are per-file (they
  never collide with the sibling target.feature's @SCN-PDG-NNN).

  Rule: a bare tier tag and its pending counterpart are recognised separately

    @integration @SCN-PDS-001
    Scenario: a bare integration obligation
      Given a fixture step

    @integrationpending @SCN-PDS-002
    Scenario: a deferred (pending) integration obligation
      Given a fixture step
