import { describe, it, expect } from "vitest";
import { reconcilingItemsOf } from "./claimReconciliation.js";

import { reconcile } from "./evidenceReconciliation.js";
import { isBalanced } from "./ledger.js";
import type {
  Scenario,
  EvidenceObservation,
} from "../model.js";

describe("[SCN-PND-008] isBalanced — an Ledger whose only exceptions are Pending Items does not fail", () => {
  it("is balanced over a WHOLE run whose only exceptions are Pending Items — one-sided, run-neutral", () => {
    const scenarios: Scenario[] = [
      { scnId: "SCN-PDR-001", evidenceObligations: [{ qualityCheckKind: "integration", pending: true }] },
      { scnId: "SCN-PDR-002", evidenceObligations: [{ qualityCheckKind: "unit", pending: true }] },
      {
        scnId: "SCN-PDR-003",
        evidenceObligations: [
          { qualityCheckKind: "unit" },
          { qualityCheckKind: "integration", pending: true },
        ],
      },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheckKind: "unit", scnId: "SCN-PDR-003", status: "passed" },
    ];
    const balance = reconcile(scenarios, evidenceObservations);

    const pendingCount = balance.claimReconciliations.flatMap((s) => s.pendingItems ?? []).length;
    expect(pendingCount).toBe(3);
    expect(
      balance.claimReconciliations.every((s) => reconcilingItemsOf(s).length === 0)
    ).toBe(true);

    expect(isBalanced(balance)).toBe(true);
  });
});
