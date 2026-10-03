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
`;

const feature = `Feature: fixture

  @unit @SCN-FIX-001
  Scenario: a fixture behaviour
    Given a fixture
`;

const scripts = { test: "vitest run" };

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

describe("[SCN-USG-016] a null runner reports the tier as having none, and an absent key reports it as unnamed", () => {
  it("carries the performance tier as having no runner for a target that says it has none", () => {
    const { summary } = reconcile({ unit: "vitest", performance: null });
    expect(summary.runnerTiers).toStrictEqual({ unit: "vitest", performance: null });
  });

  it("carries no performance tier for a target alike but for saying nothing about performance", () => {
    const { summary } = reconcile({ unit: "vitest" });
    expect(summary.runnerTiers).toStrictEqual({ unit: "vitest" });
    expect(summary.runnerTiers).not.toHaveProperty("performance");
  });

  it("carries no runner tiers for a target with no runners block", () => {
    const { summary } = reconcile();
    expect(summary).not.toHaveProperty("runnerTiers");
  });
});
