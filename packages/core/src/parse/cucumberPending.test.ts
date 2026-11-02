import { describe, it, expect } from "vitest";
import { parseCucumberEvidenceObservations, type CucumberJsonReport } from "./cucumber.js";

describe("[SCN-CUC-004] parseCucumberEvidenceObservations classifies a scenario three-way — pending is never inferred from status", () => {
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
    expect(parseCucumberEvidenceObservations(reportWithStep(status))).toEqual([
      { qualityCheckKind: "integration", scnId: "SCN-PDN-001", status, locator: "features/pnd013.feature" },
    ]);
  });

  it("drops an inconclusive scenario at EVERY named layer — the drop is whole-scenario, not per-layer", () => {
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
    expect(parseCucumberEvidenceObservations(report)).toEqual([]);
  });
});

describe("[SCN-CUC-002] parseCucumberEvidenceObservations posts an @integrationpending scenario at integration, the fallback of a report of scenario runs, since a pending tag is no layer tag", () => {
  it("a passing Cucumber scenario tagged @integrationpending emits its evidence observation at the report's fallback, integration, with no layer handed in", () => {
    const observations = parseCucumberEvidenceObservations(
      [
        {
          uri: "features/deferred.feature",
          elements: [
            {
              tags: [{ name: "@integrationpending" }, { name: "@SCN-XXX-002" }],
              steps: [{ result: { status: "passed" } }],
            },
          ],
        },
      ]
    );
    expect(observations).toEqual([
      { qualityCheckKind: "integration", scnId: "SCN-XXX-002", status: "passed", locator: "features/deferred.feature" },
    ]);
  });

  it("a passing Cucumber scenario tagged @integrationpending and @e2e emits its evidence observation at e2e alone, never at integration", () => {
    const observations = parseCucumberEvidenceObservations([
      {
        uri: "features/deferred.feature",
        elements: [
          {
            tags: [{ name: "@integrationpending" }, { name: "@e2e" }, { name: "@SCN-XXX-002" }],
            steps: [{ result: { status: "passed" } }],
          },
        ],
      },
    ]);
    expect(observations).toEqual([
      { qualityCheckKind: "e2e", scnId: "SCN-XXX-002", status: "passed", locator: "features/deferred.feature" },
    ]);
  });
});
