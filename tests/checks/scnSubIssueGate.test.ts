/**
 * @unit for the scenario sub-issue gate's own @SCN readers (3F-3636, operator ruling 2026-09-25).
 * The gate is this repository's apparatus, not the product, but it reads @SCN ids from a
 * feature-file diff, and a gate reading a wider grammar than the product would bind a change to a
 * code the product cannot read. So it takes evidence-manifesto §9A's bound as well: a feature part
 * of two to five characters, a number of any width.
 */
import { describe, it, expect } from "vitest";
import { detectDeletedCodes, parseAddedCodes } from "./scnSubIssueGate.js";

/** A feature-file diff adding (`+`) or removing (`-`) one tag line per id. */
function tagLineDiff(marker: "+" | "-", ids: readonly string[]): string {
  return ["--- a/features/x.feature", "+++ b/features/x.feature", "@@ -1,4 +1,4 @@", ...ids.map((id) => `${marker}  @unit @${id}`)].join("\n");
}

const BOUNDS = ["SCN-A-001", "SCN-AB-001", "SCN-FIVEC-001", "SCN-SIXCHR-001"] as const;

describe("[SCN-STG-024] the sub-issue gate reads a scenario tag by the same two-to-five-character grammar as the product", () => {
  it("counts an added tag line's two- and five-character codes, and not the one- or six-character ones", () => {
    expect(parseAddedCodes(tagLineDiff("+", BOUNDS))).toEqual(["SCN-AB-001", "SCN-FIVEC-001"]);
  });

  it("counts a removed tag line's two- and five-character codes as deleted, and not the one- or six-character ones", () => {
    expect(detectDeletedCodes(tagLineDiff("-", BOUNDS), [], [])).toEqual(["SCN-AB-001", "SCN-FIVEC-001"]);
  });
});
