import { describe, it, expect } from "vitest";
import { evidenceReconciliationOf } from "./evidenceReconciliation.js";
import { linesOf } from "./claimReconciliation.js";
import { fitnessObservationsOf } from "./fitnessReconciliation.js";
import type { FitnessEvidenceObservation, Scenario } from "./journal.js";

const scenarios: Scenario[] = [
  { claimCode: "CLM-AAA-001", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
];

const citingStep: FitnessEvidenceObservation = {
  qualityCheckKind: "fitness",
  fitnessFunction: "lint:alpha",
  exists: true,
  enforcedOverRealSource: true,
  claimCode: "CLM-AAA-001",
};

function rowWith(recordedStep: string) {
  const observations = fitnessObservationsOf([citingStep], [{ citedClaimCode: recordedStep, report: "succeeded" }]);
  return evidenceReconciliationOf(scenarios, observations, []).ledger.claimReconciliations.find(
    (row) => row.claim === "CLM-AAA-001"
  );
}

describe("[CLM-LNT-020] a cited step the run's own record never recorded leaves its scenario missing", () => {
  it.each([
    ["reads missing where the record happened and carried no step for it", "CLM-ZZZ-999", "missing", "out-of-balance"],
    ["reads satisfied where the record carried its step and says it succeeded", "CLM-AAA-001", "satisfied", "balanced"],
  ])("%s", (_title, recordedStep, outcome, verdict) => {
    const row = rowWith(recordedStep);
    expect(row?.qualityCheckReconciliations.flatMap(linesOf).map((line) => line.outcome)).toEqual([outcome]);
    expect(row?.verdict).toBe(verdict);
  });
});
