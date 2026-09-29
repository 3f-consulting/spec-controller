/**
 * A Vitest title's bracketed citation is read by
 * evidence-manifesto §9A's grammar: a feature part of two to five characters, a number of any
 * width. The titles straddle both bounds, so the citations that ARE read show the reader was
 * looking when the ones that are not come back as nothing.
 */
import { describe, it, expect } from "vitest";
import { parseScnCitation } from "./scnCitation.js";

describe("[SCN-STG-025] a title citing a feature part outside two to five characters cites no scenario", () => {
  it("finds no first citation in a title whose only citations are outside the bound", () => {
    expect(parseScnCitation("cites [SCN-A-001] then [SCN-SIXCHR-001]")).toBeNull();
    expect(parseScnCitation("cites [SCN-SIXCHR-001] then [SCN-FIVEC-001]")).toBe("SCN-FIVEC-001");
  });

  it("still reads a number of any width, which canon allows", () => {
    expect(parseScnCitation("proves [SCN-AB-1]")).toBe("SCN-AB-1");
  });
});
