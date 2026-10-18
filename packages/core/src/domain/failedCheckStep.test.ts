import { describe, it, expect } from "vitest";
import { evidenceReconciliationOf } from "./evidenceReconciliation.js";
import { fitnessObservationsOf, type RecordedCheckStep } from "./fitnessReconciliation.js";
import type { Scenario } from "./journal.js";
import { hasBrokenEvidence } from "./ledger.js";

const scenarios: Scenario[] = [
  { scnId: "SCN-CVT-001", evidenceObligations: [{ qualityCheck: "fitness" }] },
];

const recorded: RecordedCheckStep[] = [{ citedScn: "SCN-CVT-001", report: "failed" }];

function reconcile() {
  return evidenceReconciliationOf(scenarios, fitnessObservationsOf([], recorded), [], false, true);
}

describe("[SCN-LNT-028] a check step the run's record says failed posts a failing observation", () => {
  it("reds the row it names, carrying what the check found, and leaves the run sound", () => {
    const reconciliation = reconcile();

    expect(
      reconciliation.ledger.scenarioReconciliations.map((row) => [
        row.scnId,
        row.kind,
        row.verdict,
        row.qualityCheckReconciliations.map((item) => [item.fitnessFunction, item.outcome]),
      ])
    ).toEqual([["SCN-CVT-001", "scenario", "out-of-balance", [[undefined, "failing"]]]]);

    const [item] = reconciliation.ledger.scenarioReconciliations[0]!.qualityCheckReconciliations;
    expect(item?.evidenceObservation).toMatchObject({
      qualityCheck: "fitness",
      scnId: "SCN-CVT-001",
    });

    expect(hasBrokenEvidence(reconciliation.ledger)).toBe(false);
  });
});
