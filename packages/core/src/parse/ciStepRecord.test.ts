import { describe, it, expect } from "vitest";
import { ciStepRecordObservations, recordedCheckStepsOf } from "./ciStepRecord.js";

const BOUNDS = ["SCN-A-001", "SCN-AB-001", "SCN-FIVEC-001", "SCN-SIXCHR-001"] as const;

describe("[SCN-WFS-016] a CI step whose id is a feature part outside two to five characters is no fitness evidence observation's citation", () => {
  it("reads an evidence observation from the two- and five-character step ids in the run record, and from no other", () => {
    const record = Object.fromEntries(BOUNDS.map((id) => [id, { outcome: "success", conclusion: "success" }]));
    expect(ciStepRecordObservations(record).map((observation) => observation.scnId)).toEqual(["SCN-AB-001", "SCN-FIVEC-001"]);
  });
});

describe("[SCN-WFS-019] each step in the run's record is read by its outcome, never its conclusion, so a red the job swallowed still reads failed", () => {
  it("reads a step that failed under a successful conclusion as failed, and one that succeeded under a failed conclusion as passed", () => {
    const record = {
      "SCN-FIT-001": { outcome: "failure", conclusion: "success" },
      "SCN-FIT-002": { outcome: "success", conclusion: "failure" },
    };
    expect(ciStepRecordObservations(record)).toStrictEqual([
      {
        qualityCheck: "fitness",
        fitnessFunction: "SCN-FIT-001",
        scnId: "SCN-FIT-001",
        exists: true,
        enforcedOverRealSource: true,
        status: "failed",
      },
      {
        qualityCheck: "fitness",
        fitnessFunction: "SCN-FIT-002",
        scnId: "SCN-FIT-002",
        exists: true,
        enforcedOverRealSource: true,
        status: "passed",
      },
    ]);
  });
  it("translates each recorded outcome into the step's report, and keeps what the record said only when it said something", () => {
    const record = {
      "SCN-FIT-001": { outcome: "success" },
      "SCN-FIT-002": { outcome: "failure" },
      "SCN-FIT-003": { outcome: "skipped" },
      "SCN-FIT-004": { conclusion: "success" },
    };
    expect(recordedCheckStepsOf(record)).toStrictEqual([
      { citedScn: "SCN-FIT-001", report: "succeeded", said: "success" },
      { citedScn: "SCN-FIT-002", report: "failed", said: "failure" },
      { citedScn: "SCN-FIT-003", report: "other", said: "skipped" },
      { citedScn: "SCN-FIT-004", report: "other" },
    ]);
  });
});
