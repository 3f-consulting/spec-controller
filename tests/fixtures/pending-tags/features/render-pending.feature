@PDL
Feature: a render-the-Pending-Item fixture target

  A FIXTURE feature (NOT under features/) standing in for specs whose rendered Scenario
  Reconciliation rows must show a deferred `<quality-check>pending` obligation as a Pending
  Item, labelled DISTINCT from a reconciling item (an error). It is fed to the pure
  parse→reconcile→renderMarkdown pipeline by the @SCN-PND-010 @integration step so the "the
  Pending Item shows on its Quality Check Reconciliation, labelled distinct from a Reconciling
  Item" behaviour is exercised through the real assemble→render surface WITHOUT planting a real
  `@<qc>pending` scenario in the scanned features/ corpus (fixture policy, evidence-manifesto
  §11B).

  It carries the TWO shapes the render behaviour contrasts: a scenario whose SOLE obligation is
  deferred (@SCN-PDL-001 — balanced-with-pending, its row's only exception the Pending Item) and
  a MIXED scenario declaring BOTH a genuinely-missing bare `@unit` obligation (which reconciles
  to a `missing` error — a reconciling item) AND a deferred `@integrationpending` one (which
  partitions to a one-sided Pending Item). The mixed row is where the render must keep the two
  categories visibly apart: the error rendered as a reconciling item, the Pending Item labelled
  distinct.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code registry
  lint nor the scenario↔sub-issue gate sees @PDL / @SCN-PDL-NNN — they scan features/*.feature
  only. cucumber.js runs features/** only, so it is never executed as a scenario; it is read as
  a string via readFileSync. Its own @SCN ids are per-file (they never collide with the sibling
  target.feature @SCN-PDG-NNN / suffix-significance @SCN-PDS-NNN / unknown-pending @SCN-PDU-NNN /
  pending-with-observation @SCN-PDM-NNN / pending-with-error @SCN-PDE-NNN / only-pending-balanced
  @SCN-PDB-NNN / run-neutral-pending @SCN-PDR-NNN / composition @SCN-PDC-NNN).

  Rule: a rendered row shows a Pending Item distinct from a reconciling item

    @integrationpending @SCN-PDL-001
    Scenario: a scenario whose sole obligation is deferred — balanced, its only exception the Pending Item
      Given a fixture step

    @unit @integrationpending @SCN-PDL-002
    Scenario: a scenario mixing a genuinely-missing unit error with a deferred integration obligation
      Given a fixture step
