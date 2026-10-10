import { describe, it, expect } from "vitest";
import { parseScnCitation } from "./scnCitation.js";

describe("[SCN-STG-025] a title citing a feature part outside two to five characters cites no scenario", () => {
  it("finds no first citation in a title whose only citations are outside the bound", () => {
    expect(parseScnCitation("cites [SCN-A-001] then [SCN-SIXCHR-001]")).toBeNull();
    expect(parseScnCitation("cites [SCN-SIXCHR-001] then [SCN-FIVEC-001]")).toBe("SCN-FIVEC-001");
  });
});
