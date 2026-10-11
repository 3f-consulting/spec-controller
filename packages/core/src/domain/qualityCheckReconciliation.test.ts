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
    const obligation: EvidenceObligation = { qualityCheck: "unit" };
    const reconciliation = reconcileEvidenceObligation("SCN-LDG-026", obligation, []);

    expect(reconciliation.outcome).toBe("missing");
    expect(reconciliation.evidenceObligation).toEqual(obligation);
    expect(
      (reconciliation as { evidenceObservation?: unknown }).evidenceObservation
    ).toBeUndefined();
  });
});

describe("[SCN-LDG-028] a fitness missing reconciliation carries its obligation and no observation — an absent guard is an absence", () => {
  it("a fitness missing reconciliation carries its obligation and no observation — an absent guard's {exists:false} is not an observation", () => {
    const obligation: EvidenceObligation = { qualityCheck: "fitness" };
    const absentGuard: EvidenceObservation = {
      qualityCheck: "fitness",
      fitnessFunction: "lint:absent-guard",
      exists: false,
      enforcedOverRealSource: false,
    };
    const reconciliation = reconcileEvidenceObligation("SCN-LDG-028", obligation, [absentGuard]);

    expect(reconciliation.outcome).toBe("missing");
    expect(reconciliation.evidenceObligation).toEqual(obligation);
    expect(
      (reconciliation as { evidenceObservation?: unknown }).evidenceObservation
    ).toBeUndefined();
  });
});

interface Refusal {
  readonly refused: boolean;
  readonly fault: QualityCheckFault | undefined;
}

function attemptMint(mint: () => unknown): Refusal {
  try {
    mint();
    return { refused: false, fault: undefined };
  } catch (thrown) {
    return { refused: true, fault: (thrown as { fault?: QualityCheckFault }).fault };
  }
}

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
  const sampleObligation: EvidenceObligation = { qualityCheck: "unit" };
  const sampleObservation: EvidenceObservation = {
    qualityCheck: "unit",
    scnId: "SCN-LDG-030",
    status: "passed",
  };

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
      expect(reconciliation.evidenceObligation !== undefined).toBe(obligationExists);
      expect(reconciliation.evidenceObservation !== undefined).toBe(observationExists);
    });

    it(`${outcome}: a forbidden obligation side is unconstructible — refused with the obligation-side code and the whole divergence`, () => {
      const refusal = attemptMint(() =>
        makeQualityCheckReconciliation({
          outcome,
          ...(obligationExists ? {} : { evidenceObligation: sampleObligation }),
          ...(observationExists ? { evidenceObservation: sampleObservation } : {}),
        })
      );

      expect(refusal.refused).toBe(true);
      expect(refusal.fault).toStrictEqual({
        code: QualityCheckFaultCode.ObligationSideDivergesFromCanon,
        outcome,
        canonical: profile.obligation,
        actual: flipped(profile.obligation),
      });
    });

    it(`${outcome}: a forbidden observation side is unconstructible — refused with the observation-side code and the whole divergence`, () => {
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
        canonical: profile.observation,
        actual: flipped(profile.observation),
      });
    });
  }
});

describe("[SCN-LDG-035] a fitness-function evidence observation discharges only the obligation on the row whose @SCN it cites", () => {
  it("two rows share one checkTag; the cited row is satisfied and the other stays missing", () => {
    const obligation: EvidenceObligation = { qualityCheck: "fitness" };
    const observation: EvidenceObservation = {
      qualityCheck: "fitness",
      fitnessFunction: "lint:complexity",
      scnId: "SCN-AAA-001",
      exists: true,
      enforcedOverRealSource: true,
    };

    const cited = reconcileEvidenceObligation("SCN-AAA-001", obligation, [observation]);
    const other = reconcileEvidenceObligation("SCN-AAA-002", obligation, [observation]);

    expect(cited.outcome).toBe("satisfied");
    expect(cited.evidenceObservation).toEqual(observation);

    expect(other.outcome).toBe("missing");
    expect(
      (other as { evidenceObservation?: unknown }).evidenceObservation
    ).toBeUndefined();
  });
});
