import { describe, it, expect } from "vitest";
import { reconcile } from "./evidenceReconciliation.js";
import { linesOf } from "./claimReconciliation.js";
import { neverRanItemsOf, hasNeverRanEvidence, fitnessFunctionTally } from "./ledger.js";
import type { Scenario, EvidenceObservation } from "./journal.js";

describe("[CLM-LNT-026] a fitness-function evidence observation that NEVER RAN is excluded from the obligation match whatever else it carries", () => {
  it("leaves the obligation missing and stamps the run unsound even when the evidence observation says the check exists and ran", () => {
    const scenarios: Scenario[] = [
      {
        claimCode: "CLM-LNT-026",
        evidenceObligations: [
          { qualityCheckKind: "fitness" },
        ],
      },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      {
        qualityCheckKind: "fitness",
        fitnessFunction: "traceability",
        claimCode: "CLM-LNT-026",
        exists: true,
        enforcedOverRealSource: true,
        neverRan: true,
        message: "the run's record says this check's step was skipped",
        locator: "features/fitness-functions.feature",
      },
    ];
    const balance = reconcile(scenarios, evidenceObservations);

    const row = balance.claimReconciliations.find(
      (s) => s.claim === "CLM-LNT-026",
    );
    expect(row?.verdict).toBe("out-of-balance");
    expect(
      row?.qualityCheckReconciliations.flatMap(linesOf),
    ).toEqual([
      {
        qualityCheckKind: "fitness",
        outcome: "missing",
        evidenceObligation: { qualityCheckKind: "fitness" },
      },
      {
        qualityCheckKind: "fitness",
        outcome: "never-ran",
        evidenceObservation: { ...evidenceObservations[0], outcome: "never-ran" },
      },
    ]);
    expect(neverRanItemsOf(balance).flatMap((line) => line.evidenceObservation ?? [])).toMatchObject([
      {
        locator: "features/fitness-functions.feature",
        message: "the run's record says this check's step was skipped",
      },
    ]);
    expect(hasNeverRanEvidence(balance)).toBe(true);
    expect(fitnessFunctionTally(balance)).toEqual({
      runningFitnessFunctionCount: 0,
      uncitedFitnessFunctionCount: 0,
    });
  });
});
