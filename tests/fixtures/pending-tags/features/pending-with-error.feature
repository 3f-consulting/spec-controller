@PDE
Feature: a pending-alongside-error fixture target

  A FIXTURE feature (NOT under features/) standing in for a spec whose scenario names BOTH
  a genuinely-missing bare `@unit` obligation AND a deferred `@integrationpending` one. It is
  fed to the pure parse→reconcile pipeline by the @SCN-PND-006 @integration step so the "a
  Pending Item is not a Reconciling Item (it is not an error)" behaviour is exercised through
  the real reconciler WITHOUT planting a real `@<qc>pending` scenario in the scanned features/
  corpus (fixture policy, evidence-manifesto §11B). The scenario is DELIBERATELY mixed — the
  unit obligation reconciles to a genuine error (missing → a reconciling item) while the
  integration obligation is deferred; that the deferred one stays OUT of the error list is the
  behaviour under test.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code registry
  lint nor the scenario↔sub-issue gate sees @PDE / @SCN-PDE-NNN — they scan features/*.feature
  only. cucumber.js runs features/** only, so it is never executed as a scenario; it is read
  as a string via readFileSync. Its own @SCN ids are per-file (they never collide with the
  sibling target.feature @SCN-PDG-NNN / suffix-significance @SCN-PDS-NNN / unknown-pending
  `@SCN-PDU-NNN` / pending-with-observation @SCN-PDM-NNN).

  Rule: a scenario mixing a real error and a deferred obligation keeps them in separate categories

    @unit @integrationpending @SCN-PDE-001
    Scenario: a missing unit obligation (the error) alongside a deferred integration one (the Pending Item)
      Given a fixture step
