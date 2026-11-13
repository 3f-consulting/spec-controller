import { describe, expect, it } from "vitest";
import { exitCodeOf } from "./exitCode.js";

describe("each run verdict will have its exit code", () => {
  it.each([["CLM-CLI-166", "balanced", 0]] as const)("[%s] a run that reached the run verdict %s exits %i", (_clm, verdict, exitCode) => {
    expect(exitCodeOf({ verdict })).toBe(exitCode);
  });
});
