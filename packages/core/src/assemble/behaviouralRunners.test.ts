import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";

const ci = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Install
        run: pnpm install --frozen-lockfile
      - name: Unit tests
        run: pnpm test
      - name: Lint
        run: pnpm lint
`;

const feature = `Feature: fixture

  @unit @SCN-FIX-001
  Scenario: a fixture behaviour
    Given a fixture
`;

const scripts = { test: "vitest run", lint: "eslint ." };

function reconcile(runners?: Record<string, string | null>): EvidenceReconciliation {
  const specController = runners === undefined ? {} : { runners };
  const packageJson = { scripts, specController } as Parameters<
    typeof evidenceReconciliationFromSources
  >[0]["packageJson"];
  return evidenceReconciliationFromSources({
    featureSources: [feature],
    untaggedScenarios: [],
    packageJson,
    ciSources: [ci],
    ciSourceNames: ["ci.yml"],
    runtimeObservations: [],
    deferralTags: [],
  });
}

describe("[SCN-USG-017] a target with no runners block reports every step of its pipeline as a candidate", () => {
  it("carries no runner account for a target whose configuration names no runners", () => {
    const { summary } = reconcile();
    expect(summary).not.toHaveProperty("behaviouralRunners");
    expect(summary).not.toHaveProperty("runnerTiers");
    expect(summary).not.toHaveProperty("unrecognisedRunnerKeys");
  });

  it("carries the step that runs the unit runner for the same pipeline once its runners block names it", () => {
    const { summary } = reconcile({ unit: "vitest" });
    expect(summary.behaviouralRunners).toStrictEqual([
      { tier: "unit", runner: "vitest", step: "Unit tests" },
    ]);
  });
});
