import { describe, it, expect } from "vitest";
import { hasBrokenEvidence } from "../domain/ledger.js";
import type { CiStepRecord } from "../parse/ciStepRecord.js";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";

const corpus = `@CVT
Feature: a converted target's fitness corpus

  Rule: the tree stays inside its thresholds

    @fitness @SCN-CVT-001
    Scenario: the codebase stays under its complexity threshold

    @fitness @SCN-CVT-002
    Scenario: every scenario in the corpus is traceable to its own sub-issue
`;

const manifest = {
  scripts: { build: "tsc" },
  specController: {
    notChecks: ["ci.yml:quality:Checkout"],
    fitnessChecks: [
      { scn: "SCN-CVT-001", command: "eslint" },
      { scn: "SCN-CVT-002", command: "scn-subissues" },
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
      - name: Dump this run's step record
        id: dump-the-step-record
        if: always()
        env:
          STEPS_JSON: \${{ toJSON(steps) }}
        run: printf '%s' "$STEPS_JSON" > ci-steps.json
`;

const record: CiStepRecord = {
  "SCN-CVT-001": { outcome: "success", conclusion: "success" },
  "SCN-CVT-002": { outcome: "success", conclusion: "success" },
  "dump-the-step-record": { outcome: "success", conclusion: "success" },
};

function reconcile(): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    featureSources: [corpus],
    untaggedScenarios: [],
    packageJson: manifest,
    ciSources: [ci],
    ciSourceNames: ["ci.yml"],
    runtimeObservations: [],
    deferralTags: [],
    ciStepRecord: record,
  });
}

describe("[SCN-LNT-021] a static check's step the run's record says succeeded credits its own row", () => {
  it("credits each row by the step citing its OWN @SCN, and both balance", () => {
    const reconciliation = reconcile();

    expect(
      reconciliation.ledger.scenarioReconciliations.map((row) => [
        row.scnId,
        row.kind,
        row.verdict,
        row.qualityCheckReconciliations.map((item) => [item.staticCheck, item.outcome]),
      ])
    ).toEqual([
      ["SCN-CVT-001", "scenario", "balanced", [[undefined, "satisfied"]]],
      ["SCN-CVT-002", "scenario", "balanced", [[undefined, "satisfied"]]],
    ]);
  });

  it("carries both facts as OBSERVED and cites the row's own code, no registry standing behind it", () => {
    const [first, second] = reconcile().ledger.scenarioReconciliations;
    expect(first?.qualityCheckReconciliations[0]?.evidenceObservation).toEqual({
      qualityCheck: "fitness",
      staticCheck: "SCN-CVT-001",
      scnId: "SCN-CVT-001",
      exists: true,
      enforcedOverRealSource: true,
      status: "passed",
    });
    expect(second?.qualityCheckReconciliations[0]?.evidenceObservation).toMatchObject({
      staticCheck: "SCN-CVT-002",
      scnId: "SCN-CVT-002",
    });
  });

  it("says nothing at all about the step that wrote the record, and the run is sound and in balance", () => {
    const reconciliation = reconcile();
    expect(reconciliation.ledger.scenarioReconciliations).toHaveLength(2);
    expect(reconciliation.summary.staticChecks).toEqual({
      runningStaticCheckCount: 2,
      uncitedStaticCheckCount: 0,
    });
    expect(hasBrokenEvidence(reconciliation.ledger)).toBe(false);
  });
});
