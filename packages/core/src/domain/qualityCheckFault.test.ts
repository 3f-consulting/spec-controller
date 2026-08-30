/**
 * Unit tests for the fault a refused Quality Check Reconciliation minting carries
 * (src/domain/qualityCheckFault.ts + the two throw sites in
 * src/domain/qualityCheckReconciliation.ts).
 *
 * Bidirectional evidence (discipline): the describe string carries the @SCN-MSG-001 id matching
 * features/message-catalogue.feature, so a grep of the id returns both halves of the pair
 * (Evidence Manifesto §9).
 *
 * NOTHING HERE READS A MESSAGE, AND THAT IS THE SCENARIO. The arm asserts the fault's `code` and
 * its `outcome` / `required` / `actual` parameters and never its prose — not a fragment, not a
 * regex over it. A test that discriminated the two divergences by sentence would be the very
 * wording-pin this feature exists to make unnecessary, and would turn every copy-edit red.
 */

import { describe, it, expect } from "vitest";
import { QualityCheckFaultCode, type QualityCheckFault } from "./qualityCheckFault.js";
import {
  makeQualityCheckReconciliation,
  OUTCOME_SIDE_PROFILE,
} from "./qualityCheckReconciliation.js";
import type { Outcome, SidePresence } from "./qualityCheckReconciliation.js";
import type { EvidenceObligation, EvidenceObservation } from "./journal.js";

/**
 * What a minting attempt did: whether it was refused, the code the refusal itself names, and the
 * structured fault it carries.
 *
 * `code` is read off the REFUSAL and `fault.code` off its payload — the same discriminant by two
 * routes, because the refusal lifts it for a caller that does not want the payload. Both are
 * asserted so neither route can rot unnoticed.
 */
interface Refusal {
  refused: boolean;
  code: QualityCheckFaultCode | undefined;
  fault: QualityCheckFault | undefined;
}

/**
 * Attempt a minting and report the refusal structurally.
 *
 * `refused` is reported separately from `fault` so a minting that WENT THROUGH cannot read as a
 * refusal whose payload happened to be absent — the two failures are different and the arm must
 * not conflate them.
 */
function attemptMint(mint: () => unknown): Refusal {
  try {
    mint();
    return { refused: false, code: undefined, fault: undefined };
  } catch (thrown) {
    const refusal = thrown as { code?: QualityCheckFaultCode; fault?: QualityCheckFault };
    return { refused: true, code: refusal.code, fault: refusal.fault };
  }
}

/** The other side-presence — what a flipped side actually carries once canon's value is known. */
function flipped(presence: SidePresence): SidePresence {
  return presence === "Exists" ? "None" : "Exists";
}

describe("[SCN-MSG-001] a divergent (outcome, side-presence) pair throws a coded fault carrying which side diverged and what was required", () => {
  // A REAL debit and a REAL credit — content is immaterial to an invariant that turns only on
  // PRESENCE. The same pair the @SCN-LDG-030 arm uses, for the same reason.
  const sampleObligation: EvidenceObligation = { qualityCheck: "unit" };
  const sampleObservation: EvidenceObservation = {
    qualityCheck: "unit",
    scnId: "SCN-MSG-001",
    status: "passed",
  };

  // Expectations are DERIVED from the type-forced profile map, never a hand-copied list — a new
  // outcome, forced to STATE its row, is swept automatically.
  for (const [outcomeKey, profile] of Object.entries(OUTCOME_SIDE_PROFILE)) {
    const outcome = outcomeKey as Outcome;
    const obligationExists = profile.obligation === "Exists";
    const observationExists = profile.observation === "Exists";

    it(`${outcome}: a divergent obligation side is refused with the obligation-side code, carrying the outcome and both presences`, () => {
      // FLIP the obligation side away from canon and leave the observation side canon-correct, so
      // the DEBIT check is the one that refuses.
      const refusal = attemptMint(() =>
        makeQualityCheckReconciliation({
          outcome,
          ...(obligationExists ? {} : { evidenceObligation: sampleObligation }),
          ...(observationExists ? { evidenceObservation: sampleObservation } : {}),
        }),
      );

      expect(refusal.refused).toBe(true);
      // WHICH side diverged — read off the code, never off a sentence. Both routes: the code the
      // refusal itself names, and the same discriminant on the payload it carries.
      expect(refusal.code).toBe(QualityCheckFaultCode.ObligationSideDivergesFromCanon);
      expect(refusal.fault?.code).toBe(QualityCheckFaultCode.ObligationSideDivergesFromCanon);
      // The three parameters: the outcome whose row was consulted, what that row required of the
      // obligation side, and what the fields actually carried (canon's value, flipped).
      expect(refusal.fault?.outcome).toBe(outcome);
      expect(refusal.fault?.required).toBe(profile.obligation);
      expect(refusal.fault?.actual).toBe(flipped(profile.obligation));
    });

    it(`${outcome}: a divergent observation side is refused with the observation-side code, carrying the outcome and both presences`, () => {
      // Mirror: the obligation side stays canon-correct so the DEBIT check passes and the CREDIT
      // check is the one that refuses.
      const refusal = attemptMint(() =>
        makeQualityCheckReconciliation({
          outcome,
          ...(obligationExists ? { evidenceObligation: sampleObligation } : {}),
          ...(observationExists ? {} : { evidenceObservation: sampleObservation }),
        }),
      );

      expect(refusal.refused).toBe(true);
      expect(refusal.code).toBe(QualityCheckFaultCode.ObservationSideDivergesFromCanon);
      expect(refusal.fault?.code).toBe(QualityCheckFaultCode.ObservationSideDivergesFromCanon);
      expect(refusal.fault?.outcome).toBe(outcome);
      expect(refusal.fault?.required).toBe(profile.observation);
      expect(refusal.fault?.actual).toBe(flipped(profile.observation));
    });
  }
});
