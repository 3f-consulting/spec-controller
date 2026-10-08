import { describe, it, expect } from "vitest";
import { reconcile } from "./evidenceReconciliation.js";
import { parseScenarios } from "../parse/scenarios.js";
import { parseVitestEvidenceObservations, type VitestJsonReport } from "../parse/vitest.js";
import { parseCucumberEvidenceObservations, type CucumberJsonReport } from "../parse/cucumber.js";

describe("[SCN-LDG-013] a @unit @e2e scenario proven by BOTH a vitest and a cucumber observation reconciles both tiers satisfied", () => {
  it("balances both obligations — vitest discharges @unit, cucumber (derived) discharges @e2e — from a real scenario and both real readers", () => {
    const scenarios = parseScenarios(
      [
        "@LDG",
        "Feature: fixture",
        "  Rule: a fixture rule",
        "    @unit @e2e @SCN-LDG-013",
        "    Scenario: a unit-and-e2e fixture scenario",
        "      Given a fixture step",
      ].join("\n")
    );

    const vitestReport: VitestJsonReport = {
      testResults: [
        {
          name: "src/unitAndE2e.test.ts",
          assertionResults: [
            { fullName: "[SCN-LDG-013] the unit substrate proves the unit tier", status: "passed" },
          ],
        },
      ],
    };
    const vitestObs = parseVitestEvidenceObservations(vitestReport, "unit");

    const cucumberReport: CucumberJsonReport = [
      {
        uri: "features/fixture.feature",
        elements: [
          {
            tags: [{ name: "@unit" }, { name: "@e2e" }, { name: "@SCN-LDG-013" }],
            steps: [{ result: { status: "passed" } }],
          },
        ],
      },
    ];
    const cucumberObs = parseCucumberEvidenceObservations(cucumberReport, "integration");
    expect(cucumberObs).toEqual([
      { qualityCheck: "e2e", scnId: "SCN-LDG-013", status: "passed", locator: "features/fixture.feature" },
    ]);

    const balance = reconcile(scenarios, [...vitestObs, ...cucumberObs]);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-LDG-013");

    expect(scenario?.verdict).toBe("balanced");
    expect(scenario?.reconcilingItems).toEqual([]);
    expect(scenario?.qualityCheckReconciliations).toEqual(
      expect.arrayContaining([
        { qualityCheck: "unit", outcome: "satisfied", evidenceObligation: { qualityCheck: "unit" }, evidenceObservation: { qualityCheck: "unit", scnId: "SCN-LDG-013", status: "passed", locator: "src/unitAndE2e.test.ts" } },
        { qualityCheck: "e2e", outcome: "satisfied", evidenceObligation: { qualityCheck: "e2e" }, evidenceObservation: { qualityCheck: "e2e", scnId: "SCN-LDG-013", status: "passed", locator: "features/fixture.feature" } },
      ])
    );
    expect(scenario?.qualityCheckReconciliations).toHaveLength(2);
  });
});
