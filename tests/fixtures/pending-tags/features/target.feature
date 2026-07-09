@PDG
Feature: a pending-tag fixture target

  A FIXTURE feature (NOT under features/) standing in for a spec whose scenarios carry
  the five `<quality-check>pending` tags. It is fed to the pure `parseScenarios` by the
  @SCN-PND-001 @integration step so the tag is exercised through the real parser WITHOUT
  planting a real `@<qc>pending` scenario in the scanned features/ corpus (fixture policy,
  evidence-manifesto §11B).

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code
  registry lint nor the scenario↔sub-issue gate sees @PDG / @SCN-PDG-NNN — they scan
  features/*.feature only. cucumber.js runs features/** only, so it is never executed as a
  scenario; it is read as a string via readFileSync.

  Rule: each recognised quality-check has a pending-tagged scenario

    @lintpending @SCN-PDG-001
    Scenario: a lint obligation deferred pending
      Given a fixture step

    @unitpending @SCN-PDG-002
    Scenario: a unit obligation deferred pending
      Given a fixture step

    @integrationpending @SCN-PDG-003
    Scenario: an integration obligation deferred pending
      Given a fixture step

    @e2epending @SCN-PDG-004
    Scenario: an e2e obligation deferred pending
      Given a fixture step

    @performancepending @SCN-PDG-005
    Scenario: a performance obligation deferred pending
      Given a fixture step
