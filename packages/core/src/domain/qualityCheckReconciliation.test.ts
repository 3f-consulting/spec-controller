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
import type { EvidenceObligation } from "./journal.js";

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
