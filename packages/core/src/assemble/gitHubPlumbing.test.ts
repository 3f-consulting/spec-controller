import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import { runnersReconciler } from "./runnerTiers.test-utils.js";
import { feature } from "../evidenceReconciliation.test-utils.js";

const ci = `name: fixture CI
jobs:
  quality:
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@1d0ff469b7ec7b3cb9d8673fde0c81c44821de2a # v4.1.0
      - uses: actions/setup-python@main
      - uses: actions/cache/restore@v4
      - uses: actions/cache
      - uses: actions/upload-artifact@v4
      - uses: actions/download-artifact@v4
      - name: Lint
        run: pnpm lint
`;

describe("[SCN-USG-030] a step that only uses one of GitHub's plumbing actions is not a candidate fitness function, whatever ref pins it", () => {
  it("posts only the command check to the suspense row, whatever ref or sub-path each plumbing action carries", () => {
    const { summary, ledger } = runnersReconciler(feature, ci, { lint: "eslint ." })();
    const suspense = ledger.scenarioReconciliations
      .filter((row) => row.kind === "suspense-scenario")
      .flatMap((row) => row.qualityCheckReconciliations.map((item) => [item.fitnessFunction, item.outcome]));
    expect(suspense).toStrictEqual([["lint", "cites-no-scenario"]]);
    expect(summary.fitnessFunctions).toStrictEqual({ runningFitnessFunctionCount: 1, uncitedFitnessFunctionCount: 1 });
  });
});

const nearMissCi = `name: fixture CI
jobs:
  quality:
    steps:
      - uses: actions/checkout@v4
      - uses: actions/dependency-review-action@v4
      - uses: someone/checkout@v1
      - uses: actions/checkout-extra@v1
      - uses: ./.github/actions/lint
      - uses: docker://alpine:3
`;

describe("[SCN-USG-031] an action outside the closed list stays a candidate — dependency review, another owner's look-alike and a local action", () => {
  it("posts every action outside the closed list to the suspense row by its uses: value, and not the checkout", () => {
    const { ledger } = runnersReconciler(feature, nearMissCi, {})();
    const suspense = ledger.scenarioReconciliations
      .filter((row) => row.kind === "suspense-scenario")
      .flatMap((row) => row.qualityCheckReconciliations.map((item) => item.fitnessFunction));
    expect([...suspense].sort()).toStrictEqual([
      "./.github/actions/lint",
      "actions/checkout-extra@v1",
      "actions/dependency-review-action@v4",
      "docker://alpine:3",
      "someone/checkout@v1",
    ]);
  });
});

const namedPlumbingCi = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Fetch
        uses: actions/checkout@v4
      - name: Lint
        run: pnpm lint
`;

describe("[SCN-USG-032] a plumbing step the manifest names a non-check is excluded as the manifest says, and its entry is not stale", () => {
  it("names the step excluded, reports no stale entry, and counts the unnamed checkout as plumbing beside it", () => {
    const packageJson = {
      scripts: { lint: "eslint ." },
      specController: { notChecks: ["ci.yml:quality:Checkout"] },
    } as Parameters<typeof evidenceReconciliationFromSources>[0]["packageJson"];
    const { summary } = evidenceReconciliationFromSources({
      featureSources: [feature],
      untaggedScenarios: [],
      packageJson,
      ciSources: [namedPlumbingCi],
      ciSourceNames: ["ci.yml"],
      behaviouralObservations: [],
      deferralTags: [],
    });
    expect(summary.excludedSteps).toStrictEqual(["ci.yml:quality:Checkout"]);
    expect(summary).not.toHaveProperty("unmatchedNotChecks");
    expect(summary.stepAccounting).toMatchObject({ stepsRead: 3, excluded: 1, plumbing: 1, candidates: 1 });
  });
});
