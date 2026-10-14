import { describe, it, expect } from "vitest";
import { renderJson } from "../assemble/composers.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { sampleReportCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";

describe("[SCN-LDG-036] a failing test in a file that sorts after a passing one citing the same scenario reads failing", () => {
  it("the JSON report's unit reconciliation reads failing and carries the failed test's evidence observation, with the row out of balance", () => {
    const ledger = reconcile(
      [{ scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [
        { qualityCheck: "unit", scnId: "SCN-AAA-001", status: "passed", locator: "a.test.ts" },
        { qualityCheck: "unit", scnId: "SCN-AAA-001", status: "failed", locator: "z.test.ts" },
      ],
    );
    const row = JSON.parse(renderJson(__er(ledger), ctx)).ledger.scenarioReconciliations[0];
    const unit = row.qualityCheckReconciliations.find((q: { qualityCheck: string }) => q.qualityCheck === "unit");

    expect([unit.outcome, unit.evidenceObservation, row.verdict]).toEqual([
      "failing",
      { qualityCheck: "unit", scnId: "SCN-AAA-001", status: "failed", locator: "z.test.ts" },
      "out-of-balance",
    ]);
  });
});
