import { describe, it, expect } from "vitest";
import { stepAccountingCi as ci, reconcileStepAccounting as reconcile } from "../evidenceReconciliation.testkit.js";

describe("[SCN-USG-018] candidates, runners, the reconciler and the excluded sum to the steps read", () => {
  it("carries the count of each disposition, and as many steps accounted for as it read", () => {
    const { summary } = reconcile([ci]);
    expect(summary.stepAccounting).toStrictEqual({
      stepsRead: 10,
      candidates: 4,
      runners: 1,
      reconciler: 2,
      excluded: 3,
      accountedFor: 10,
    });
  });

  it("carries no step accounting where the run read no CI configuration", () => {
    const { summary } = reconcile([]);
    expect(summary).not.toHaveProperty("stepAccounting");
  });
});
