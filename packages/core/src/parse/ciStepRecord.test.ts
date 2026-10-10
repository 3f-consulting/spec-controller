import { describe, it, expect } from "vitest";
import { ciStepRecordCredits } from "./ciStepRecord.js";

const BOUNDS = ["SCN-A-001", "SCN-AB-001", "SCN-FIVEC-001", "SCN-SIXCHR-001"] as const;

describe("[SCN-STG-027] a CI step whose id is a feature part outside two to five characters is no fitness credit's citation", () => {
  it("credits the two- and five-character step ids from the run record, and no other", () => {
    const record = Object.fromEntries(BOUNDS.map((id) => [id, { outcome: "success", conclusion: "success" }]));
    expect(ciStepRecordCredits(record).map((credit) => credit.scnId)).toEqual(["SCN-AB-001", "SCN-FIVEC-001"]);
  });
});
