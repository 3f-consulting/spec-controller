import { describe, it, expect } from "vitest";
import { evidenceReconciliationOf, type EvidenceReconciliation } from "./evidenceReconciliation.js";
import { fitnessObservationsOf, type RecordedCheckStep } from "./fitnessReconciliation.js";
import type { Scenario } from "./journal.js";
import { brokenItemsOf, hasBrokenEvidence } from "./ledger.js";
import { readingsOf } from "./qualityCheckReconciliation.test-utils.js";
import { linesOf } from "./claimReconciliation.js";

const scenarios: Scenario[] = [
  { scnId: "SCN-CVT-001", evidenceObligations: [{ qualityCheck: "fitness" }] },
  { scnId: "SCN-CVT-002", evidenceObligations: [{ qualityCheck: "fitness" }] },
  { scnId: "SCN-CVT-003", evidenceObligations: [{ qualityCheck: "fitness" }] },
  { scnId: "SCN-CVT-004", evidenceObligations: [{ qualityCheck: "fitness" }] },
  { scnId: "SCN-CVT-005", evidenceObligations: [{ qualityCheck: "fitness" }] },
];

const recorded: RecordedCheckStep[] = [
  { citedScn: "SCN-CVT-001", report: "succeeded", said: "success" },
  { citedScn: "SCN-CVT-002", report: "failed", said: "failure" },
  { citedScn: "SCN-CVT-003", report: "other", said: "skipped" },
  { citedScn: "SCN-CVT-004", report: "other", said: "neutral" },
  { citedScn: "SCN-CVT-005", report: "other" },
];

function reconcile() {
  return evidenceReconciliationOf(scenarios, fitnessObservationsOf([], recorded), [], false, true);
}

function scenarioRows(reconciliation: EvidenceReconciliation): [string, string, unknown[]][] {
  return reconciliation.ledger.claimReconciliations
    .filter((row) => row.kind === "scenario")
    .map((row) => [
      row.claim,
      row.verdict,
      readingsOf(row.qualityCheckReconciliations.flatMap(linesOf)),
    ]);
}

describe("[SCN-LNT-026] a check step's outcome answers its row's obligation only where it says what the check did", () => {
  it("answers the obligation for the step that succeeded and the step that failed, and for none of the other three, whose rows each read one missing line and one broken line and nothing else", () => {
    expect(scenarioRows(reconcile())).toEqual([
      ["SCN-CVT-001", "balanced", [[["SCN-CVT-001"], "satisfied"]]],
      ["SCN-CVT-002", "out-of-balance", [[["SCN-CVT-002"], "failing"]]],
      ["SCN-CVT-003", "out-of-balance", [[[], "missing"], [["SCN-CVT-003"], "broken"]]],
      ["SCN-CVT-004", "out-of-balance", [[[], "missing"], [["SCN-CVT-004"], "broken"]]],
      ["SCN-CVT-005", "out-of-balance", [[[], "missing"], [["SCN-CVT-005"], "broken"]]],
    ]);
  });

  it("carries the failed step's verdict on its own observation, because nothing else carries it", () => {
    const failed = reconcile().ledger.claimReconciliations.find(
      (row) => row.claim === "SCN-CVT-002"
    );
    expect(failed?.qualityCheckReconciliations[0]?.evidenceObservations).toEqual([{
      qualityCheck: "fitness",
      fitnessFunction: "SCN-CVT-002",
      scnId: "SCN-CVT-002",
      exists: true,
      enforcedOverRealSource: true,
      status: "failed",
      outcome: "failing",
    }]);
  });

  it("stamps the run unsound, carrying for each step it has no reading for a note with the cited code and what the record said", () => {
    const reconciliation = reconcile();
    expect(
      hasBrokenEvidence({ claimReconciliations: reconciliation.ledger.claimReconciliations })
    ).toBe(true);
    const items = brokenItemsOf(reconciliation.ledger);
    const observations = items.flatMap((line) => line.evidenceObservation ?? []);
    expect(items.map((line) => [line.outcome, line.evidenceObservation?.notes])).toEqual([
      ["broken", [{ kind: "check-step-did-not-run", code: "SCN-CVT-003", outcome: "skipped" }]],
      ["broken", [{ kind: "check-step-did-not-run", code: "SCN-CVT-004", outcome: "neutral" }]],
      ["broken", [{ kind: "check-step-did-not-run", code: "SCN-CVT-005" }]],
    ]);
    expect(observations.map((o) => o.notes?.[0])).toStrictEqual([
      { kind: "check-step-did-not-run", code: "SCN-CVT-003", outcome: "skipped" },
      { kind: "check-step-did-not-run", code: "SCN-CVT-004", outcome: "neutral" },
      { kind: "check-step-did-not-run", code: "SCN-CVT-005" },
    ]);
    expect(observations.filter((o) => "message" in o)).toEqual([]);
  });

  it("posts each step it has no reading for as an observation that claims no check exists or ran", () => {
    const observations = fitnessObservationsOf([], recorded).filter(
      (o) => o.scnId !== "SCN-CVT-001" && o.scnId !== "SCN-CVT-002"
    );
    expect(
      observations.map((o) => [
        o.scnId,
        "exists" in o ? o.exists : undefined,
        "enforcedOverRealSource" in o ? o.enforcedOverRealSource : undefined,
        o.broken,
      ])
    ).toEqual([
      ["SCN-CVT-003", false, false, true],
      ["SCN-CVT-004", false, false, true],
      ["SCN-CVT-005", false, false, true],
    ]);
  });

  it("counts TWO running fitness functions over a record holding five check steps", () => {
    const reconciliation = reconcile();
    expect(
      reconciliation.summary.evidenceObservations?.byQualityCheck.find((entry) => entry.qualityCheck === "fitness")?.count
    ).toBe(2);
    expect(reconciliation.ledger.claimReconciliations.filter((row) => row.kind === "unnamed-claim")).toEqual([]);
  });
});
