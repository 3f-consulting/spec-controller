import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";

const corpus = `@FIT
Feature: a target's fitness corpus
  Rule: the tree stays inside its thresholds
    @fitness @SCN-AAA-001
    Scenario: the codebase stays under its complexity threshold
`;

const manifest = {
  scripts: {
    "lint:alpha": "eslint",
    "lint:beta": "scn-subissues",
    typecheck: "tsc --noEmit",
  },
  specController: {
    staticChecks: ["typecheck"],
    notChecks: ["ci.yml:quality:Checkout", "ci.yml:quality:Install"],
  },
};

const partlyAnnotatedCi = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Install
        run: pnpm install --frozen-lockfile
      - name: Complexity
        id: SCN-AAA-001
        run: pnpm lint:alpha
      - name: Traceability
        run: pnpm lint:beta
      - name: Types
        run: pnpm typecheck
`;

function reconcileWithRecord(): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    featureSources: [corpus],
    untaggedScenarios: [],
    packageJson: manifest,
    ciSources: [partlyAnnotatedCi],
    ciSourceNames: ["ci.yml"],
    runtimeObservations: [],
    deferralTags: [],
    ciStepRecord: { "SCN-AAA-001": { outcome: "success", conclusion: "success" } },
  });
}

function rowsOf(reconciliation: EvidenceReconciliation) {
  return reconciliation.ledger.scenarioReconciliations.map((row) => [
    row.scnId,
    row.kind,
    row.verdict,
    row.qualityCheckReconciliations.map((item) => [item.staticCheck, item.outcome]),
  ]);
}

describe("[SCN-LNT-029] a check step citing no @SCN posts to suspense, which is the unannotated consumer's whole report", () => {
  it("keeps every uncited check on the suspense row where the run's step record answers the cited ones", () => {
    const suspense = rowsOf(reconcileWithRecord()).filter(([scnId]) => scnId === "(no scenario)");
    expect(suspense).toEqual([
      [
        "(no scenario)",
        "suspense-scenario",
        "out-of-balance",
        [
          ["lint:beta", "cites-no-scenario"],
          ["typecheck", "cites-no-scenario"],
        ],
      ],
    ]);
  });
});
