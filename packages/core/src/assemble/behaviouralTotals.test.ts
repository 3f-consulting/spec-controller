import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import { type EvidenceReconciliation } from "./renderInput.js";
import { parseVitestEvidenceObservations, type VitestJsonReport } from "../parse/vitest.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";

const feature = `Feature: alpha

  @unit @CLM-FIX-001
  Scenario: a fixture behaviour
    Given a fixture
`;

const vitestResult: VitestJsonReport = {
  testResults: [
    {
      name: "/repo/src/fixture.test.ts",
      status: "passed",
      assertionResults: [
        { fullName: "[CLM-FIX-001] a fixture behaviour holds", title: "holds", status: "passed" },
        { fullName: "[CLM-FIX-001] a fixture behaviour holds again", title: "holds again", status: "passed" },
        { fullName: "[CLM-PHX-999] a scenario no feature carries", title: "is cited", status: "passed" },
        { fullName: "a test citing no scenario", title: "a test citing no scenario", status: "passed" },
      ],
    },
  ],
};

function assembled(): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    packageJson: { scripts: {} },
    ciWorkflows: [],
    behaviouralObservations: parseVitestEvidenceObservations(vitestResult, "/repo"),
    deferralTags: [],
  });
}

describe("[CLM-RMD-003] the summary counts the evidence observations of each of the five kinds of quality check, fitness included, by the kind of claim each posts to, and their total is the five counts' sum", () => {
  it("states the evidence observations it was handed on its summary, a count for each of the five kinds of quality check with fitness last", () => {
    expect(assembled().summary.evidenceObservations).toStrictEqual({
      total: 4,
      onScenario: 2,
      onPhantomClaim: 1,
      onUnnamedClaim: 1,
      byQualityCheckKind: [
        { qualityCheckKind: "unit", count: 4 },
        { qualityCheckKind: "integration", count: 0 },
        { qualityCheckKind: "e2e", count: 0 },
        { qualityCheckKind: "performance", count: 0 },
        { qualityCheckKind: "fitness", count: 0 },
      ],
    });
  });
});
