import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";

const ci = `name: fixture CI
jobs:
  ci:
    steps:
      - name: Dump this run's step record
        env:
          STEPS_JSON: \${{ toJSON(steps) }}
        run: printf '%s' "$STEPS_JSON" > ci-steps.json
      - name: Self-reconciliation balance
        run: pnpm exec spec-controller balance --features features --ci .github/workflows
      - name: Sweep check
        run: pnpm lint:sweep
`;

const ciWithoutReconciler = `name: fixture CI
jobs:
  ci:
    steps:
      - name: Sweep check
        run: pnpm lint:sweep
`;

const feature = `Feature: fixture

  @unit @SCN-FIX-001
  Scenario: a fixture behaviour
    Given a fixture
`;

const packageJson = {
  scripts: { "lint:sweep": "madge --circular" },
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
    reconcilerInvocation: "spec-controller balance",
    runtimeObservations: [],
    deferralTags: [],
  });
}

describe("[SCN-USG-014] the balance step and its step-record dump are not candidates, and no configuration says so", () => {
  it("accounts for both steps as the reconciler by their qualified names, keeps the ordinary check on the books, and names nothing excluded", () => {
    const { summary } = reconcile([ci], ["ci.yml"]);
    expect(summary.reconcilerSteps).toStrictEqual([
      { step: "ci.yml:ci:Dump this run's step record", role: "records" },
      { step: "ci.yml:ci:Self-reconciliation balance", role: "reconciles" },
    ]);
    expect(summary.discoveryScope).toStrictEqual([
      { source: "ci.yml", job: "ci", steps: 3, candidates: 1 },
    ]);
    expect(summary).not.toHaveProperty("excludedSteps");
  });

  it("labels each reconciler step by its identity when the target gives no workflow names", () => {
    const { summary } = reconcile([ci]);
    expect(summary.reconcilerSteps).toStrictEqual([
      { step: "Dump this run's step record", role: "records" },
      { step: "Self-reconciliation balance", role: "reconciles" },
    ]);
  });

  it("carries no reconciler account for a pipeline that runs no reconciliation", () => {
    const { summary } = reconcile([ciWithoutReconciler], ["ci.yml"]);
    expect(summary).not.toHaveProperty("reconcilerSteps");
  });
});
