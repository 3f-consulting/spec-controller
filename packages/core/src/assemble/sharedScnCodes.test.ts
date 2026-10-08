import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import { renderJson } from "../render/json.js";
import type { EvidenceObligations, SharedScnCode } from "../census/evidenceObligations.js";
import { fixtureCtx as ctx } from "./runContext.testkit.js";

const one = `Feature: one

  @unit @SCN-ONE-001
  Scenario: the scenario in one
    Given a fixture

  @unit @SCN-OWN-001
  Scenario: a scenario of its own
    Given a fixture
`;

const two = `Feature: two

  @unit @SCN-ONE-001
  Scenario: the scenario in two
    Given a fixture
`;

const shared: SharedScnCode[] = [
  {
    scnId: "SCN-ONE-001",
    scenarios: [
      { feature: "one.feature", scenario: "the scenario in one" },
      { feature: "two.feature", scenario: "the scenario in two" },
    ],
  },
];

function savedObligations(sharedScnCodes: SharedScnCode[]): Record<string, unknown> {
  const reconciliation = evidenceReconciliationFromSources({
    featureSources: [one, two],
    untaggedScenarios: [],
    packageJson: { scripts: {} },
    ciSources: [],
    runtimeObservations: [],
    deferralTags: [],
  });
  const obligations: EvidenceObligations = {
    rawScnOccurrences: 3,
    scenarioCount: 3,
    excludedOccurrences: 0,
    untaggedScenarios: [],
    sharedScnCodes,
  };
  return JSON.parse(renderJson(reconciliation, ctx, obligations)).evidenceObligations;
}

describe("[SCN-STG-017] The report states that the corpus holds more scenarios than accounts, and names the scenarios sharing each code", () => {
  it("carries the shared code, with the file and the name of each scenario carrying it, in the saved report", () => {
    expect(savedObligations(shared).sharedScnCodes).toStrictEqual(shared);
  });

  it("carries no shared-code list in the saved report when the census it was handed shares no code", () => {
    expect(savedObligations([])).not.toHaveProperty("sharedScnCodes");
  });
});
