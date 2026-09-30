import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";

const annotatedCorpus = `@CVT
Feature: an annotated target's fitness corpus

  Rule: the tree stays inside its thresholds

    @fitness @SCN-CVT-001
    Scenario: the codebase stays under its complexity threshold

    @fitness @SCN-CVT-002
    Scenario: every feature file carries a registered header code
`;

const manifest = {
  scripts: { "lint:alpha": "eslint", "lint:beta": "scn-subissues" },
  specController: {
    notChecks: ["ci.yml:quality:Checkout"],
    fitnessChecks: [
      { scn: "SCN-CVT-001", command: "pnpm lint:alpha" },
      { scn: "SCN-CVT-002", command: "pnpm lint:beta" },
    ],
  },
};

const annotatedCi = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Complexity
        id: SCN-CVT-001
        run: pnpm lint:alpha
      - name: Traceability
        run: pnpm lint:beta
`;

function reconcileAnnotated(): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    featureSources: [annotatedCorpus],
    untaggedScenarios: [],
    packageJson: manifest,
    ciSources: [annotatedCi],
    ciSourceNames: ["ci.yml"],
    runtimeObservations: [],
    deferralTags: [],
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

describe("[SCN-LNT-031] a check step stating its row's code supplies that row's citation", () => {
  it("credits the row the annotated step names and leaves the unannotated check in suspense", () => {
    expect(rowsOf(reconcileAnnotated())).toEqual([
      ["SCN-CVT-001", "scenario", "balanced", [[undefined, "satisfied"]]],
      ["SCN-CVT-002", "scenario", "out-of-balance", [[undefined, "missing"]]],
      ["(no scenario)", "suspense-scenario", "out-of-balance", [["lint:beta", "cites-no-scenario"]]],
    ]);
  });

  it("stamps the credited run with the @SCN its step states, beside the handle that ran", () => {
    const credited = reconcileAnnotated().ledger.scenarioReconciliations.find(
      (row) => row.scnId === "SCN-CVT-001"
    );
    expect(credited?.evidenceObservations).toEqual([
      {
        qualityCheck: "fitness",
        staticCheck: "lint:alpha",
        exists: true,
        enforcedOverRealSource: true,
        scnId: "SCN-CVT-001",
      },
    ]);
  });
});
