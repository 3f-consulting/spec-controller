import { describe, it, expect } from "vitest";
import { reconcile } from "./evidenceReconciliation.js";
import { parseScenarios } from "../parse/scenarios.js";

const CORPUS_LINES = [
  "@HCV",
  "Feature: a half-declared target's fitness corpus",
  "  Rule: the tree stays inside its thresholds",
  "    @fitness @SCN-HCV-001",
  "    Scenario: the codebase stays under its complexity threshold",
  "    @fitness @SCN-HCV-002",
  "    Scenario: the tree stays above its mutation floor",
];

const creditFor = (scnId: string) => ({
  qualityCheck: "fitness" as const,
  fitnessFunction: scnId,
  scnId,
  exists: true,
  enforcedOverRealSource: true,
  status: "passed" as const,
});

describe("[SCN-LNT-020] a @fitness scenario nothing cites reconciles missing, and its row is out of balance", () => {
  it("answers the cited scenario and leaves the uncited one missing", () => {
    const ledger = reconcile(parseScenarios(CORPUS_LINES.join("\n")), [creditFor("SCN-HCV-001")]);
    const rowOf = (scnId: string) =>
      ledger.scenarioReconciliations.find((row) => row.scnId === scnId);

    expect(rowOf("SCN-HCV-001")?.evidenceObligations).toEqual([{ qualityCheck: "fitness" }]);
    expect(rowOf("SCN-HCV-002")?.evidenceObligations).toEqual([{ qualityCheck: "fitness" }]);

    expect(
      rowOf("SCN-HCV-001")?.qualityCheckReconciliations.map((item) => item.outcome)
    ).toEqual(["satisfied"]);
    expect(rowOf("SCN-HCV-001")?.reconcilingItems).toEqual([]);
    expect(rowOf("SCN-HCV-001")?.verdict).toBe("balanced");

    expect(rowOf("SCN-HCV-002")?.reconcilingItems.map((item) => item.outcome)).toEqual(["missing"]);
    expect(
      rowOf("SCN-HCV-002")?.qualityCheckReconciliations.map((item) => item.outcome)
    ).toEqual(["missing"]);
    expect(rowOf("SCN-HCV-002")?.verdict).toBe("out-of-balance");
  });

  it("leaves a corpus nothing cites at all entirely missing, rather than entirely silent", () => {
    const ledger = reconcile(parseScenarios(CORPUS_LINES.join("\n")), []);
    expect(
      ledger.scenarioReconciliations.map((row) => [
        row.scnId,
        row.verdict,
        row.reconcilingItems.map((item) => item.outcome),
      ])
    ).toEqual([
      ["SCN-HCV-001", "out-of-balance", ["missing"]],
      ["SCN-HCV-002", "out-of-balance", ["missing"]],
    ]);
  });
});
