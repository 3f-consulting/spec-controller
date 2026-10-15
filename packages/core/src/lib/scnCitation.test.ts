import { describe, it, expect } from "vitest";
import { scnCitationsOf } from "./scnCitation.js";

describe("[SCN-STG-025] a title citing a feature part outside two to five characters cites no scenario", () => {
  it("reads only the citations whose feature part is within the bound", () => {
    expect(scnCitationsOf("cites [SCN-A-001] then [SCN-SIXCHR-001]")).toEqual([]);
    expect(scnCitationsOf("cites [SCN-SIXCHR-001] then [SCN-FIVEC-001]")).toEqual(["SCN-FIVEC-001"]);
  });
});
