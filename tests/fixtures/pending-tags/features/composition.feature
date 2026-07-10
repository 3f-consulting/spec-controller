@PDC
Feature: a pending-alongside-passing composition fixture target

  A FIXTURE feature (NOT under features/) standing in for a spec whose scenario declares BOTH
  a bare `@unit` obligation AND a deferred `@integrationpending` one, with a matching PASSING
  unit observation citing it. It is fed to the pure parse→reconcile pipeline by the
  @SCN-PND-009 @integration step (which hand-builds the passing unit observation keyed to this
  scenario's @SCN id) so the "`@unit @integrationpending` with a passing unit observation →
  verdict balanced, one Pending Item" COMPOSITION behaviour is exercised through the real
  reconciler WITHOUT planting a real `@<qc>pending` scenario in the scanned features/ corpus
  (fixture policy, evidence-manifesto §11B).

  Where the @PDB sibling (only-pending-balanced.feature) pins the per-SCENARIO verdict-neutrality
  (@SCN-PND-007) and the @PDR sibling (run-neutral-pending.feature) the WHOLE-RUN predicate
  (@SCN-PND-008), this pins the COMPOSITION on a SINGLE scenario: a pending and a non-pending
  obligation coexist on the same scenario WITHOUT interference. The bare `@unit` obligation
  reconciles `satisfied` (a genuine reconciling-side balance — the passing observation discharges
  it), while the `@integrationpending` one partitions off to exactly one one-sided Pending Item.
  The verdict is balanced and no reconciling item is named — the pending partition does not
  swallow the unit obligation, and the unit reconcile does not swallow the pending one.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code registry
  lint nor the scenario↔sub-issue gate sees @PDC / @SCN-PDC-NNN — they scan features/*.feature
  only. cucumber.js runs features/** only, so it is never executed as a scenario; it is read as
  a string via readFileSync. Its own @SCN ids are per-file (they never collide with the sibling
  target.feature @SCN-PDG-NNN / suffix-significance @SCN-PDS-NNN / unknown-pending @SCN-PDU-NNN /
  pending-with-observation @SCN-PDM-NNN / pending-with-error @SCN-PDE-NNN / only-pending-balanced
  @SCN-PDB-NNN / run-neutral-pending @SCN-PDR-NNN).

  Rule: a pending obligation coexists with a passing non-pending one on the same scenario

    @unit @integrationpending @SCN-PDC-001
    Scenario: a scenario carrying a passing unit obligation alongside a deferred integration one
      Given a fixture step
