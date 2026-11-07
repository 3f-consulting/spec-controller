import { describe, it, expect } from "vitest";
import { evidenceReconciliationOf, type EvidenceReconciliation } from "./evidenceReconciliation.js";
import { fitnessObservationsOf, type RecordedCheckStep } from "./fitnessReconciliation.js";
import { brokenItemsOf, hasBrokenEvidence } from "./ledger.js";
import { readingsOf } from "./qualityCheckReconciliation.test-utils.js";
import { linesOf } from "./claimReconciliation.js";
import { FITNESS_SCENARIOS } from "./checkStep.test-utils.js";

const recorded: RecordedCheckStep[] = [
  { citedClaimCode: "CLM-CVT-001", report: "succeeded", said: "success" },
  { citedClaimCode: "CLM-CVT-002", report: "failed", said: "failure" },
  { citedClaimCode: "CLM-CVT-003", report: "other", said: "skipped" },
  { citedClaimCode: "CLM-CVT-004", report: "other", said: "neutral" },
  { citedClaimCode: "CLM-CVT-005", report: "other" },
];

function reconcile() {
  return evidenceReconciliationOf(FITNESS_SCENARIOS, fitnessObservationsOf([], recorded), []);
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

describe("[CLM-LNT-026] a check step's outcome answers its row's obligation only where it says what the check did", () => {
  it("answers the obligation for the step that succeeded and the step that failed, and for none of the other three, whose rows each read one missing line and one broken line and nothing else", () => {
    expect(scenarioRows(reconcile())).toEqual([
      ["CLM-CVT-001", "balanced", [[["CLM-CVT-001"], "satisfied"]]],
      ["CLM-CVT-002", "out-of-balance", [[["CLM-CVT-002"], "failing"]]],
      ["CLM-CVT-003", "out-of-balance", [[[], "missing"], [["CLM-CVT-003"], "broken"]]],
      ["CLM-CVT-004", "out-of-balance", [[[], "missing"], [["CLM-CVT-004"], "broken"]]],
      ["CLM-CVT-005", "out-of-balance", [[[], "missing"], [["CLM-CVT-005"], "broken"]]],
    ]);
  });

  it("carries the failed step's verdict on its own observation, because nothing else carries it", () => {
    const failed = reconcile().ledger.claimReconciliations.find(
      (row) => row.claim === "CLM-CVT-002"
    );
    expect(failed?.qualityCheckReconciliations[0]?.evidenceObservations).toEqual([{
      qualityCheckKind: "fitness",
      fitnessFunction: "CLM-CVT-002",
      claimCode: "CLM-CVT-002",
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
      ["broken", [{ kind: "check-step-did-not-run", code: "CLM-CVT-003", outcome: "skipped" }]],
      ["broken", [{ kind: "check-step-did-not-run", code: "CLM-CVT-004", outcome: "neutral" }]],
      ["broken", [{ kind: "check-step-did-not-run", code: "CLM-CVT-005" }]],
    ]);
    expect(observations.map((o) => o.notes?.[0])).toStrictEqual([
      { kind: "check-step-did-not-run", code: "CLM-CVT-003", outcome: "skipped" },
      { kind: "check-step-did-not-run", code: "CLM-CVT-004", outcome: "neutral" },
      { kind: "check-step-did-not-run", code: "CLM-CVT-005" },
    ]);
    expect(observations.filter((o) => "message" in o)).toEqual([]);
  });

  it("posts each step it has no reading for as an observation that claims no check exists or ran", () => {
    const observations = fitnessObservationsOf([], recorded).filter(
      (o) => o.claimCode !== "CLM-CVT-001" && o.claimCode !== "CLM-CVT-002"
    );
    expect(
      observations.map((o) => [
        o.claimCode,
        "exists" in o ? o.exists : undefined,
        "enforcedOverRealSource" in o ? o.enforcedOverRealSource : undefined,
        o.broken,
      ])
    ).toEqual([
      ["CLM-CVT-003", false, false, true],
      ["CLM-CVT-004", false, false, true],
      ["CLM-CVT-005", false, false, true],
    ]);
  });

  it("counts TWO running fitness functions over a record holding five check steps", () => {
    const reconciliation = reconcile();
    expect(
      reconciliation.summary.evidenceObservations?.byQualityCheckKind.find((entry) => entry.qualityCheckKind === "fitness")?.count
    ).toBe(2);
    expect(reconciliation.ledger.claimReconciliations.filter((row) => row.kind === "unnamed-claim")).toEqual([]);
  });
});
