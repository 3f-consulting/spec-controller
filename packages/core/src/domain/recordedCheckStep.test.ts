import { describe, it, expect } from "vitest";
import { evidenceReconciliationOf } from "./evidenceReconciliation.js";
import { fitnessObservationsOf } from "./fitnessReconciliation.js";
import type { FitnessEvidenceObservation, Scenario } from "./journal.js";

const scenarios: Scenario[] = [
  { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "fitness" }] },
];

const citingStep: FitnessEvidenceObservation = {
  qualityCheck: "fitness",
  fitnessFunction: "lint:alpha",
  exists: true,
  enforcedOverRealSource: true,
  scnId: "SCN-AAA-001",
};

function rowWith(recordedStep: string) {
  const observations = fitnessObservationsOf([citingStep], [{ citedScn: recordedStep, report: "succeeded" }]);
  return evidenceReconciliationOf(scenarios, observations, [], false, true).ledger.claimReconciliations.find(
    (row) => row.scnId === "SCN-AAA-001"
  );
}

describe("[SCN-LNT-020] a cited step the run's own record never recorded leaves its scenario missing", () => {
  it.each([
    ["reads missing where the record happened and carried no step for it", "SCN-ZZZ-999", "missing", "out-of-balance"],
    ["reads satisfied where the record carried its step and says it succeeded", "SCN-AAA-001", "satisfied", "balanced"],
  ])("%s", (_title, recordedStep, outcome, verdict) => {
    const row = rowWith(recordedStep);
    expect(row?.qualityCheckReconciliations.map((item) => item.outcome)).toEqual([outcome]);
    expect(row?.verdict).toBe(verdict);
  });
});
