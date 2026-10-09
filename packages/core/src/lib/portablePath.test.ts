import { describe, it, expect } from "vitest";
import { relativizeToRoot } from "./portablePath.js";

describe("[SCN-RPT-016] relativizeToRoot — portable-path relativization (shared)", () => {
  it("relativizes an absolute path under the run root", () => {
    expect(relativizeToRoot("/repo/src/a.ts", "/repo")).toBe("src/a.ts");
  });

  it("records the run root itself as \".\", never as its absolute path", () => {
    expect(relativizeToRoot("/repo", "/repo")).toBe(".");
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
