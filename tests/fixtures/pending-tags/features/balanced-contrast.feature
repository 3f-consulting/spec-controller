@PDD
Feature: a balanced-contrast fixture target

  A FIXTURE feature (NOT under features/) standing in for specs whose rendered Scenario
  Reconciliation rows must let a reviewer tell a BALANCED-WITH-PENDING scenario apart from a
  CLEAN-BALANCED one at a glance. It is fed to the pure parse→reconcile→renderMarkdown pipeline
  by the @SCN-PND-012 @integration step so the "a balanced scenario carrying a Pending Item is
  visibly distinguished from a clean-balanced one" behaviour is exercised through the real
  assemble→render surface WITHOUT planting a real `@<qc>pending` scenario in the scanned
  features/ corpus (fixture policy, evidence-manifesto §11B).

  Unlike the @SCN-PND-010 render fixture (which contrasts a Pending Item against a reconciling
  ERROR on a mixed OUT-OF-BALANCE row), this fixture carries TWO scenarios that are BOTH verdict
  `balanced` — the same-verdict contrast is the whole point:
    - @SCN-PDD-001 — a CLEAN-BALANCED scenario: a bare `@unit` obligation discharged by a passing
      unit observation (reconciles `satisfied`), so its exceptions cell is the em-dash placeholder
      `—` (no reconciling item, no Pending Item — nothing outstanding).
    - @SCN-PDD-002 — a BALANCED-WITH-PENDING scenario: a sole deferred `@integrationpending`
      obligation partitions to a one-sided Pending Item, so its verdict is still `balanced` but its
      exceptions cell shows the `⏳ pending: integration` label (owed/deferred work).
  Both rows read `✓ balanced`, yet their exceptions cells differ — the pending row is NOT the
  clean-balanced `—`, and the Pending Item never reads as an error. That at-a-glance distinction
  is the reviewer-legibility this scenario pins.

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code registry
  lint nor the scenario↔sub-issue gate sees @PDD / @SCN-PDD-NNN — they scan features/*.feature
  only. cucumber.js runs features/** only, so it is never executed as a scenario; it is read as
  a string via readFileSync. Its own @SCN ids are per-file (they never collide with the sibling
  target.feature @SCN-PDG-NNN / suffix-significance @SCN-PDS-NNN / unknown-pending @SCN-PDU-NNN /
  pending-with-observation @SCN-PDM-NNN / pending-with-error @SCN-PDE-NNN / only-pending-balanced
  `@SCN-PDB-NNN` / run-neutral-pending @SCN-PDR-NNN / composition @SCN-PDC-NNN / render-pending
  `@SCN-PDL-NNN` / summary-tally @SCN-PDT-NNN).

  Rule: a clean-balanced row and a balanced-with-pending row are visibly distinguished

    @unit @SCN-PDD-001
    Scenario: a clean-balanced scenario — a satisfied unit obligation, nothing outstanding
      Given a fixture step

    @integrationpending @SCN-PDD-002
    Scenario: a balanced-with-pending scenario — a sole deferred integration obligation
      Given a fixture step
