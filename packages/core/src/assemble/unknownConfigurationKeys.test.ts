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
      - name: Types
        run: pnpm typecheck
`;

const feature = `Feature: fixture

  @unit @SCN-FIX-001
  Scenario: a fixture behaviour
    Given a fixture
`;

const scripts = { test: "vitest run", typecheck: "tsc --noEmit" };

const block = {
  runners: { unit: "vitest", performance: null },
  notChecks: ["ci.yml:quality:Checkout", "ci.yml:quality:Install"],
  deferralTags: ["deferred"],
};

function reconcile(specController: Record<string, unknown>): EvidenceReconciliation {
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

function withoutUnknownKeys(reconciliation: EvidenceReconciliation): EvidenceReconciliation {
  const { unknownConfigurationKeys: _named, ...summary } = reconciliation.summary;
  return { ...reconciliation, summary };
}

const keys = ["notCheck", "fitnessChecks", "zzz"];

describe("[SCN-USG-028] a key the specController block does not read, a retired one included, is named on the report as unknown in the same words as any other, and the run is not refused over it", () => {
  it.each(keys)("names %s on the report as a key the specController block does not read", (key) => {
    expect(reconcile({ ...block, [key]: true }).summary.unknownConfigurationKeys).toEqual([key]);
  });

  it.each(keys)("gives otherwise the report the same target gives without %s", (key) => {
    expect(withoutUnknownKeys(reconcile({ ...block, [key]: true }))).toEqual(reconcile(block));
  });

  it("carries no unknown-key account for a target whose every key is one the block reads", () => {
    expect(reconcile(block).summary).not.toHaveProperty("unknownConfigurationKeys");
  });
});
