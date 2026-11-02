import { describe, it, expect } from "vitest";
import { reconcilingItemsOf } from "./claimReconciliation.js";
import { reconcile } from "./evidenceReconciliation.js";
import { parseScenarios } from "../parse/scenarioReaders.test-utils.js";
import { parseVitestEvidenceObservations, type VitestJsonReport } from "../parse/vitest.js";
import { parseCucumberEvidenceObservations, type CucumberJsonReport } from "../parse/cucumber.js";

describe("[SCN-LDG-013] a @unit @e2e scenario proven by BOTH a vitest and a cucumber observation reconciles both layers satisfied", () => {
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
            { fullName: "[SCN-LDG-013] the unit substrate proves the unit layer", status: "passed" },
          ],
        },
      ],
    };
    const vitestObs = parseVitestEvidenceObservations(vitestReport);

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
    const cucumberObs = parseCucumberEvidenceObservations(cucumberReport);
    expect(cucumberObs).toEqual([
      { qualityCheckKind: "e2e", scnId: "SCN-LDG-013", status: "passed", locator: "features/fixture.feature" },
    ]);

    const balance = reconcile(scenarios, [...vitestObs, ...cucumberObs]);
    const scenario = balance.claimReconciliations.find((s) => s.claim === "SCN-LDG-013");

    expect(scenario?.verdict).toBe("balanced");
    expect(reconcilingItemsOf(scenario!)).toEqual([]);
    expect(scenario?.qualityCheckReconciliations).toEqual(
      expect.arrayContaining([
        { qualityCheckKind: "unit", evidenceObligation: { qualityCheckKind: "unit" }, evidenceObservations: [{ qualityCheckKind: "unit", scnId: "SCN-LDG-013", status: "passed", locator: "src/unitAndE2e.test.ts", testName: "[SCN-LDG-013] the unit substrate proves the unit layer", outcome: "satisfied" }] },
        { qualityCheckKind: "e2e", evidenceObligation: { qualityCheckKind: "e2e" }, evidenceObservations: [{ qualityCheckKind: "e2e", scnId: "SCN-LDG-013", status: "passed", locator: "features/fixture.feature", outcome: "satisfied" }] },
      ])
    );
    expect(scenario?.qualityCheckReconciliations).toHaveLength(2);
  });
});
