import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import { type EvidenceReconciliation } from "./renderInput.js";
import { renderJson } from "../render/json.js";
import { parseVitestEvidenceObservations, type VitestJsonReport } from "../parse/vitest.js";
import type { RunContext } from "../provenance/provenance.js";

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
        { fullName: "[SCN-PHX-999] a scenario no feature declares", title: "is cited", status: "passed" },
        { fullName: "a test citing no scenario", title: "a test citing no scenario", status: "passed" },
      ],
    },
  ],
};

const ctx: RunContext = {
  target: "fixture",
  inputs: { features: "features" },
  runStart: new Date("2026-10-03T00:00:00.000Z"),
  sourceSha: null,
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

  it("carries the test volume split by the account each observation posted to", () => {
    expect(assembled().summary.testVolume).toStrictEqual({
      totalEvidenceObservations: 4,
      onScenario: 2,
      onPhantomScenario: 1,
      onSuspenseScenario: 1,
    });
  });

  it("keeps the balancing identity on the persisted file: the raw totals sum to the scenario, phantom and suspense volumes", () => {
    const parsed = JSON.parse(renderJson(assembled(), ctx));
    expect(parsed).not.toHaveProperty("evidenceObservations");
    expect(parsed.summary).toHaveProperty("rawByRuntimeQualityCheck");
    expect(parsed.summary).toHaveProperty("testVolume");
    const raw = (Object.values(parsed.summary.rawByRuntimeQualityCheck) as number[]).reduce((a, b) => a + b, 0);
    const tv = parsed.summary.testVolume;
    expect(raw).toBe(4);
    expect(raw).toBe(tv.onScenario + tv.onPhantomScenario + tv.onSuspenseScenario);
  });
});
