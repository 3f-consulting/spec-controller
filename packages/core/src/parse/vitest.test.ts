/**
 * @unit guard for the source→level seam.
 *
 * Strict coverage gain: parseVitestEvidenceObservations had no dedicated unit test — its level was
 * a hardcoded "unit". This proves the level is now the CALLER-DECLARED one, so the
 * implicit Vitest⇒unit assumption is gone (the Read's positive guard — what fails if
 * anyone re-hardcodes the level). The JS-ecosystem default (unit) is declared at the
 * CLI edge, not here.
 */

import { describe, it, expect } from "vitest";
import { parseVitestEvidenceObservations, type VitestJsonReport } from "./vitest.js";

describe("parseVitestEvidenceObservations stamps the declared level", () => {
  const report: VitestJsonReport = {
    testResults: [
      {
        name: "/r/a.test.ts",
        assertionResults: [
          { fullName: "[SCN-FOO-001] does a thing", status: "passed" },
          { fullName: "[SCN-FOO-002] does another", status: "failed" },
        ],
      },
    ],
  };

  it("attributes results at the declared level (unit — the JS-ecosystem default declared by the CLI)", () => {
    // Each credit carries its test-file locator (the where-to-fix, ruling Q5) —
    // verbatim here (no run root passed), portable-relative at the CLI edge.
    expect(parseVitestEvidenceObservations(report, "unit")).toEqual([
      { qualityCheck: "unit", scnId: "SCN-FOO-001", status: "passed", locator: "/r/a.test.ts" },
      { qualityCheck: "unit", scnId: "SCN-FOO-002", status: "failed", locator: "/r/a.test.ts" },
    ]);
  });

  it("honors a NON-default declared level — the assumption is gone (no Vitest⇒unit hardcode)", () => {
    const out = parseVitestEvidenceObservations(report, "e2e");
    expect(out).toHaveLength(2);
    expect(out.every((r) => r.qualityCheck === "e2e")).toBe(true);
    // The status pass-through is unchanged by the quality-check declaration.
    expect(out.map((r) => (r.qualityCheck !== "lint" ? r.status : null))).toEqual([
      "passed",
      "failed",
    ]);
  });
});
