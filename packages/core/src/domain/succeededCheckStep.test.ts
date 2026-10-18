import { describe, it, expect } from "vitest";
import { evidenceReconciliationOf } from "./evidenceReconciliation.js";
import { fitnessObservationsOf, type RecordedCheckStep } from "./fitnessReconciliation.js";
import type { Scenario } from "./journal.js";

const scenarios: Scenario[] = [
  { scnId: "SCN-CVT-001", evidenceObligations: [{ qualityCheck: "fitness" }] },
  { scnId: "SCN-CVT-002", evidenceObligations: [{ qualityCheck: "fitness" }] },
];

const recorded: RecordedCheckStep[] = [
  { citedScn: "SCN-CVT-001", report: "succeeded" },
  { citedScn: "SCN-CVT-002", report: "succeeded" },
];

function reconcile() {
  return evidenceReconciliationOf(scenarios, fitnessObservationsOf([], recorded), [], false, true);
}

describe("[SCN-LNT-021] a fitness function's step the run's record says succeeded answers its own row's obligation", () => {
  it("answers each row's obligation by the step citing its OWN @SCN, and both balance", () => {
    const reconciliation = reconcile();

    expect(
      reconciliation.ledger.scenarioReconciliations.map((row) => [
        row.scnId,
        row.kind,
        row.verdict,
        row.qualityCheckReconciliations.map((item) => [item.fitnessFunction, item.outcome]),
      ])
    ).toEqual([
      ["SCN-CVT-001", "scenario", "balanced", [[undefined, "satisfied"]]],
      ["SCN-CVT-002", "scenario", "balanced", [[undefined, "satisfied"]]],
    ]);
  });

  it("carries both facts as OBSERVED and cites the row's own code, no registry standing behind it", () => {
    const [first, second] = reconcile().ledger.scenarioReconciliations;
    expect(first?.qualityCheckReconciliations[0]?.evidenceObservation).toEqual({
      qualityCheck: "fitness",
      fitnessFunction: "SCN-CVT-001",
      scnId: "SCN-CVT-001",
      exists: true,
      enforcedOverRealSource: true,
      status: "passed",
    });
    expect(second?.qualityCheckReconciliations[0]?.evidenceObservation).toMatchObject({
      fitnessFunction: "SCN-CVT-002",
      scnId: "SCN-CVT-002",
    });
  });
});
