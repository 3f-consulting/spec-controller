import { describe, it, expect } from "vitest";
import { parseScenarios } from "../parse/scenarios.js";
import { reconcile } from "./evidenceReconciliation.js";
import { ledgerTally } from "./ledger.js";

describe("[SCN-RMD-008] the missing split carries every quality-check in canonical order", () => {
  const feature = [
    "@RMD",
    "Feature: fixture",
    "  Rule: a fixture rule",
    "    @unit @integration @e2e @performance @fitness @SCN-RMD-008",
    "    Scenario: a fixture scenario",
  ].join("\n");

  it("names fitness, unit, integration, e2e and performance, in that order", () => {
    const tally = ledgerTally(reconcile(parseScenarios(feature), []));

    expect(tally.evidenceObligations.total).toBe(5);
    expect(tally.evidenceObligations.byOutcome.missing).toBe(5);

    expect(tally.evidenceObligations.missingByQualityCheck).toEqual([
      { subject: "fitness", count: 1 },
      { subject: "unit", count: 1 },
      { subject: "integration", count: 1 },
      { subject: "e2e", count: 1 },
      { subject: "performance", count: 1 },
    ]);
  });
});
