import { describe, it, expect } from "vitest";

import { exitCodeOf } from "./exitStatus.js";

describe("[CLM-CLI-021] exitCodeOf — --exit-zero moves a verdict's code to 0", () => {
  const ROWS = [
    { verdict: "out-of-balance", code: 1 },
    { verdict: "claim-code-errors", code: 1 },
    { verdict: "pending", code: 3 },
  ] as const;

  for (const row of ROWS) {
    it(`${row.verdict} exits ${row.code}, and 0 under --exit-zero`, () => {
      expect(exitCodeOf(row.verdict, false)).toBe(row.code);
      expect(exitCodeOf(row.verdict, true)).toBe(0);
    });
  }

  it("balanced exits 0 with or without --exit-zero", () => {
    expect(exitCodeOf("balanced", false)).toBe(0);
    expect(exitCodeOf("balanced", true)).toBe(0);
  });
});

describe("[CLM-CLI-022] exitCodeOf — --exit-zero never moves a run that could give no verdict", () => {
  const ROWS = [
    { verdict: "unsound", code: 4 },
    { verdict: "nothing-to-reconcile", code: 5 },
  ] as const;

  for (const row of ROWS) {
    it(`${row.verdict} exits ${row.code} with or without --exit-zero`, () => {
      expect(exitCodeOf(row.verdict, false)).toBe(row.code);
      expect(exitCodeOf(row.verdict, true)).toBe(row.code);
    });
  }
});
