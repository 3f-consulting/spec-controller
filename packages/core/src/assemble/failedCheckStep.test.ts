import { describe, it, expect, beforeEach } from "vitest";
import { hasBrokenEvidence } from "../domain/ledger.js";
import type { CiStepRecord } from "../parse/ciStepRecord.js";
import { checkStepReconciler, corpus, manifest } from "./checkStep.testkit.js";

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
      - name: Dump this run's step record
        id: dump-the-step-record
        if: always()
        env:
          STEPS_JSON: \${{ toJSON(steps) }}
        run: printf '%s' "$STEPS_JSON" > ci-steps.json
`;

const record: CiStepRecord = {
  "SCN-CVT-001": { outcome: "failure", conclusion: "failure" },
  "dump-the-step-record": { outcome: "success", conclusion: "success" },
};

let reconcile: ReturnType<typeof checkStepReconciler>;
beforeEach(() => {
  reconcile = checkStepReconciler(corpus, manifest, ci, record);
});

describe("[SCN-LNT-028] a check step the run's record says failed posts a failing observation", () => {
  it("reds the row it names, carrying what the check found, and leaves the run sound", () => {
    const reconciliation = reconcile();

    expect(
      reconciliation.ledger.scenarioReconciliations.map((row) => [
        row.scnId,
        row.kind,
        row.verdict,
        row.qualityCheckReconciliations.map((item) => [item.staticCheck, item.outcome]),
      ])
    ).toEqual([["SCN-CVT-001", "scenario", "out-of-balance", [[undefined, "failing"]]]]);

    const [item] = reconciliation.ledger.scenarioReconciliations[0]!.qualityCheckReconciliations;
    expect(item?.evidenceObservation).toMatchObject({
      qualityCheck: "fitness",
      scnId: "SCN-CVT-001",
    });

    expect(hasBrokenEvidence(reconciliation.ledger)).toBe(false);
  });
});
