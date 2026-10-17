import { describe, it, expect } from "vitest";
import { ciStepRecordObservations } from "./ciStepRecord.js";

const BOUNDS = ["SCN-A-001", "SCN-AB-001", "SCN-FIVEC-001", "SCN-SIXCHR-001"] as const;

describe("[SCN-WFS-016] a CI step whose id is a feature part outside two to five characters is no fitness evidence observation's citation", () => {
  it("reads an evidence observation from the two- and five-character step ids in the run record, and from no other", () => {
    const record = Object.fromEntries(BOUNDS.map((id) => [id, { outcome: "success", conclusion: "success" }]));
    expect(ciStepRecordObservations(record).map((observation) => observation.scnId)).toEqual(["SCN-AB-001", "SCN-FIVEC-001"]);
  });
});
