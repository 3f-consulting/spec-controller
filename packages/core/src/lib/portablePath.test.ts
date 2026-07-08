/**
 * Unit tests for relativizeToRoot — the PURE portable-path transform shared by the
 * evidenceObservations locators (@SCN-RPT-010) and the provenance inputs (@SCN-RPT-001).
 * A string transform with no IO; the canonical relativization-semantics
 * coverage, centralised here when the rule was extracted out of evidenceObservations.ts.
 */

import { describe, it, expect } from "vitest";
import { relativizeToRoot } from "./portablePath.js";

describe("relativizeToRoot — portable-path relativization (shared)", () => {
  it("relativizes an absolute path under the run root", () => {
    expect(relativizeToRoot("/repo/src/a.ts", "/repo")).toBe("src/a.ts");
  });

  it("leaves a non-absolute path unchanged (a sentinel / already-relative path)", () => {
    expect(relativizeToRoot("src/a.ts", "/repo")).toBe("src/a.ts");
    expect(relativizeToRoot("(unknown vitest file)", "/repo")).toBe("(unknown vitest file)");
  });

  it("leaves an absolute path NOT under the run root verbatim (never escapes via ..)", () => {
    expect(relativizeToRoot("/elsewhere/a.ts", "/repo")).toBe("/elsewhere/a.ts");
  });

  it("returns the path verbatim when no run root is given (the opt-in default)", () => {
    expect(relativizeToRoot("/repo/src/a.ts", undefined)).toBe("/repo/src/a.ts");
  });
});
