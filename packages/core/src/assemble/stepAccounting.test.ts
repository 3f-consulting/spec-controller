import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";

const ci = `name: fixture CI
jobs:
  ci:
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Install
        run: pnpm install --frozen-lockfile
      - name: Build
        run: pnpm build
      - name: Unit tests
        run: pnpm test
      - name: Sweep check
        run: pnpm lint:sweep
      - name: Types
        run: pnpm typecheck
      - name: Depth check
        run: pnpm lint:depth
      - name: Code scanning
        uses: github/codeql-action/analyze@v3
      - name: Dump this run's step record
        env:
          STEPS_JSON: \${{ toJSON(steps) }}
        run: printf '%s' "$STEPS_JSON" > ci-steps.json
      - name: Self-reconciliation balance
        run: pnpm exec spec-controller balance --features features --ci .github/workflows
`;

const feature = `Feature: fixture

  @unit @SCN-FIX-001
  Scenario: a fixture behaviour
    Given a fixture
`;

const packageJson = {
  scripts: {
    test: "vitest run",
    build: "tsc -b",
    typecheck: "tsc --noEmit",
    "lint:sweep": "madge --circular",
    "lint:depth": "depcruise src",
  },
  specController: {
    runners: { unit: "vitest" },
    notChecks: ["ci.yml:ci:Checkout", "ci.yml:ci:Install", "ci.yml:ci:Build"],
  },
} as Parameters<typeof evidenceReconciliationFromSources>[0]["packageJson"];

function reconcile(ciSources: readonly string[]): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    featureSources: [feature],
    untaggedScenarios: [],
    packageJson,
    ciSources,
    ciSourceNames: ciSources.map(() => "ci.yml"),
    reconcilerInvocation: "spec-controller balance",
    runtimeObservations: [],
    deferralTags: [],
  });
}

describe("[SCN-USG-018] candidates, runners, the reconciler and the excluded sum to the steps read", () => {
  it("carries the count of each disposition, and as many steps accounted for as it read", () => {
    const { summary } = reconcile([ci]);
    expect(summary.stepAccounting).toStrictEqual({
      stepsRead: 10,
      candidates: 4,
      runners: 1,
      reconciler: 2,
      excluded: 3,
      accountedFor: 10,
    });
  });

  it("carries no step accounting where the run read no CI configuration", () => {
    const { summary } = reconcile([]);
    expect(summary).not.toHaveProperty("stepAccounting");
  });
});
