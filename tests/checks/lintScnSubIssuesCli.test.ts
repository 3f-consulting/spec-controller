/**
 * @unit for the sub-issue gate's SCN-exempt directive (3F-3636, operator ruling 2026-09-25): a code
 * named in a commit trailer is read by the same two-to-five-character grammar as the product
 * (evidence-manifesto §9A). An exemption for a code the product cannot read exempts nothing.
 */
import { describe, it, expect } from "vitest";
import { parseExemptions } from "./lintScnSubIssuesCli.js";

describe("[SCN-STG-025] an SCN-exempt trailer names a code by the same two-to-five-character grammar as the product", () => {
  it("reads the two- and five-character codes' trailers, and not the one- or six-character ones", () => {
    const message = ["SCN-A-001", "SCN-AB-001", "SCN-FIVEC-001", "SCN-SIXCHR-001"]
      .map((code) => `SCN-exempt: ${code} (typo)`)
      .join("\n");
    expect(parseExemptions([message], "").map((e) => e.code)).toEqual(["SCN-AB-001", "SCN-FIVEC-001"]);
  });
});
