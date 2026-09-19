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
 *
 * NOTHING HERE READS A REFUSAL'S MESSAGE, AND NOTHING MAY (@SCN-MSG-001, 3F-2872). The invariant
 * reports a divergence as a code and three parameters; the sentence that renders them is the one
 * thing in this tree rewritable without a ticket. An arm that told the two divergences apart by
 * their prose would re-pin the wording this feature exists to unpin, and turn a copy-edit red.
 */

import { describe, it, expect } from "vitest";
import {
  reconcileEvidenceObligation,
  makeQualityCheckReconciliation,
  OUTCOME_SIDE_PROFILE,
} from "./qualityCheckReconciliation.js";
import type { Outcome, SidePresence } from "./qualityCheckReconciliation.js";
import { QualityCheckFaultCode, type QualityCheckFault } from "./qualityCheckFault.js";
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

describe("[SCN-LDG-028] a fitness missing reconciliation carries its obligation and no observation — an absent guard is an absence", () => {
  it("a fitness missing reconciliation carries its obligation and no observation — an absent guard's {exists:false} is not an observation", () => {
    // The fitness (static-check) branch, the ISOLATING absent-guard case: a required @fitness obligation
    // whose guard is read as the negative fact {exists:false, enforcedOverRealSource:false} — an
    // ABSENCE, not an observed piece of evidence. reconcileEvidenceObligation FINDS that record (so
    // it can distinguish absent from watermelon), but an absence is not an observation: it must NOT
    // be carried as the credit side. Canon (double-entry-manifesto.md line 36): missing = Obligation
    // Exists, Observation None. This is the fitness analogue of the runtime pure-debit (@SCN-LDG-026),
    // which already carries none — the two producers must be symmetric.
    const obligation: EvidenceObligation = { qualityCheck: "fitness" };
    const absentGuard: EvidenceObservation = {
      qualityCheck: "fitness",
      staticCheck: "lint:absent-guard",
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

/**
 * What a minting attempt did: whether it was refused, and the structured fault it carried.
 *
 * `refused` is reported apart from `fault` so a minting that WENT THROUGH cannot read as a
 * refusal whose payload happened to be absent — two different failures, and the arms below must
 * not conflate them.
 */
interface Refusal {
  readonly refused: boolean;
  readonly fault: QualityCheckFault | undefined;
}

/** Attempt a minting and report the refusal structurally, never as a sentence. */
function attemptMint(mint: () => unknown): Refusal {
  try {
    mint();
    return { refused: false, fault: undefined };
  } catch (thrown) {
    return { refused: true, fault: (thrown as { fault?: QualityCheckFault }).fault };
  }
}

/**
 * The other side-presence — canon's value, flipped, which is what a diverging side carries.
 *
 * EXHAUSTIVE, AND IT REFUSES A THIRD VALUE (3F-3531). The arms below derive every expectation from
 * `OUTCOME_SIDE_PROFILE` itself, so a row whose value left canon's two words — `"None"` blanked, or
 * the row emptied to `{}` — moves the expectation with it and agrees. A two-way ternary read
 * anything that was not `"Exists"` as `"None"`, and ten such mutants survived the nightly sweep on
 * it. The `never` holds the switch to the type, so a third `SidePresence` cannot slip past either.
 */
function flipped(presence: SidePresence): SidePresence {
  switch (presence) {
    case "Exists":
      return "None";
    case "None":
      return "Exists";
    default: {
      const outsideTheType: never = presence;
      throw new Error(`not a side-presence: ${JSON.stringify(outsideTheType)}`);
    }
  }
}

describe("[SCN-LDG-030] a Quality Check Reconciliation's carried sides are consistent with its outcome (the invariant)", () => {
  // A REAL debit and a REAL credit — the content is immaterial to the (outcome, side-presence)
  // invariant, which turns only on PRESENCE. Reused across every outcome below.
  const sampleObligation: EvidenceObligation = { qualityCheck: "unit" };
  const sampleObservation: EvidenceObservation = {
    qualityCheck: "unit",
    scnId: "SCN-LDG-030",
    status: "passed",
  };

  // Expectations are DERIVED from the type-forced profile map (iterating its entries), never a
  // hand-copied list — a new outcome, forced to STATE its row, is swept automatically.
  for (const [outcomeKey, profile] of Object.entries(OUTCOME_SIDE_PROFILE)) {
    const outcome = outcomeKey as Outcome;
    const obligationExists = profile.obligation === "Exists";
    const observationExists = profile.observation === "Exists";

    it(`${outcome}: canon-correct sides construct and their presence matches the canon row`, () => {
      const reconciliation = makeQualityCheckReconciliation({
        outcome,
        ...(obligationExists ? { evidenceObligation: sampleObligation } : {}),
        ...(observationExists ? { evidenceObservation: sampleObservation } : {}),
      });
      // Side-PRESENCE — not content — matches the canon row for this outcome.
      expect(reconciliation.evidenceObligation !== undefined).toBe(obligationExists);
      expect(reconciliation.evidenceObservation !== undefined).toBe(observationExists);
    });

    it(`${outcome}: a forbidden obligation side is unconstructible — refused with the obligation-side code and the whole divergence`, () => {
      // FLIP the obligation side away from canon: carry it where the row says None, omit it where
      // the row says Exists. Either divergence is a canon-inconsistent pair the brand forbids.
      const refusal = attemptMint(() =>
        makeQualityCheckReconciliation({
          outcome,
          ...(obligationExists ? {} : { evidenceObligation: sampleObligation }),
          ...(observationExists ? { evidenceObservation: sampleObservation } : {}),
        })
      );

      expect(refusal.refused).toBe(true);
      // The WHOLE payload, not field by field: `toStrictEqual` fails a fault carrying the wrong
      // code (the mirror arm's), a wrong parameter, a MISSING parameter, or an extra one — so the
      // refusal's every carried field is pinned by one assertion, and its prose by none.
      expect(refusal.fault).toStrictEqual({
        code: QualityCheckFaultCode.ObligationSideDivergesFromCanon,
        outcome,
        required: profile.obligation,
        actual: flipped(profile.obligation),
      });
    });

    it(`${outcome}: a forbidden observation side is unconstructible — refused with the observation-side code and the whole divergence`, () => {
      // FLIP the observation side away from canon (mirror of the obligation flip above). The
      // obligation side stays canon-correct, so the DEBIT check passes and the CREDIT check is
      // the one that refuses — which is the whole reason the two arms can be told apart at all.
      const refusal = attemptMint(() =>
        makeQualityCheckReconciliation({
          outcome,
          ...(obligationExists ? { evidenceObligation: sampleObligation } : {}),
          ...(observationExists ? {} : { evidenceObservation: sampleObservation }),
        })
      );

      expect(refusal.refused).toBe(true);
      expect(refusal.fault).toStrictEqual({
        code: QualityCheckFaultCode.ObservationSideDivergesFromCanon,
        outcome,
        required: profile.observation,
        actual: flipped(profile.observation),
      });
    });
  }
});

/**
 * [SCN-LDG-035] (3F-3409) — a static-check credit discharges only the obligation on the row whose
 * @SCN it cites, even when a second row raises the SAME bare check.
 *
 * THE MUTATION-RATCHET GAP THIS CLOSES. `fitnessCreditsCiting`
 * (qualityCheckReconciliation.ts) matches an observation on THREE terms — not broken, `scnId ===
 * scnId`, `checkTag === checkTag` — and no existing scenario ever called it twice over one
 * observations array with two DIFFERENT scnId values sharing one checkTag. Neuter the `scnId`
 * clause to `true` and every existing scenario stays green: each one's corpus carries at most one
 * row per checkTag, so the clause was never the thing separating pass from fail. This arm is
 * built so it is.
 *
 * PURE, AT `reconcileEvidenceObligation`'s OWN LEVEL — the same level @SCN-LDG-026/-028 above test
 * at, and the level Stryker's mutation runner (vitest only, per stryker.config.mjs) actually
 * measures kills against. The one credit is reconciled against BOTH rows' obligations in turn,
 * which is what the mutant needs held constant to be caught: same observations array, same
 * checkTag, different scnId.
 */
describe("[SCN-LDG-035] a static-check credit discharges only the obligation on the row whose @SCN it cites", () => {
  it("two rows share one checkTag; the cited row is satisfied and the other stays missing", () => {
    const obligation: EvidenceObligation = { qualityCheck: "fitness" };
    // ONE credit, citing SCN-AAA-001 only.
    const credit: EvidenceObservation = {
      qualityCheck: "fitness",
      staticCheck: "lint:complexity",
      scnId: "SCN-AAA-001",
      exists: true,
      enforcedOverRealSource: true,
    };

    const cited = reconcileEvidenceObligation("SCN-AAA-001", obligation, [credit]);
    const other = reconcileEvidenceObligation("SCN-AAA-002", obligation, [credit]);

    // THE CITED ROW — answered by the credit that names it.
    expect(cited.outcome).toBe("satisfied");
    expect(cited.evidenceObservation).toEqual(credit);

    // THE DISCRIMINATOR. Under the bare `o.scnId === scnId` mutant neutered to `true`, `find`
    // would return the SAME credit for SCN-AAA-002 — only `checkTag` would still discriminate, and
    // both rows share it. The obligation exists and nothing cites SCN-AAA-002, so it reconciles
    // missing and carries no Evidence Observation (canon: Obligation Exists, Observation None).
    expect(other.outcome).toBe("missing");
    expect(
      (other as { evidenceObservation?: unknown }).evidenceObservation
    ).toBeUndefined();
  });
});
