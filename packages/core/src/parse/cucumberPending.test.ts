import { describe, it, expect } from "vitest";
import { parseCucumberEvidenceObservations, type CucumberJsonReport } from "./cucumber.js";

describe("[SCN-PND-013] parseCucumberEvidenceObservations classifies a scenario three-way — pending is never inferred from status", () => {
  const reportWithStep = (status: string): CucumberJsonReport => [
    {
      uri: "features/pnd013.feature",
      elements: [
        {
          tags: [{ name: "@integration" }, { name: "@SCN-PDN-001" }],
          steps: [{ result: { status } }],
        },
      ],
    },
  ];

  it.each([
    ["emits a `passed` observation when every step passed (→ satisfied downstream)", "passed"],
    ["emits a `failed` observation when a step failed (→ failing downstream)", "failed"],
  ] as const)("%s", (_title, status) => {
    expect(parseCucumberEvidenceObservations(reportWithStep(status), "integration")).toEqual([
      { qualityCheck: "integration", scnId: "SCN-PDN-001", status, locator: "features/pnd013.feature" },
    ]);
  });

  for (const status of ["undefined", "pending", "skipped"]) {
    it(`DROPS an inconclusive "${status}" scenario — emits no observation (→ missing by absence)`, () => {
      expect(parseCucumberEvidenceObservations(reportWithStep(status), "integration")).toEqual([]);
    });
  }

  it("drops an inconclusive scenario at EVERY named tier — the drop is whole-scenario, not per-tier", () => {
    const report: CucumberJsonReport = [
      {
        uri: "features/multi.feature",
        elements: [
          {
            tags: [{ name: "@integration" }, { name: "@e2e" }, { name: "@SCN-PDN-002" }],
            steps: [{ result: { status: "passed" } }, { result: { status: "skipped" } }],
          },
        ],
      },
    ];
    expect(parseCucumberEvidenceObservations(report, "integration")).toEqual([]);
  });

  it("still emits a genuine passed/failed UNCITED (null-scnId) result — only inconclusive is dropped", () => {
    const report: CucumberJsonReport = [
      {
        uri: "features/uncited.feature",
        elements: [
          { tags: [{ name: "@integration" }], steps: [{ result: { status: "failed" } }] },
        ],
      },
    ];
    expect(parseCucumberEvidenceObservations(report, "integration")).toEqual([
      { qualityCheck: "integration", scnId: null, status: "failed", locator: "features/uncited.feature" },
    ]);
  });
});
