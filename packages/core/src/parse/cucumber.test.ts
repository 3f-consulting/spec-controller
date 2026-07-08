/**
 * @unit guard for the source→level seam.
 *
 * Strict coverage gain: parseCucumberEvidenceObservations had no dedicated unit test — its level was
 * a hardcoded "integration". This proves the level is now the CALLER-DECLARED one, so the
 * implicit Cucumber⇒integration assumption is gone (the Read's positive guard). The
 * JS-ecosystem default (integration) is declared at the CLI edge, not here.
 */

import { describe, it, expect } from "vitest";
import { parseCucumberEvidenceObservations, type CucumberJsonReport } from "./cucumber.js";

describe("parseCucumberEvidenceObservations stamps the declared level", () => {
  const report: CucumberJsonReport = [
    {
      uri: "features/x.feature",
      elements: [
        { tags: [{ name: "@SCN-FOO-003" }], steps: [{ result: { status: "passed" } }] },
      ],
    },
  ];

  it("attributes results at the declared level (integration — the JS-ecosystem default declared by the CLI)", () => {
    // Each credit carries its feature-file locator (the where-to-fix, ruling Q5).
    expect(parseCucumberEvidenceObservations(report, "integration")).toEqual([
      { qualityCheck: "integration", scnId: "SCN-FOO-003", status: "passed", locator: "features/x.feature" },
    ]);
  });

  it("honors a NON-default declared level — the assumption is gone (no Cucumber⇒integration hardcode)", () => {
    const out = parseCucumberEvidenceObservations(report, "unit");
    expect(out).toHaveLength(1);
    expect(out.every((r) => r.qualityCheck === "unit")).toBe(true);
  });
});

describe("[SCN-LDG-011] parseCucumberEvidenceObservations derives the level from the scenario's declared tier tag", () => {
  it("stamps an @e2e-tagged scenario's observation e2e — the tag, not the fallback source level", () => {
    const report: CucumberJsonReport = [
      {
        uri: "features/e2e.feature",
        elements: [
          {
            tags: [{ name: "@e2e" }, { name: "@SCN-LDG-011" }],
            steps: [{ result: { status: "passed" } }],
          },
        ],
      },
    ];
    // Fallback "integration" is the JS-ecosystem default the CLI declares; the scenario's
    // own @e2e tag overrides it, so the observation is levelled e2e (an adopter's repository fix).
    expect(parseCucumberEvidenceObservations(report, "integration")).toEqual([
      { qualityCheck: "e2e", scnId: "SCN-LDG-011", status: "passed", locator: "features/e2e.feature" },
    ]);
  });

  it("falls back to the caller-declared level for a scenario with no tier tag", () => {
    const report: CucumberJsonReport = [
      {
        uri: "features/x.feature",
        elements: [
          { tags: [{ name: "@SCN-FOO-009" }], steps: [{ result: { status: "passed" } }] },
        ],
      },
    ];
    // No @integration/@e2e/@performance tag → the fallback (source level) still applies.
    expect(parseCucumberEvidenceObservations(report, "integration")).toEqual([
      { qualityCheck: "integration", scnId: "SCN-FOO-009", status: "passed", locator: "features/x.feature" },
    ]);
  });
});
