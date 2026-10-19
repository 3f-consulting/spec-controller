import { describe, it, expect, beforeEach } from "vitest";
import { runnersReconciler } from "./runnerTiers.test-utils.js";
import { feature } from "../evidenceReconciliation.test-utils.js";

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
      - uses: github/codeql-action/analyze@v3
`;

const scripts = { test: "vitest run", lint: "eslint ." };

let reconcile: ReturnType<typeof runnersReconciler>;
beforeEach(() => {
  reconcile = runnersReconciler(feature, ci, scripts);
});

describe("[SCN-RMD-015] a target with no runners block reports every step of its pipeline but GitHub's plumbing as a candidate", () => {
  it("posts every step of the pipeline but its checkout to the unnamed claim's row, each counted run and uncited, and carries no runner account", () => {
    const { summary, ledger } = reconcile();
    const unnamedClaimRowItems = ledger.claimReconciliations
      .filter((row) => row.kind === "unnamed-claim")
      .flatMap((row) => row.qualityCheckReconciliations.map((item) => [item.fitnessFunction, item.outcome]));
    expect(unnamedClaimRowItems).toStrictEqual([
      ["Install", "cites-no-scenario"],
      ["github/codeql-action/analyze@v3", "cites-no-scenario"],
      ["lint", "cites-no-scenario"],
      ["test", "cites-no-scenario"],
    ]);
    expect(summary.fitnessFunctions).toStrictEqual({ runningFitnessFunctionCount: 4, uncitedFitnessFunctionCount: 4 });
    expect(summary).not.toHaveProperty("behaviouralRunners");
    expect(summary).not.toHaveProperty("tiersWithoutRunner");
    expect(summary).not.toHaveProperty("runnerKeysNotATier");
  });

  it("carries no runner account for a runners block that names no tier", () => {
    const { summary } = reconcile({});
    expect(summary).not.toHaveProperty("behaviouralRunners");
    expect(summary).not.toHaveProperty("tiersWithoutRunner");
  });

  it("carries the step that runs the unit runner for the same pipeline once its runners block names it", () => {
    const { summary } = reconcile({ unit: "vitest" });
    expect(summary.behaviouralRunners).toStrictEqual([
      { tier: "unit", runner: "vitest", step: "Unit tests" },
    ]);
  });
});
