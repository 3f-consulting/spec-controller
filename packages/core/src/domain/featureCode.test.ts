import { describe, it, expect } from "vitest";
import { featureCodeOf, isFeaturePart } from "./featureCode.js";

describe("[SCN-STG-024] an @SCN code has a feature part of two to five characters and a number of any width", () => {
  it("reads a feature part of two and of five characters, and none of one or of six", () => {
    expect(["A", "AB", "FIVEC", "SIXCHR"].map(isFeaturePart)).toEqual([false, true, true, false]);
    expect(["SCN-A-001", "SCN-AB-001", "SCN-FIVEC-001", "SCN-SIXCHR-001"].map(featureCodeOf)).toEqual([
      null,
      "AB",
      "FIVEC",
      null,
    ]);
  });

  it("reads a number of one digit and of several digits", () => {
    expect(["SCN-AB-1", "SCN-AB-0001234", "SCN-AB-"].map(featureCodeOf)).toEqual(["AB", "AB", null]);
  });

  it("reads a code under CLM with the same bounds", () => {
    expect(["CLM-A-001", "CLM-AB-1", "CLM-FIVEC-0001234", "CLM-SIXCHR-001", "CLM-AB-"].map(featureCodeOf)).toEqual([
      null,
      "AB",
      "FIVEC",
      null,
      null,
    ]);
  });
});
