import { describe, it, expect } from "vitest";
import { reconcilingItemsOf } from "./claimReconciliation.js";
import { reconcile } from "./evidenceReconciliation.js";
import type {
  Scenario,
  EvidenceObservation,
} from "../model.js";

describe("[SCN-WRN-001] a scenario naming no evidence obligations is reported as a both-missing reconciliation", () => {

  it("keeps a scenario that DOES name an evidenceObligation on the verdict axis, alongside a both-missing scenario (the WITH-evidenceObligations path is untouched)", () => {
    const scenarios: Scenario[] = [
      { scnId: "SCN-WRN-001", evidenceObligations: [] },
      { scnId: "SCN-WRN-002", evidenceObligations: [{ qualityCheckKind: "unit" }] },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheckKind: "unit", scnId: "SCN-WRN-002", status: "passed" },
    ];

    const balance = reconcile(scenarios, evidenceObservations);

    const bothMissing = balance.claimReconciliations.find((s) => s.claim === "SCN-WRN-001");
    expect(reconcilingItemsOf(bothMissing!)).toEqual([{ outcome: "both-missing" }]);
    const verdictScenario = balance.claimReconciliations.find((s) => s.claim === "SCN-WRN-002");
    expect(verdictScenario?.verdict).toBe("balanced");
    expect(balance.claimReconciliations.map((s) => s.claim)).toEqual([
      "SCN-WRN-001",
      "SCN-WRN-002",
    ]);
  });
});
