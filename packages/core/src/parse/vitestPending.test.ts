import { describe, it, expect } from "vitest";
import { parseVitestEvidenceObservations, type VitestJsonReport } from "./vitest.js";

describe("[SCN-PND-015] parseVitestEvidenceObservations classifies three-way — inconclusive is dropped", () => {
  const reportWithStatus = (status: string): VitestJsonReport => ({
    testResults: [
      { name: "/r/a.test.ts", assertionResults: [{ fullName: "[SCN-PDV-001] a unit assertion", status }] },
    ],
  });

  it.each([
    ["emits a `passed` observation for a passed assertion", "passed"],
    ["emits a `failed` observation for a failed assertion", "failed"],
  ] as const)("%s", (_title, status) => {
    expect(parseVitestEvidenceObservations(reportWithStatus(status), "unit")).toEqual([
      { qualityCheck: "unit", scnId: "SCN-PDV-001", status, locator: "/r/a.test.ts" },
    ]);
  });

  it.each([
    ["DROPS a skipped assertion — inconclusive, so nothing is emitted", "skipped"],
    ["DROPS a todo assertion — inconclusive, so nothing is emitted", "todo"],
  ] as const)("%s", (_title, status) => {
    expect(parseVitestEvidenceObservations(reportWithStatus(status), "unit")).toEqual([]);
  });

  it("DROPS any non-pass-non-fail status — robust to vitest's status spelling", () => {
    expect(parseVitestEvidenceObservations(reportWithStatus("pending"), "unit")).toEqual([]);
    expect(
      parseVitestEvidenceObservations(
        { testResults: [{ name: "/r/a.test.ts", assertionResults: [{ fullName: "[SCN-PDV-001] x" }] }] },
        "unit"
      )
    ).toEqual([]);
  });

  it("drops ONLY the inconclusive assertion — genuine passed/failed siblings still emit", () => {
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
