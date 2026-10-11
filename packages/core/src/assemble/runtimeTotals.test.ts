import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import { type EvidenceReconciliation } from "./renderInput.js";
import { parseVitestEvidenceObservations, type VitestJsonReport } from "../parse/vitest.js";

const feature = `Feature: alpha

  @unit @SCN-FIX-001
  Scenario: a fixture behaviour
    Given a fixture
`;

const vitestResult: VitestJsonReport = {
  testResults: [
    {
      name: "/repo/src/fixture.test.ts",
      status: "passed",
      assertionResults: [
        { fullName: "[SCN-FIX-001] a fixture behaviour holds", title: "holds", status: "passed" },
        { fullName: "[SCN-FIX-001] a fixture behaviour holds again", title: "holds again", status: "passed" },
        { fullName: "[SCN-PHX-999] a scenario no feature carries", title: "is cited", status: "passed" },
        { fullName: "a test citing no scenario", title: "a test citing no scenario", status: "passed" },
      ],
    },
  ],
};

function assembled(): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    featureSources: [feature],
    untaggedScenarios: [],
    packageJson: { scripts: {} },
    ciSources: [],
    runtimeObservations: parseVitestEvidenceObservations(vitestResult, "unit", "/repo"),
    deferralTags: [],
  });
}

describe("[SCN-RMD-003] the runtime-observation totals re-home onto summary and the balancing identity holds on the persisted file", () => {
  it("carries the raw per-quality-check totals of the observations it was handed on its summary", () => {
    expect(assembled().summary.rawByRuntimeQualityCheck).toStrictEqual({
      unit: 4,
      integration: 0,
      e2e: 0,
      performance: 0,
    });
  });
});
