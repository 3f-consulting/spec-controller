import { describe, it, expect } from "vitest";
import { runnersReconciler } from "./runnerTiers.testkit.js";
import { feature } from "../evidenceReconciliation.testkit.js";

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

const reconcile = runnersReconciler(feature, ci, scripts);

describe("[SCN-USG-017] a target with no runners block reports every step of its pipeline as a candidate", () => {
  it("posts every step of the pipeline to the suspense row, each counted run and uncited, and carries no runner account", () => {
    const { summary, ledger } = reconcile();
    const suspense = ledger.scenarioReconciliations
      .filter((row) => row.kind === "suspense-scenario")
      .flatMap((row) => row.qualityCheckReconciliations.map((item) => [item.staticCheck, item.outcome]));
    expect(suspense).toStrictEqual([
      ["Checkout", "cites-no-scenario"],
      ["Install", "cites-no-scenario"],
      ["github/codeql-action/analyze@v3", "cites-no-scenario"],
      ["lint", "cites-no-scenario"],
      ["test", "cites-no-scenario"],
    ]);
    expect(summary.staticChecks).toStrictEqual({ runningStaticCheckCount: 5, uncitedStaticCheckCount: 5 });
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
