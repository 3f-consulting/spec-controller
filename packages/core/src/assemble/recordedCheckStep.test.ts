import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";

const CORPUS = `@FIT
Feature: a target's fitness corpus
  Rule: the tree stays inside its thresholds
    @fitness @SCN-AAA-001
    Scenario: the codebase stays under its complexity threshold
`;

const CI = `name: CI
jobs:
  ci:
    steps:
      - name: Lint
        id: SCN-AAA-001
        run: pnpm lint:alpha
`;

const reconcileWith = (ciStepRecord?: Record<string, { outcome?: string }>) =>
  evidenceReconciliationFromSources({
    featureSources: [CORPUS],
    untaggedScenarios: [],
    packageJson: { scripts: { "lint:alpha": "eslint" } },
    ciSources: [CI],
    ciSourceNames: ["ci.yml"],
    behaviouralObservations: [],
    deferralTags: [],
    ...(ciStepRecord === undefined ? {} : { ciStepRecord }),
  }).ledger.scenarioReconciliations.find((row) => row.scnId === "SCN-AAA-001");

describe("[SCN-LNT-020] a cited step the run's own record never recorded leaves its scenario missing", () => {
  it.each([
    ["reads missing where the record happened and carried no step for it", "SCN-ZZZ-999", "missing", "out-of-balance"],
    ["reads satisfied where the record carried its step and says it succeeded", "SCN-AAA-001", "satisfied", "balanced"],
  ])("%s", (_title, recordedStep, outcome, verdict) => {
    const row = reconcileWith({ [recordedStep]: { outcome: "success" } });
    expect(row?.qualityCheckReconciliations.map((item) => item.outcome)).toEqual([outcome]);
    expect(row?.verdict).toBe(verdict);
  });
});
