@PDT
Feature: a summary-tally fixture target

  A FIXTURE feature (NOT under features/) standing in for specs whose Evidence Reconciliation
  Summary must tally Pending Items SEPARATELY from the scenario balanced and out-of-balance
  counts. It is fed to the pure parse→reconcile→assemble→render pipeline by the @SCN-PND-011
  `@integration` step so the "the Evidence Reconciliation Summary tallies Pending Items separately
  from balanced and out-of-balance" behaviour is exercised through the real assemble→render
  surface WITHOUT planting a real `@<qc>pending` scenario in the scanned features/ corpus
  (fixture policy, evidence-manifesto §11B).

  It carries the shapes the tally must span, with TEETH that pin the count as Pending ITEMS,
  not scenarios-carrying-pending, and as neither the balanced nor the out-of-balance count:
    - @SCN-PDT-001 — TWO deferred obligations (`@unitpending @integrationpending`) and nothing
      else: balanced-with-pending, contributing TWO Pending Items on ONE scenario (so an
      items-count differs from a scenarios-carrying-pending count).
    - @SCN-PDT-002 — a genuinely-missing bare `@unit` error ALONGSIDE a deferred
      `@integrationpending`: out-of-balance (the unit reconciles missing, a reconciling item),
      contributing ONE more Pending Item.
    - @SCN-PDT-003 — a bare `@unit` with no observation: out-of-balance (unit missing), NO
      Pending Item — so the tally must not over-count non-pending scenarios.
  Reconciled against NO observations: scenarios 3 (balanced 1, out-of-balance 2); Pending Items
  3 (2 + 1 + 0) across 2 scenarios. The tally (3) equals none of balanced (1), out-of-balance
  (2), or scenarios-carrying-pending (2).

  This file lives under tests/fixtures/ (NOT features/), so neither the feature-code registry
  lint nor the scenario↔sub-issue gate sees @PDT / @SCN-PDT-NNN — they scan features/*.feature
  only. cucumber.js runs features/** only, so it is never executed as a scenario; it is read as
  a string via readFileSync. Its own @SCN ids are per-file (they never collide with the sibling
  target.feature @SCN-PDG-NNN / suffix-significance @SCN-PDS-NNN / unknown-pending @SCN-PDU-NNN /
  pending-with-observation @SCN-PDM-NNN / pending-with-error @SCN-PDE-NNN / only-pending-balanced
  `@SCN-PDB-NNN` / run-neutral-pending @SCN-PDR-NNN / composition @SCN-PDC-NNN / render-pending
  @SCN-PDL-NNN).

  Rule: the Summary tallies Pending Items apart from balanced and out-of-balance

    @unitpending @integrationpending @SCN-PDT-001
    Scenario: a balanced-with-pending scenario carrying two deferred obligations
      Given a fixture step

    @unit @integrationpending @SCN-PDT-002
    Scenario: an out-of-balance scenario mixing a missing unit error with a deferred integration obligation
      Given a fixture step

    @unit @SCN-PDT-003
    Scenario: an out-of-balance scenario with a missing unit obligation and no Pending Item
      Given a fixture step
