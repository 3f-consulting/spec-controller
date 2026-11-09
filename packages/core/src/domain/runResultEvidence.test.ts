import { describe, it, expect } from "vitest";
import { evidenceOfRunResult } from "./journal.js";

describe("[CLM-LDG-043] a test that never reached its assertions posts evidence that never ran, whatever the runner", () => {
  it("gives failed evidence that never ran", () => {
    expect(evidenceOfRunResult("never-reached-its-assertions")).toStrictEqual({ status: "failed", neverRan: true });
  });

  it.each(["passed", "failed"] as const)("CONTROL: a test that %s gives that status and does not read never-ran", (result) => {
    expect(evidenceOfRunResult(result)).toStrictEqual({ status: result });
  });
});

describe("[CLM-LDG-044] a test whose result is inconclusive posts no evidence observation, whatever the runner", () => {
  it("gives no evidence", () => {
    expect(evidenceOfRunResult("inconclusive")).toBeUndefined();
  });

  it.each(["passed", "failed", "never-reached-its-assertions"] as const)(
    "CONTROL: a test that %s gives evidence",
    (result) => {
      expect(evidenceOfRunResult(result)).toBeDefined();
    },
  );
});
