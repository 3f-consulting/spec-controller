import { describe, it, expect } from "vitest";
import { featureCodeOf, isFeaturePart } from "./featureCode.js";

describe("[CLM-STG-024] a claim code has a feature part of two to five characters and a number of any width", () => {
  it("reads a feature part of two and of five characters and none of one or of six, and a number of one digit and of several", () => {
    expect(["A", "AB", "FIVEC", "SIXCHR"].map(isFeaturePart)).toEqual([false, true, true, false]);
    expect(["CLM-A-001", "CLM-AB-1", "CLM-FIVEC-0001234", "CLM-SIXCHR-001", "CLM-AB-"].map(featureCodeOf)).toEqual([
      null,
      "AB",
      "FIVEC",
      null,
      null,
    ]);
  });
});
