import { describe, it, expect } from "vitest";
import { ciStepRecordObservations, recordedCheckStepsOf } from "./ciStepRecord.js";

const BOUNDS = ["CLM-A-001", "CLM-AB-001", "CLM-FIVEC-001", "CLM-SIXCHR-001"] as const;

describe("[CLM-WFS-016] a CI step whose id is a feature part outside two to five characters is no fitness evidence observation's citation", () => {
  it("reads an evidence observation from the two- and five-character step ids in the run record, and from no other", () => {
    const record = Object.fromEntries(BOUNDS.map((id) => [id, { outcome: "success", conclusion: "success" }]));
    expect(ciStepRecordObservations(record).map((observation) => observation.claimCode)).toEqual(["CLM-AB-001", "CLM-FIVEC-001"]);
  });
});

describe("[CLM-WFS-019] each step in the run's record is read by its outcome, never its conclusion, so a red the job swallowed still reads failed", () => {
  it("reads a step that failed under a successful conclusion as failed, and one that succeeded under a failed conclusion as passed", () => {
    const record = {
      "CLM-FIT-001": { outcome: "failure", conclusion: "success" },
      "CLM-FIT-002": { outcome: "success", conclusion: "failure" },
    };
    expect(ciStepRecordObservations(record)).toStrictEqual([
      {
        qualityCheckKind: "fitness",
        fitnessFunction: "CLM-FIT-001",
        claimCode: "CLM-FIT-001",
        exists: true,
        enforcedOverRealSource: true,
        status: "failed",
      },
      {
        qualityCheckKind: "fitness",
        fitnessFunction: "CLM-FIT-002",
        claimCode: "CLM-FIT-002",
        exists: true,
        enforcedOverRealSource: true,
        status: "passed",
      },
    ]);
  });
  it("translates each recorded outcome into the step's report, and keeps what the record said only when it said something", () => {
    const record = {
      "CLM-FIT-001": { outcome: "success" },
      "CLM-FIT-002": { outcome: "failure" },
      "CLM-FIT-003": { outcome: "skipped" },
      "CLM-FIT-004": { conclusion: "success" },
    };
    expect(recordedCheckStepsOf(record)).toStrictEqual([
      { citedClaimCode: "CLM-FIT-001", report: "succeeded", said: "success" },
      { citedClaimCode: "CLM-FIT-002", report: "failed", said: "failure" },
      { citedClaimCode: "CLM-FIT-003", report: "other", said: "skipped" },
      { citedClaimCode: "CLM-FIT-004", report: "other" },
    ]);
  });
});
