import { describe, it, expect } from "vitest";
import { QualityCheckFaultCode, type QualityCheckFault } from "./qualityCheckFault.js";
import {
  makeQualityCheckReconciliation,
  OUTCOME_SIDE_PROFILE,
} from "./qualityCheckReconciliation.js";
import type { Outcome, SidePresence } from "./qualityCheckReconciliation.js";
import type { EvidenceObligation, EvidenceObservation } from "./journal.js";

interface Refusal {
  refused: boolean;
  code: QualityCheckFaultCode | undefined;
  fault: QualityCheckFault | undefined;
}

function attemptMint(mint: () => unknown): Refusal {
  try {
    mint();
    return { refused: false, code: undefined, fault: undefined };
  } catch (thrown) {
    const refusal = thrown as { code?: QualityCheckFaultCode; fault?: QualityCheckFault };
    return { refused: true, code: refusal.code, fault: refusal.fault };
  }
}

function flipped(presence: SidePresence): SidePresence {
  return presence === "Exists" ? "None" : "Exists";
}

describe("[SCN-MSG-001] a divergent (outcome, side-presence) pair throws a coded fault carrying which side diverged and what canon gives it", () => {
  const sampleObligation: EvidenceObligation = { qualityCheck: "unit" };
  const sampleObservation: EvidenceObservation = {
    qualityCheck: "unit",
    scnId: "SCN-MSG-001",
    status: "passed",
  };

  for (const [outcomeKey, profile] of Object.entries(OUTCOME_SIDE_PROFILE)) {
    const outcome = outcomeKey as Outcome;
    const obligationExists = profile.obligation === "Exists";
    const observationExists = profile.observation === "Exists";

    it(`${outcome}: a divergent obligation side is refused with the obligation-side code, carrying the outcome and both presences`, () => {
      const refusal = attemptMint(() =>
        makeQualityCheckReconciliation({
          outcome,
          ...(obligationExists ? {} : { evidenceObligation: sampleObligation }),
          ...(observationExists ? { evidenceObservation: sampleObservation } : {}),
        }),
      );

      expect(refusal.refused).toBe(true);
      expect(refusal.code).toBe(QualityCheckFaultCode.ObligationSideDivergesFromCanon);
      expect(refusal.fault?.code).toBe(QualityCheckFaultCode.ObligationSideDivergesFromCanon);
      expect(refusal.fault?.outcome).toBe(outcome);
      expect(refusal.fault?.canonical).toBe(profile.obligation);
      expect(refusal.fault?.actual).toBe(flipped(profile.obligation));
    });

    it(`${outcome}: a divergent observation side is refused with the observation-side code, carrying the outcome and both presences`, () => {
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
      expect(refusal.fault?.canonical).toBe(profile.observation);
      expect(refusal.fault?.actual).toBe(flipped(profile.observation));
    });
  }
});
