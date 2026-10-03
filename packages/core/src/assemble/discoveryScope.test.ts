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

const nightly = `name: fixture nightly
jobs:
  sweep:
    steps:
      - name: Circular check
        run: pnpm lint:circular
      - name: Depth check
        run: pnpm lint:depth
  audit:
    steps:
      - name: Audit
        run: pnpm audit --audit-level=high
`;

const feature = `Feature: fixture

  @unit @SCN-FIX-001
  Scenario: a fixture behaviour
    Given a fixture
`;

const packageJson = {
  scripts: {
    test: "vitest run",
    "lint:circular": "madge --circular",
    "lint:depth": "depcruise src",
  },
  specController: { runners: { unit: "vitest" } },
} as Parameters<typeof evidenceReconciliationFromSources>[0]["packageJson"];

function reconcile(
  ciSources: readonly string[],
  ciSourceNames?: readonly string[]
): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    featureSources: [feature],
    untaggedScenarios: [],
    packageJson,
    ciSources,
    ...(ciSourceNames === undefined ? {} : { ciSourceNames }),
    runtimeObservations: [],
    deferralTags: [],
  });
}

describe("[SCN-USG-020] the report names the workflows, the jobs and the step count discovery ranged over", () => {
  it("names every workflow and every job it read, with its steps and candidates, in one settled order", () => {
    const { summary } = reconcile([nightly, ci], ["nightly.yml", "ci.yml"]);
    expect(summary.discoveryScope).toStrictEqual([
      { source: "ci.yml", job: "quality", steps: 3, candidates: 2 },
      { source: "nightly.yml", job: "audit", steps: 1, candidates: 1 },
      { source: "nightly.yml", job: "sweep", steps: 2, candidates: 2 },
    ]);
  });

  it("names no workflow on any job when the target gives no workflow names", () => {
    const { summary } = reconcile([nightly, ci]);
    expect(summary.discoveryScope).toStrictEqual([
      { job: "audit", steps: 1, candidates: 1 },
      { job: "quality", steps: 3, candidates: 2 },
      { job: "sweep", steps: 2, candidates: 2 },
    ]);
  });

  it("carries no discovery scope for a target with no pipeline", () => {
    const { summary } = reconcile([], []);
    expect(summary).not.toHaveProperty("discoveryScope");
  });
});
