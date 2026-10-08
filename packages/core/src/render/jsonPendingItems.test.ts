import { describe, it, expect } from "vitest";
import { renderJson } from "./json.js";
import type { Ledger } from "../model.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { adopterReportCtx as ctx } from "./runContext.testkit.js";
import { __er } from "../evidenceReconciliation.testkit.js";

describe("[SCN-PND-010] the JSON report carries a scenario's Pending Items", () => {
  const pendingBalance: Ledger = reconcile(
    [{ scnId: "SCN-PDX-001", evidenceObligations: [{ qualityCheck: "integration", pending: true }] }],
    [],
  );

  it("serialises a scenario's pendingItems on its ledger account row (glue-free consistency with markdown)", () => {
    const parsed = JSON.parse(renderJson(__er(pendingBalance), ctx));
    const row = parsed.ledger.scenarioReconciliations.find((s: { scnId: string }) => s.scnId === "SCN-PDX-001");
    expect(row).toBeDefined();
    expect(row.pendingItems).toEqual([{ qualityCheck: "integration" }]);
    expect(row.reconcilingItems).toEqual([]);
  });
});

describe("[SCN-PND-011] the JSON summary carries the Pending Items tally", () => {
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
    ],
    [],
  );

  it("serialises summary.pending counting the Pending Items (glue-free consistency with markdown)", () => {
    const parsed = JSON.parse(renderJson(__er(pendingBalance), ctx));
    expect(parsed.summary.pending).toBe(3);
    expect(parsed.summary.scenarioReconciliations.balanced).toBe(1);
    expect(parsed.summary.scenarioReconciliations.outOfBalance).toBe(1);
    expect(parsed.summary.evidenceObligations.byOutcome).not.toHaveProperty("pending");
  });
});
