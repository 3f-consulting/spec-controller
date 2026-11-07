import { describe, it, expect } from "vitest";
import { evidenceReconciliationOf } from "./evidenceReconciliation.js";
import { fitnessObservationsOf, type RecordedCheckStep } from "./fitnessReconciliation.js";
import type { Scenario } from "./journal.js";
import { lineReadingsOf } from "./qualityCheckReconciliation.test-utils.js";

const scenarios: Scenario[] = [
  { claimCode: "SCN-CVT-001", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
  { claimCode: "SCN-CVT-002", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
];

const recorded: RecordedCheckStep[] = [
  { citedClaimCode: "SCN-CVT-001", report: "succeeded" },
  { citedClaimCode: "SCN-CVT-002", report: "succeeded" },
];

function reconcile() {
  return evidenceReconciliationOf(scenarios, fitnessObservationsOf([], recorded), []);
}

describe("[SCN-LNT-021] a fitness function's step the run's record says succeeded answers its own row's obligation", () => {
  it("answers each row's obligation by the step citing its OWN @SCN, and both balance", () => {
    const reconciliation = reconcile();

    expect(
      reconciliation.ledger.claimReconciliations.map((row) => [
        row.claim,
        row.kind,
        row.verdict,
        lineReadingsOf(row.qualityCheckReconciliations),
      ])
    ).toEqual([
      ["SCN-CVT-001", "scenario", "balanced", [[["SCN-CVT-001"], "satisfied"]]],
      ["SCN-CVT-002", "scenario", "balanced", [[["SCN-CVT-002"], "satisfied"]]],
    ]);
  });

  it("carries both facts as OBSERVED and cites the row's own code, no registry standing behind it", () => {
    const [first, second] = reconcile().ledger.claimReconciliations;
    expect(first?.qualityCheckReconciliations[0]?.evidenceObservations).toEqual([{
      qualityCheckKind: "fitness",
      fitnessFunction: "SCN-CVT-001",
      claimCode: "SCN-CVT-001",
      exists: true,
      enforcedOverRealSource: true,
      status: "passed",
      outcome: "satisfied",
    }]);
    expect(second?.qualityCheckReconciliations[0]?.evidenceObservations).toEqual([{
      qualityCheckKind: "fitness",
      fitnessFunction: "SCN-CVT-002",
      claimCode: "SCN-CVT-002",
      exists: true,
      enforcedOverRealSource: true,
      status: "passed",
      outcome: "satisfied",
    }]);
  });
});
