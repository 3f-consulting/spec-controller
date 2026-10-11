import { describe, it, expect, beforeEach } from "vitest";
import type { CiStepRecord } from "../parse/ciStepRecord.js";
import { hasBrokenEvidence } from "../domain/ledger.js";
import type { EvidenceReconciliation } from "./renderInput.js";
import { checkStepReconciler } from "./checkStep.test-utils.js";

const corpus = `@CVT
Feature: a converted target's fitness corpus

  Rule: the tree stays inside its thresholds

    @fitness @SCN-CVT-001
    Scenario: the codebase stays under its complexity threshold

    @fitness @SCN-CVT-002
    Scenario: every scenario in the corpus is traceable to its own sub-issue

    @fitness @SCN-CVT-003
    Scenario: the codebase carries no duplicated block above its threshold

    @fitness @SCN-CVT-004
    Scenario: every documented command is one this repository still ships

    @fitness @SCN-CVT-005
    Scenario: every public export is imported somewhere in the tree
`;

const manifest = {
  scripts: { build: "tsc" },
  specController: {
    notChecks: ["ci.yml:quality:Checkout"],
    fitnessChecks: [
      { scn: "SCN-CVT-001", command: "eslint" },
      { scn: "SCN-CVT-002", command: "scn-subissues" },
      { scn: "SCN-CVT-003", command: "jscpd" },
      { scn: "SCN-CVT-004", command: "doc-audit" },
      { scn: "SCN-CVT-005", command: "knip" },
    ],
  },
};

const ci = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Complexity
        id: SCN-CVT-001
        if: always()
        run: eslint
      - name: Traceability
        id: SCN-CVT-002
        if: always()
        run: scn-subissues
      - name: Duplication
        id: SCN-CVT-003
        if: always()
        run: jscpd
      - name: Doc accuracy
        id: SCN-CVT-004
        if: always()
        run: doc-audit
      - name: Unused exports
        id: SCN-CVT-005
        if: always()
        run: knip
      - name: Dump this run's step record
        id: dump-the-step-record
        if: always()
        env:
          STEPS_JSON: \${{ toJSON(steps) }}
        run: printf '%s' "$STEPS_JSON" > ci-steps.json
`;

const record: CiStepRecord = {
  "SCN-CVT-001": { outcome: "success", conclusion: "success" },
  "SCN-CVT-002": { outcome: "failure", conclusion: "failure" },
  "SCN-CVT-003": { outcome: "skipped", conclusion: "skipped" },
  "SCN-CVT-004": { outcome: "neutral", conclusion: "neutral" },
  "SCN-CVT-005": { conclusion: "success" },
  "dump-the-step-record": { outcome: "success", conclusion: "success" },
};

let reconcile: ReturnType<typeof checkStepReconciler>;
beforeEach(() => {
  reconcile = checkStepReconciler(corpus, manifest, ci, record);
});

function scenarioRows(reconciliation: EvidenceReconciliation): [string, string, unknown[]][] {
  return reconciliation.ledger.scenarioReconciliations
    .filter((row) => row.kind === "scenario")
    .map((row) => [
      row.scnId,
      row.verdict,
      row.qualityCheckReconciliations.map((item) => [item.fitnessFunction, item.outcome]),
    ]);
}

function suspenseItemsOf(reconciliation: EvidenceReconciliation): unknown[] {
  const row = reconciliation.ledger.scenarioReconciliations.find(
    (r) => r.kind === "suspense-scenario"
  );
  return (row?.qualityCheckReconciliations ?? []).map((item) => [item.outcome, item.message]);
}

describe("[SCN-LNT-026] a check step's outcome credits its row only where it says what the check did", () => {
  it("credits the step that succeeded and the step that failed, and none of the other three", () => {
    expect(scenarioRows(reconcile())).toEqual([
      ["SCN-CVT-001", "balanced", [[undefined, "satisfied"]]],
      ["SCN-CVT-002", "out-of-balance", [[undefined, "failing"]]],
      ["SCN-CVT-003", "out-of-balance", [[undefined, "missing"]]],
      ["SCN-CVT-004", "out-of-balance", [[undefined, "missing"]]],
      ["SCN-CVT-005", "out-of-balance", [[undefined, "missing"]]],
    ]);
  });

  it("carries the failed step's verdict on its own observation, because nothing else carries it", () => {
    const failed = reconcile().ledger.scenarioReconciliations.find(
      (row) => row.scnId === "SCN-CVT-002"
    );
    expect(failed?.qualityCheckReconciliations[0]?.evidenceObservation).toEqual({
      qualityCheck: "fitness",
      fitnessFunction: "SCN-CVT-002",
      scnId: "SCN-CVT-002",
      exists: true,
      enforcedOverRealSource: true,
      status: "failed",
    });
  });

  it("stamps the run unsound, naming each step it has no reading for and what the record said", () => {
    const reconciliation = reconcile();
    expect(
      hasBrokenEvidence({ scenarioReconciliations: reconciliation.ledger.scenarioReconciliations })
    ).toBe(true);
    expect(suspenseItemsOf(reconciliation)).toEqual([
      [
        "broken",
        "SCN-CVT-003: the CI run's record says this check's step was skipped — so the check did not run.",
      ],
      [
        "broken",
        "SCN-CVT-004: the CI run's record says this check's step ended `neutral` — so the check " +
          "did not run.",
      ],
      [
        "broken",
        "SCN-CVT-005: the CI run's record carries no outcome for this check's step — so the check " +
          "did not run.",
      ],
    ]);
  });

  it("posts each step it has no reading for as an observation that claims no check exists or ran", () => {
    const suspense = reconcile().ledger.scenarioReconciliations.find(
      (row) => row.kind === "suspense-scenario"
    );
    expect(
      suspense?.evidenceObservations.map((o) => [
        o.scnId,
        "exists" in o ? o.exists : undefined,
        "enforcedOverRealSource" in o ? o.enforcedOverRealSource : undefined,
        o.broken,
      ])
    ).toEqual([
      ["SCN-CVT-003", false, false, true],
      ["SCN-CVT-004", false, false, true],
      ["SCN-CVT-005", false, false, true],
    ]);
  });

  it("counts TWO running fitness functions over a record holding five check steps", () => {
    expect(reconcile().summary.fitnessFunctions).toEqual({
      runningFitnessFunctionCount: 2,
      uncitedFitnessFunctionCount: 0,
    });
  });
});
