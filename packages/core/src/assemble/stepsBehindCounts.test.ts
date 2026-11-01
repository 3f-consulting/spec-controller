import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";
import type { StepAccounting } from "../domain/evidenceReconciliation.js";
import { everyDispositionPackageJson, feature, nightly, stepAccountingCi } from "../evidenceReconciliation.test-utils.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { parsedWorkflows } from "../parse/parsedWorkflows.test-utils.js";

const setUpAndTestCi = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
      - name: Install
        run: pnpm install --frozen-lockfile
      - name: Unit tests
        run: pnpm test
      - name: Save cache
        uses: actions/cache/save@v4
`;

const testOnlyCi = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Install
        run: pnpm install --frozen-lockfile
      - name: Unit tests
        run: pnpm test
`;

const unitRunner = {
  scripts: { test: "vitest run" },
  specController: { runners: { unit: "vitest" } },
} as Parameters<typeof evidenceReconciliationFromSources>[0]["packageJson"];

function reconcile(
  packageJson: Parameters<typeof evidenceReconciliationFromSources>[0]["packageJson"],
  workflowSources: readonly string[],
  workflowNames: readonly string[]
): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    packageJson,
    ciWorkflows: parsedWorkflows(workflowSources, workflowNames),
    reconcilerInvocation: "spec-controller balance",
    behaviouralObservations: [],
    deferralTags: [],
  });
}

function listLengths({ steps }: StepAccounting): Record<"runners" | "reconciler" | "nonChecks" | "plumbing", number> {
  return {
    runners: steps.runners?.length ?? 0,
    reconciler: steps.reconciler?.length ?? 0,
    nonChecks: steps.nonChecks?.length ?? 0,
    plumbing: steps.plumbing?.length ?? 0,
  };
}

describe("[SCN-RMD-024] the step accounting names the steps behind its runners and plumbing counts, each list holding exactly the steps its count counts", () => {
  it("names the steps that run a declared runner and the plumbing steps under their workflow, job and name, in step order", () => {
    const accounting = reconcile(unitRunner, [setUpAndTestCi], ["ci.yml"]).summary.stepAccounting!;
    expect(accounting.steps.runners).toStrictEqual(["ci.yml:quality:Unit tests"]);
    expect(accounting.steps.plumbing).toStrictEqual([
      "ci.yml:quality:Checkout",
      "ci.yml:quality:Setup Node",
      "ci.yml:quality:Save cache",
    ]);
  });

  it("holds, in each list, as many steps as the total counts for it, over two workflows and three jobs", () => {
    const accounting = reconcile(everyDispositionPackageJson, [stepAccountingCi, nightly], ["ci.yml", "nightly.yml"]).summary
      .stepAccounting!;
    const { runners, reconciler, nonChecks, plumbing } = accounting.total;
    expect({ runners, reconciler, nonChecks, plumbing }).toStrictEqual({
      runners: 1,
      reconciler: 2,
      nonChecks: 3,
      plumbing: 5,
    });
    expect(listLengths(accounting)).toStrictEqual({ runners, reconciler, nonChecks, plumbing });
    expect(accounting.steps.plumbing).toStrictEqual([
      "ci.yml:ci:Checkout tools",
      "ci.yml:ci:Setup Node",
      "ci.yml:ci:Cache store",
      "ci.yml:ci:Download build",
      "ci.yml:ci:Upload report",
    ]);
  });

  it("names no plumbing step for a pipeline with none, and still names its runner", () => {
    const accounting = reconcile(unitRunner, [testOnlyCi], ["ci.yml"]).summary.stepAccounting!;
    expect(accounting.total.plumbing).toBe(0);
    expect(accounting.steps).not.toHaveProperty("plumbing");
    expect(accounting.steps.runners).toStrictEqual(["ci.yml:quality:Unit tests"]);
  });
});

const qualityCi = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Setup Node
        uses: actions/setup-node@v4
      - name: Checkout
        uses: actions/checkout@v4
      - name: Install
        run: pnpm install --frozen-lockfile
      - name: Unit tests
        run: pnpm test
      - name: Reconciliation
        run: pnpm exec spec-controller balance --features features --ci .github/workflows
`;

const sweepThenAuditNightly = `name: fixture nightly
jobs:
  sweep:
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Unit tests
        run: pnpm test
  audit:
    steps:
      - name: Setup Node
        uses: actions/setup-node@v4
      - name: Install
        run: pnpm install --frozen-lockfile
      - name: Reconciliation
        run: pnpm exec spec-controller balance --features features --ci .github/workflows
`;

const twoWorkflowsEveryList = {
  scripts: { test: "vitest run" },
  specController: {
    runners: { unit: "vitest" },
    notChecks: ["nightly.yml:audit:Install", "ci.yml:quality:Install"],
  },
} as Parameters<typeof evidenceReconciliationFromSources>[0]["packageJson"];

describe("[SCN-RMD-026] every list of the steps behind a count follows the step accounting's rows, so reading the workflows in another order changes neither the rows nor the lists", () => {
  it("lists each count's steps by workflow, then by job, and within a job in the order they were read, though the workflows are given against that order", () => {
    const accounting = reconcile(
      twoWorkflowsEveryList,
      [sweepThenAuditNightly, qualityCi],
      ["nightly.yml", "ci.yml"]
    ).summary.stepAccounting!;
    expect(accounting.byJob.map(({ workflow, job }) => `${workflow}:${job}`)).toStrictEqual([
      "ci.yml:quality",
      "nightly.yml:audit",
      "nightly.yml:sweep",
    ]);
    expect(accounting.steps.runners).toStrictEqual(["ci.yml:quality:Unit tests", "nightly.yml:sweep:Unit tests"]);
    expect(accounting.steps.reconciler).toStrictEqual([
      { step: "ci.yml:quality:Reconciliation", role: "reconciles" },
      { step: "nightly.yml:audit:Reconciliation", role: "reconciles" },
    ]);
    expect(accounting.steps.nonChecks).toStrictEqual(["ci.yml:quality:Install", "nightly.yml:audit:Install"]);
    expect(accounting.steps.plumbing).toStrictEqual([
      "ci.yml:quality:Setup Node",
      "ci.yml:quality:Checkout",
      "nightly.yml:audit:Setup Node",
      "nightly.yml:sweep:Checkout",
    ]);
  });

  it("gives the same rows and lists whichever order the workflows are given in", () => {
    const givenAgainstTheOrder = reconcile(
      twoWorkflowsEveryList,
      [sweepThenAuditNightly, qualityCi],
      ["nightly.yml", "ci.yml"]
    ).summary.stepAccounting;
    const givenInTheOrder = reconcile(
      twoWorkflowsEveryList,
      [qualityCi, sweepThenAuditNightly],
      ["ci.yml", "nightly.yml"]
    ).summary.stepAccounting;
    expect(givenAgainstTheOrder).toStrictEqual(givenInTheOrder);
  });
});
