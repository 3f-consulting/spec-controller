import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";

const severedCorpus = `@CVT
Feature: a target's fitness corpus, two of whose three checks the job's verdict does not depend on

  Rule: the tree stays inside its thresholds

    @fitness @SCN-CVT-001
    Scenario: the codebase stays under its complexity threshold

    @fitness @SCN-CVT-002
    Scenario: every scenario is matched by a sub-issue

    @fitness @SCN-CVT-003
    Scenario: the domain holds its own behaviour
`;

const severedManifest = {
  scripts: {
    "lint:alpha": "eslint",
    "lint:beta": "scn-subissues",
    "lint:gamma": "anemic-domain",
  },
  specController: {
    notChecks: ["ci.yml:quality:Checkout"],
    fitnessChecks: [
      { scn: "SCN-CVT-001", command: "pnpm lint:alpha" },
      { scn: "SCN-CVT-002", command: "pnpm lint:beta" },
      { scn: "SCN-CVT-003", command: "pnpm lint:gamma" },
    ],
  },
};

const severedCi = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Complexity
        id: SCN-CVT-001
        continue-on-error: true
        run: pnpm lint:alpha
      - name: Anemic domain
        id: SCN-CVT-003
        run: pnpm lint:gamma
  advisory:
    continue-on-error: true
    steps:
      - name: Scenario sub-issue match
        id: SCN-CVT-002
        run: pnpm lint:beta
`;

function reconcileSevered(): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    featureSources: [severedCorpus],
    untaggedScenarios: [],
    packageJson: severedManifest,
    ciSources: [severedCi],
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

describe("[SCN-LNT-032] a check the job's verdict does not depend on reconciles as the watermelon", () => {
  it("reads the watermelon off both carriers of the severance and leaves the sibling satisfied", () => {
    expect(rowsOf(reconcileSevered())).toEqual([
      ["SCN-CVT-001", "scenario", "out-of-balance", [[undefined, "watermelon"]]],
      ["SCN-CVT-002", "scenario", "out-of-balance", [[undefined, "watermelon"]]],
      ["SCN-CVT-003", "scenario", "balanced", [[undefined, "satisfied"]]],
    ]);
  });

  it("still OBSERVES a severed check, as one that exists and enforces nothing", () => {
    const observed = reconcileSevered()
      .ledger.scenarioReconciliations.filter((row) => row.scnId !== "SCN-CVT-003")
      .flatMap((row) => row.evidenceObservations);
    expect(observed).toEqual([
      {
        qualityCheck: "fitness",
        staticCheck: "lint:alpha",
        exists: true,
        enforcedOverRealSource: false,
        scnId: "SCN-CVT-001",
      },
      {
        qualityCheck: "fitness",
        staticCheck: "lint:beta",
        exists: true,
        enforcedOverRealSource: false,
        scnId: "SCN-CVT-002",
      },
    ]);
  });
});
