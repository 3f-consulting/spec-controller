import { describe, it, expect } from "vitest";
import { parseScenarios } from "../parse/scenarioReaders.test-utils.js";
import { reconcile } from "./evidenceReconciliation.js";
import { ledgerTally } from "./ledger.js";

describe("[SCN-RMD-008] the missing split counts the missing Reconciliation lines by quality check, in canonical order", () => {
  const featureLines = [
    "@RMD",
    "Feature: fixture",
    "  Rule: a fixture rule",
    "    @unit @integration @e2e @performance @fitness @SCN-RMD-008",
    "    Scenario: a fixture scenario",
  ];

  it("names fitness, unit, integration, e2e and performance, in that order", () => {
    const tally = ledgerTally(reconcile(parseScenarios(featureLines.join("\n")), []));

    const totals = tally.qualityCheckReconciliations;
    expect(totals).toMatchObject({ total: 5, byOutcome: { missing: 5 } });

    expect(totals.missingByQualityCheck).toEqual([
      { subject: "fitness", count: 1 },
      { subject: "unit", count: 1 },
      { subject: "integration", count: 1 },
      { subject: "e2e", count: 1 },
      { subject: "performance", count: 1 },
    ]);
  });

  it("counts an obligation answered only by a broken observation as one missing line, beside its broken line", () => {
    const tally = ledgerTally(
      reconcile(
        [{ scnId: "SCN-RMD-008", evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration" }] }],
        [
          { qualityCheck: "unit", scnId: "SCN-RMD-008", status: "failed", broken: true, message: "the test file failed to load" },
          { qualityCheck: "integration", scnId: "SCN-RMD-008", status: "passed" },
        ]
      )
    );

    const totals = tally.qualityCheckReconciliations;
    expect(totals.total).toBe(3);
    expect(totals.byOutcome).toMatchObject({ missing: 1, broken: 1, satisfied: 1 });
    expect(totals.missingByQualityCheck).toEqual([{ subject: "unit", count: 1 }]);
  });
});
