@PDR
Feature: an only-pending run fixture target

  A FIXTURE feature (NOT under features/) standing in for a WHOLE spec whose only
  non-satisfied elements are deferred `<quality-check>pending` obligations. It is fed to the
  pure parse→reconcile pipeline by the @SCN-PND-008 @integration step so the "an Evidence
  Reconciliation whose only exceptions are Pending Items does not fail" RUN-LEVEL behaviour is
  exercised through the real reconciler + `isBalanced` WITHOUT planting a real `@<qc>pending`
  scenario in the scanned features/ corpus (fixture policy, evidence-manifesto §11B).

  Where the @PDB sibling (only-pending-balanced.feature) pins the per-SCENARIO verdict
  (@SCN-PND-007), this pins the WHOLE-RUN predicate (@SCN-PND-008): `isBalanced` over the
  entire Evidence Reconciliation is true. It carries the shapes a real run mixes — two
  scenarios whose SOLE obligation is deferred (@SCN-PDR-001 integration-pending, @SCN-PDR-002
  unit-pending — each reconciles to zero rows on both sides, balanced-with-pending) and one
  carrying a PASSING unit obligation ALONGSIDE a deferred integration one (@SCN-PDR-003 — the
  unit reconciles satisfied, the pending integration partitions off). No row names a
  reconciling item anywhere, so the whole run does not fail — yet three Pending Items are
  genuinely carried (the balance is not vacuous).

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code registry
  lint nor the scenario↔sub-issue gate sees @PDR / @SCN-PDR-NNN — they scan features/*.feature
  only. cucumber.js runs features/** only, so it is never executed as a scenario; it is read as
  a string via readFileSync. Its own @SCN ids are per-file (they never collide with the sibling
  target.feature @SCN-PDG-NNN / suffix-significance @SCN-PDS-NNN / unknown-pending @SCN-PDU-NNN /
  pending-with-observation @SCN-PDM-NNN / pending-with-error @SCN-PDE-NNN /
  only-pending-balanced @SCN-PDB-NNN).

  Rule: an Evidence Reconciliation whose only exceptions are Pending Items does not fail

    @integrationpending @SCN-PDR-001
    Scenario: a scenario whose sole obligation is deferred pending
      Given a fixture step

    @unitpending @SCN-PDR-002
    Scenario: a second scenario whose sole obligation is deferred pending
      Given a fixture step

    @unit @integrationpending @SCN-PDR-003
    Scenario: a scenario carrying a passing unit obligation alongside a deferred integration one
      Given a fixture step
