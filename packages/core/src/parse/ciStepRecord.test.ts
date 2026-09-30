import { describe, it, expect } from "vitest";
import { ciStepRecordCredits } from "./ciStepRecord.js";
import { citationOfCitedRow } from "./fitnessCitations.js";

const BOUNDS = ["SCN-A-001", "SCN-AB-001", "SCN-FIVEC-001", "SCN-SIXCHR-001"] as const;

describe("[SCN-STG-027] a CI step whose id is a feature part outside two to five characters is no fitness credit's citation", () => {
  it("credits the two- and five-character step ids from the run record, and no other", () => {
    const record = Object.fromEntries(BOUNDS.map((id) => [id, { outcome: "success", conclusion: "success" }]));
    expect(ciStepRecordCredits(record).map((credit) => credit.scnId)).toEqual(["SCN-AB-001", "SCN-FIVEC-001"]);
  });

  it("reads a workflow step's id as a citation only inside the bound, at any number width", () => {
    expect(BOUNDS.map((id) => citationOfCitedRow(id)?.scnId ?? null)).toEqual([null, "SCN-AB-001", "SCN-FIVEC-001", null]);
    expect(citationOfCitedRow("SCN-AB-1")).toEqual({ scnId: "SCN-AB-1" });
  });
});
