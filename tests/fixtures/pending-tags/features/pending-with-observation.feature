@PDM
Feature: a pending-tag-with-matching-observation fixture target

  A FIXTURE feature (NOT under features/) standing in for a spec whose `@integrationpending`
  scenario ALSO has a matching integration observation citing it. It is fed to the pure
  parse→reconcile pipeline by the @SCN-PND-005 @integration step (which hand-builds the
  matching observation keyed to this scenario's @SCN id) so the "pending declaration governs
  even when a match exists" behaviour is exercised through the real reconciler WITHOUT
  planting a real `@<qc>pending` scenario in the scanned features/ corpus (fixture policy,
  evidence-manifesto §11B).

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code registry
  lint nor the scenario↔sub-issue gate sees @PDM / @SCN-PDM-NNN — they scan features/*.feature
  only. cucumber.js runs features/** only, so it is never executed as a scenario; it is read
  as a string via readFileSync.

  Rule: a pending obligation whose check ALSO has a matching observation still raises the Pending Item

    @integrationpending @SCN-PDM-001
    Scenario: an integration obligation deferred pending, with a matching observation present
      Given a fixture step
