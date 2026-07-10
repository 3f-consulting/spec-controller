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

describe("[SCN-PND-015] parseVitestEvidenceObservations classifies three-way — inconclusive is dropped", () => {
  // Uniform with the cucumber reader (@SCN-PND-013): pending is NEVER inferred from an assertion's
  // status. `passed`/`failed` emit an observation (satisfied/failing downstream); an inconclusive
  // vitest status (`skipped`/`todo`, and any status ∉ {passed, failed}) is DROPPED — the declared
  // obligation then reconciles missing BY ABSENCE. This proves the emitted-or-dropped classification
  // over the reader in ISOLATION; the @integration arm (tests/steps/pendingItems.steps.ts,
  // [SCN-PND-015]) proves it through the parse→reconcile pipeline. The status strings below are the
  // real vitest JSON reporter's actual assertion statuses (§11A) — never a hand-seeded status.
  const reportWithStatus = (status: string): VitestJsonReport => ({
    testResults: [
      { name: "/r/a.test.ts", assertionResults: [{ fullName: "[SCN-PDV-001] a unit assertion", status }] },
    ],
  });

  it("emits a `passed` observation for a passed assertion", () => {
    expect(parseVitestEvidenceObservations(reportWithStatus("passed"), "unit")).toEqual([
      { qualityCheck: "unit", scnId: "SCN-PDV-001", status: "passed", locator: "/r/a.test.ts" },
    ]);
  });

  it("emits a `failed` observation for a failed assertion", () => {
    expect(parseVitestEvidenceObservations(reportWithStatus("failed"), "unit")).toEqual([
      { qualityCheck: "unit", scnId: "SCN-PDV-001", status: "failed", locator: "/r/a.test.ts" },
    ]);
  });

  it("DROPS a skipped assertion — inconclusive, so nothing is emitted", () => {
    expect(parseVitestEvidenceObservations(reportWithStatus("skipped"), "unit")).toEqual([]);
  });

  it("DROPS a todo assertion — inconclusive, so nothing is emitted", () => {
    expect(parseVitestEvidenceObservations(reportWithStatus("todo"), "unit")).toEqual([]);
  });

  it("DROPS any non-pass-non-fail status — robust to vitest's status spelling", () => {
    // Belt-and-braces on the ∉ {passed, failed} rule: `pending` and an undefined status also drop.
    expect(parseVitestEvidenceObservations(reportWithStatus("pending"), "unit")).toEqual([]);
    expect(
      parseVitestEvidenceObservations(
        { testResults: [{ name: "/r/a.test.ts", assertionResults: [{ fullName: "[SCN-PDV-001] x" }] }] },
        "unit"
      )
    ).toEqual([]);
  });

  it("drops ONLY the inconclusive assertion — genuine passed/failed siblings still emit", () => {
    // A mixed file: the passed + failed assertions emit (incl. an uncited null-scnId credit for the
    // one carrying no @SCN); only the skipped one drops. Preserves the SUSPENSE (null-scnId) path.
    const out = parseVitestEvidenceObservations(
      {
        testResults: [
          {
            name: "/r/a.test.ts",
            assertionResults: [
              { fullName: "[SCN-PDV-001] p", status: "passed" },
              { fullName: "no scn here", status: "failed" },
              { fullName: "[SCN-PDV-002] s", status: "skipped" },
            ],
          },
        ],
      },
      "unit"
    );
    expect(out).toEqual([
      { qualityCheck: "unit", scnId: "SCN-PDV-001", status: "passed", locator: "/r/a.test.ts" },
      { qualityCheck: "unit", scnId: null, status: "failed", locator: "/r/a.test.ts" },
    ]);
  });
});
