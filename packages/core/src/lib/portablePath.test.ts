import { describe, it, expect } from "vitest";
import { relativizeToRoot } from "./portablePath.js";

describe("[SCN-RPT-016] relativizeToRoot — portable-path relativization (shared)", () => {
  it.each([
    ["relativizes an absolute path under the run root", "/repo/src/a.ts", "src/a.ts"],
    ["records the run root itself as \".\", never as its absolute path", "/repo", "."],
    [
      "leaves an absolute path NOT under the run root verbatim (never escapes via ..)",
      "/elsewhere/a.ts",
      "/elsewhere/a.ts",
    ],
  ] as const)("%s", (_title, path, relativized) => {
    expect(relativizeToRoot(path, "/repo")).toBe(relativized);
  });

  it("leaves a non-absolute path unchanged (a sentinel / already-relative path)", () => {
    expect(relativizeToRoot("src/a.ts", "/repo")).toBe("src/a.ts");
    expect(relativizeToRoot("(unknown vitest file)", "/repo")).toBe("(unknown vitest file)");
  });

  it("returns the path verbatim when no run root is given (the opt-in default)", () => {
    expect(relativizeToRoot("/repo/src/a.ts", undefined)).toBe("/repo/src/a.ts");
  });
});
