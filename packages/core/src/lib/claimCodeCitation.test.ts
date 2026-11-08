import { describe, it, expect } from "vitest";
import { claimCodeCitationsOf } from "./claimCodeCitation.js";

describe("[CLM-VIT-008] a title citing a feature part outside two to five characters cites no scenario", () => {
  it("reads only the citations whose feature part is within the bound", () => {
    expect(claimCodeCitationsOf("cites [CLM-A-001] then [CLM-SIXCHR-001]")).toEqual([]);
    expect(claimCodeCitationsOf("cites [CLM-SIXCHR-001] then [CLM-FIVEC-001]")).toEqual(["CLM-FIVEC-001"]);
  });
});
