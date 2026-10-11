import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";
import { rowsOf } from "./checkStep.test-utils.js";

const severedCorpus = `@CVT
Feature: a target's fitness corpus, two of whose five checks the job's verdict does not depend on

  Rule: the tree stays inside its thresholds

    @fitness @SCN-CVT-001
    Scenario: the codebase stays under its complexity threshold

    @fitness @SCN-CVT-002
    Scenario: every scenario is matched by a sub-issue

    @fitness @SCN-CVT-003
    Scenario: the domain holds its own behaviour

    @fitness @SCN-CVT-004
    Scenario: every module stays under its size threshold

    @fitness @SCN-CVT-005
    Scenario: every dependency is on the allowed list
`;

const severedManifest = {
  scripts: {
    "lint:alpha": "eslint",
    "lint:beta": "scn-subissues",
    "lint:gamma": "anemic-domain",
    "lint:delta": "module-size",
    "lint:epsilon": "dependency-allowlist",
  },
  specController: {
    notChecks: ["ci.yml:quality:Checkout"],
    fitnessChecks: [
      { scn: "SCN-CVT-001", command: "pnpm lint:alpha" },
      { scn: "SCN-CVT-002", command: "pnpm lint:beta" },
      { scn: "SCN-CVT-003", command: "pnpm lint:gamma" },
      { scn: "SCN-CVT-004", command: "pnpm lint:delta" },
      { scn: "SCN-CVT-005", command: "pnpm lint:epsilon" },
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
      - name: Module size
        id: SCN-CVT-004
        continue-on-error: false
        run: pnpm lint:delta
  advisory:
    continue-on-error: true
    steps:
      - name: Scenario sub-issue match
        id: SCN-CVT-002
        run: pnpm lint:beta
  allowlist:
    continue-on-error: "false"
    steps:
      - name: Dependency allowlist
        id: SCN-CVT-005
        run: pnpm lint:epsilon
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

describe("[SCN-LNT-032] a check the job's verdict does not depend on reconciles as the watermelon", () => {
  it("reads the watermelon off both carriers of the severance and leaves the siblings satisfied, continue-on-error written false included", () => {
    expect(rowsOf(reconcileSevered())).toEqual([
      ["SCN-CVT-001", "scenario", "out-of-balance", [[undefined, "watermelon"]]],
      ["SCN-CVT-002", "scenario", "out-of-balance", [[undefined, "watermelon"]]],
      ["SCN-CVT-003", "scenario", "balanced", [[undefined, "satisfied"]]],
      ["SCN-CVT-004", "scenario", "balanced", [[undefined, "satisfied"]]],
      ["SCN-CVT-005", "scenario", "balanced", [[undefined, "satisfied"]]],
    ]);
  });

  it("still OBSERVES a severed check, as one that exists and enforces nothing", () => {
    const observed = reconcileSevered()
      .ledger.scenarioReconciliations.filter((row) => row.scnId === "SCN-CVT-001" || row.scnId === "SCN-CVT-002")
      .flatMap((row) => row.evidenceObservations);
    expect(observed).toEqual([
      {
        qualityCheck: "fitness",
        fitnessFunction: "lint:alpha",
        exists: true,
        enforcedOverRealSource: false,
        scnId: "SCN-CVT-001",
      },
      {
        qualityCheck: "fitness",
        fitnessFunction: "lint:beta",
        exists: true,
        enforcedOverRealSource: false,
        scnId: "SCN-CVT-002",
      },
    ]);
  });
});
