import { describe, it, expect } from "vitest";
import { reconcile } from "./evidenceReconciliation.js";
import { brokenItemsOf, hasBrokenEvidence, fitnessFunctionTally } from "./ledger.js";
import type { Scenario, EvidenceObservation } from "./journal.js";

describe("[SCN-LNT-026] a BROKEN fitness-function evidence observation is excluded from the obligation match whatever else it carries", () => {
  it("leaves the obligation missing and stamps the run unsound even when the evidence observation says the check exists and ran", () => {
    const scenarios: Scenario[] = [
      {
        scnId: "SCN-LNT-026",
        evidenceObligations: [
          { qualityCheck: "fitness" },
        ],
      },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      {
        qualityCheck: "fitness",
        fitnessFunction: "traceability",
        scnId: "SCN-LNT-026",
        exists: true,
        enforcedOverRealSource: true,
        broken: true,
        message: "the run's record says this check's step was skipped",
        locator: "features/fitness-functions.feature",
      },
    ];
    const balance = reconcile(scenarios, evidenceObservations);

    const row = balance.claimReconciliations.find(
      (s) => s.scnId === "SCN-LNT-026",
    );
    expect(row?.verdict).toBe("out-of-balance");
    expect(
      row?.qualityCheckReconciliations.filter((item) => item.evidenceObligation !== undefined),
    ).toEqual([
      {
        qualityCheck: "fitness",
        outcome: "missing",
        evidenceObligation: { qualityCheck: "fitness" },
      },
    ]);
    expect(brokenItemsOf(balance)).toMatchObject([
      {
        locator: "features/fitness-functions.feature",
        message: "the run's record says this check's step was skipped",
      },
    ]);
    expect(hasBrokenEvidence(balance)).toBe(true);
    expect(fitnessFunctionTally(balance)).toEqual({
      runningFitnessFunctionCount: 0,
      uncitedFitnessFunctionCount: 0,
    });
  });
});
