import { describe, it, expect } from "vitest";
import { evidenceReconciliationOf } from "./evidenceReconciliation.js";
import { fitnessObservationsOf, type RecordedCheckStep } from "./fitnessReconciliation.js";
import type { Scenario } from "./journal.js";
import { hasBrokenEvidence } from "./ledger.js";
import { lineReadingsOf } from "./qualityCheckReconciliation.test-utils.js";

const scenarios: Scenario[] = [
  { scnId: "SCN-CVT-001", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
];

const recorded: RecordedCheckStep[] = [{ citedScn: "SCN-CVT-001", report: "failed" }];

function reconcile() {
  return evidenceReconciliationOf(scenarios, fitnessObservationsOf([], recorded), []);
}

describe("[SCN-LNT-028] a check step the run's record says failed posts a failing observation", () => {
  it("reds the row it names, carrying what the check found, and leaves the run sound", () => {
    const reconciliation = reconcile();

    expect(
      reconciliation.ledger.claimReconciliations.map((row) => [
        row.claim,
        row.kind,
        row.verdict,
        lineReadingsOf(row.qualityCheckReconciliations),
      ])
    ).toEqual([["SCN-CVT-001", "scenario", "out-of-balance", [[["SCN-CVT-001"], "failing"]]]]);

    const [item] = reconciliation.ledger.claimReconciliations[0]!.qualityCheckReconciliations;
    expect(item?.evidenceObservations).toEqual([{
      qualityCheckKind: "fitness",
      fitnessFunction: "SCN-CVT-001",
      scnId: "SCN-CVT-001",
      exists: true,
      enforcedOverRealSource: true,
      status: "failed",
      outcome: "failing",
    }]);

    expect(hasBrokenEvidence(reconciliation.ledger)).toBe(false);
  });
});
