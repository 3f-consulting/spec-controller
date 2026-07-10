@PDB
Feature: an only-exception-is-pending fixture target

  A FIXTURE feature (NOT under features/) standing in for specs whose only non-satisfied
  element is a deferred `<quality-check>pending` obligation. It is fed to the pure
  parse→reconcile pipeline by the @SCN-PND-007 @integration step so the "a scenario whose
  only exception is a Pending Item has verdict balanced" behaviour is exercised through the
  real reconciler WITHOUT planting a real `@<qc>pending` scenario in the scanned features/
  corpus (fixture policy, evidence-manifesto §11B).

  It carries the TWO shapes the behaviour names: a scenario whose SOLE obligation is deferred
  (@SCN-PDB-001 — the case the verdict fix lands: it reconciles to zero rows on both sides yet
  is balanced-with-pending, not both-missing) and a scenario carrying a PASSING unit obligation
  ALONGSIDE a deferred integration one (@SCN-PDB-002 — the unit obligation reconciles satisfied,
  the pending integration one partitions off). Both have verdict balanced: the Pending Item is
  verdict-neutral, contributing no reconciling item.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code registry
  lint nor the scenario↔sub-issue gate sees @PDB / @SCN-PDB-NNN — they scan features/*.feature
  only. cucumber.js runs features/** only, so it is never executed as a scenario; it is read as
  a string via readFileSync. Its own @SCN ids are per-file (they never collide with the sibling
  target.feature @SCN-PDG-NNN / suffix-significance @SCN-PDS-NNN / unknown-pending @SCN-PDU-NNN /
  pending-with-observation @SCN-PDM-NNN / pending-with-error @SCN-PDE-NNN).

  Rule: a scenario whose only non-satisfied element is a Pending Item is balanced

    @integrationpending @SCN-PDB-001
    Scenario: a scenario whose sole obligation is deferred pending
      Given a fixture step

    @unit @integrationpending @SCN-PDB-002
    Scenario: a scenario carrying a passing unit obligation alongside a deferred integration one
      Given a fixture step
