import { describe, it, expect } from "vitest";
import { reconcile } from "./evidenceReconciliation.js";
import { hasBrokenEvidence, staticObservationTally } from "./ledger.js";
import type { Scenario, EvidenceObservation } from "./journal.js";

describe("[SCN-LNT-026] a BROKEN static-check credit is excluded from the obligation match whatever else it carries", () => {
  it("leaves the obligation missing and posts to suspense even when the credit says the check exists and ran", () => {
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
        staticCheck: "traceability",
        scnId: "SCN-LNT-026",
        exists: true,
        enforcedOverRealSource: true,
        broken: true,
        message: "the run's record says this check's step was skipped",
        locator: "features/fitness-checks.feature",
      },
    ];
    const balance = reconcile(scenarios, evidenceObservations);

    const row = balance.scenarioReconciliations.find(
      (s) => s.scnId === "SCN-LNT-026",
    );
    expect(row?.verdict).toBe("out-of-balance");
    expect(row?.qualityCheckReconciliations).toEqual([
      {
        qualityCheck: "fitness",
        outcome: "missing",
        evidenceObligation: { qualityCheck: "fitness" },
      },
    ]);
    const suspense = balance.scenarioReconciliations.find(
      (s) => s.kind === "suspense-scenario",
    );
    expect(suspense?.qualityCheckReconciliations).toEqual([
      {
        qualityCheck: "fitness",
        outcome: "broken",
        locator: "features/fitness-checks.feature",
        message: "the run's record says this check's step was skipped",
      },
    ]);
    expect(hasBrokenEvidence(balance)).toBe(true);
    expect(staticObservationTally(balance)).toEqual({
      runningStaticCheckCount: 0,
      uncitedStaticCheckCount: 0,
    });
  });
});
