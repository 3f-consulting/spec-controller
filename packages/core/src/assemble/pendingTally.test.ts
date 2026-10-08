import { describe, it, expect } from "vitest";
import { assembleRenderInput } from "./renderInput.js";
import { renderJson } from "../render/json.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import type { Ledger } from "../model.js";
import { reportCtx as ctx } from "./runContext.testkit.js";
import { reportLedger } from "./renderInput.testkit.js";
import { __er } from "../evidenceReconciliation.testkit.js";

describe("[SCN-PND-011] the summary materialises a Pending Items tally, separate from the verdict counts", () => {
  const pendingBalance: Ledger = reconcile(
    [
      {
        scnId: "SCN-PDX-001",
        evidenceObligations: [
          { qualityCheck: "unit", pending: true },
          { qualityCheck: "integration", pending: true },
        ],
      },
      {
        scnId: "SCN-PDX-002",
        evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration", pending: true }],
      },
      { scnId: "SCN-PDX-003", evidenceObligations: [{ qualityCheck: "unit" }] },
    ],
    [{ qualityCheck: "unit", scnId: "SCN-PDX-003", status: "passed" }],
  );

  it("materialises summary.pending counting Pending Items across the rows", () => {
    const report = assembleRenderInput(__er(pendingBalance), ctx);
    expect(report.summary.pending).toBe(3);
  });

  it("counts Pending ITEMS, not scenarios carrying them (one row alone carries two)", () => {
    const report = assembleRenderInput(__er(pendingBalance), ctx);
    const scenariosCarryingPending = pendingBalance.scenarioReconciliations.filter(
      (s) => (s.pendingItems ?? []).length > 0
    ).length;
    expect(scenariosCarryingPending).toBe(2);
    expect(report.summary.pending).not.toBe(scenariosCarryingPending);
  });

  it("keeps the tally SEPARATE from the scenario balanced / out-of-balance counts", () => {
    const report = assembleRenderInput(__er(pendingBalance), ctx);
    expect(report.summary.scenarioReconciliations).toEqual({ total: 3, balanced: 2, outOfBalance: 1, phantom: 0, suspense: 0 });
    expect(report.summary.pending).not.toBe(report.summary.scenarioReconciliations.balanced);
    expect(report.summary.pending).not.toBe(report.summary.scenarioReconciliations.outOfBalance);
  });

  it("NEVER folds a Pending Item into the evidence-obligation counts (never an out-of-balance outcome, at any count)", () => {
    const report = assembleRenderInput(__er(pendingBalance), ctx);
    expect(report.summary.evidenceObligations.total).toBe(2);
    expect(report.summary.evidenceObligations.outOfBalance).toBe(1);
    expect(report.summary.evidenceObligations.byOutcome.satisfied).toBe(1);
    expect(report.summary.evidenceObligations.byOutcome.missing).toBe(1);
    expect(report.summary.evidenceObligations.byOutcome).not.toHaveProperty("pending");
  });

  it("is always present — a pure balance derive reading 0 when no scenario names a pending obligation", () => {
    const report = assembleRenderInput(__er(reportLedger), ctx);
    expect(report.summary.pending).toBe(0);
  });

  it("carries the tally through the glue-free JSON serialisation", () => {
    const parsed = JSON.parse(renderJson(__er(pendingBalance), ctx));
    expect(parsed.summary.pending).toBe(3);
  });
});
