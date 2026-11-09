import { describe, it, expect } from "vitest";
import { reconcilingItemsOf } from "./claimReconciliation.js";
import { reconcile } from "./evidenceReconciliation.js";
import type {
  Scenario,
  EvidenceObservation,
} from "../model.js";

describe("[CLM-WRN-001] a scenario naming no evidence obligations is reported as a no-quality-check reconciliation", () => {

  it("keeps a scenario that DOES name an evidenceObligation on the verdict axis, alongside a no-quality-check scenario (the WITH-evidenceObligations path is untouched)", () => {
    const scenarios: Scenario[] = [
      { claimCode: "CLM-WRN-001", evidenceObligations: [] },
      { claimCode: "CLM-WRN-002", evidenceObligations: [{ qualityCheckKind: "unit" }] },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheckKind: "unit", claimCode: "CLM-WRN-002", status: "passed" },
    ];

    const balance = reconcile(scenarios, evidenceObservations);

    const noQualityCheck = balance.claimReconciliations.find((s) => s.claim === "CLM-WRN-001");
    expect(reconcilingItemsOf(noQualityCheck!)).toEqual([{ outcome: "no-quality-check" }]);
    const verdictScenario = balance.claimReconciliations.find((s) => s.claim === "CLM-WRN-002");
    expect(verdictScenario?.verdict).toBe("balanced");
    expect(balance.claimReconciliations.map((s) => s.claim)).toEqual([
      "CLM-WRN-001",
      "CLM-WRN-002",
    ]);
  });
});
