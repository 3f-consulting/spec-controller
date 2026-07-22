/**
 * Unit tests for the Quality Check Reconciliation concept's OWN behaviour
 * (src/domain/qualityCheckReconciliation.ts) — the pure derivation
 * `reconcileEvidenceObligation`.
 *
 * Bidirectional evidence (discipline): the describe/it strings carry the @SCN-LDG-NNN id
 * matching features/ledger.feature, so a grep of the id returns both halves of the pair
 * (Evidence Manifesto §9). Asserts the concept's pure function in isolation (§11A — the
 * @integration arm in tests/steps/ledger.steps.ts drives the same behaviour through the
 * parse → reconcile → renderJson pipeline).
 */

import { describe, it, expect } from "vitest";
import { reconcileEvidenceObligation } from "./qualityCheckReconciliation.js";
import type { EvidenceObligation, EvidenceObservation } from "./journal.js";

describe("[SCN-LDG-026] a Quality Check Reconciliation carries the evidence obligation it reconciles (the debit side)", () => {
  it("a missing runtime reconciliation carries its evidence obligation and no observation — the pure debit case", () => {
    // The isolating case: a required @unit obligation with NO matching observation reconciles
    // `missing` (the runtime branch, `req` present and no `match`). It is the pure DEBIT — the
    // obligation exists, its matching observation is absent — so the reconciliation carries the
    // obligation it reconciles while the credit side stays absent (@SCN-LDG-027 adds the credit).
    const obligation: EvidenceObligation = { qualityCheck: "unit" };
    const reconciliation = reconcileEvidenceObligation("SCN-LDG-026", obligation, []);

    // Outcome is the pure-debit `missing` (obligation present, observation absent).
    expect(reconciliation.outcome).toBe("missing");
    // The DEBIT side: the reconciliation carries the very obligation it reconciles, on the item
    // itself — not joined from a separate scenario-level array at print time.
    expect(reconciliation.evidenceObligation).toEqual(obligation);
    // The CREDIT side is absent on a `missing` outcome — this SI adds only the debit half.
    expect(
      (reconciliation as { evidenceObservation?: unknown }).evidenceObservation
    ).toBeUndefined();
  });
});

describe("[SCN-LDG-028] a lint missing reconciliation carries its obligation and no observation — an absent guard is an absence", () => {
  it("a lint missing reconciliation carries its obligation and no observation — an absent guard's {exists:false} is not an observation", () => {
    // The lint (static-guard) branch, the ISOLATING absent-guard case: a required @lint obligation
    // whose guard is read as the negative fact {exists:false, enforcedOverRealSource:false} — an
    // ABSENCE, not an observed piece of evidence. reconcileEvidenceObligation FINDS that record (so
    // it can distinguish absent from watermelon), but an absence is not an observation: it must NOT
    // be carried as the credit side. Canon (double-entry-manifesto.md line 36): missing = Obligation
    // Exists, Observation None. This is the lint analogue of the runtime pure-debit (@SCN-LDG-026),
    // which already carries none — the two producers must be symmetric.
    const obligation: EvidenceObligation = { qualityCheck: "lint", staticGuard: "lint:absent-guard" };
    const absentGuard: EvidenceObservation = {
      qualityCheck: "lint",
      staticGuard: "lint:absent-guard",
      exists: false,
      enforcedOverRealSource: false,
    };
    const reconciliation = reconcileEvidenceObligation("SCN-LDG-028", obligation, [absentGuard]);

    // Outcome is the pure-debit `missing` (obligation present, its guard genuinely absent).
    expect(reconciliation.outcome).toBe("missing");
    // The DEBIT side: the reconciliation carries the very obligation it reconciles.
    expect(reconciliation.evidenceObligation).toEqual(obligation);
    // The CREDIT side is absent: an absent guard's {exists:false} is an ABSENCE, not an observation,
    // so nothing is carried — uniform with the runtime `missing` path.
    expect(
      (reconciliation as { evidenceObservation?: unknown }).evidenceObservation
    ).toBeUndefined();
  });
});
