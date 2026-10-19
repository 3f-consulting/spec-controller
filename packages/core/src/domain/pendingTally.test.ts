import { describe, it, expect } from "vitest";

import { reconcile } from "./evidenceReconciliation.js";
import { ledgerTally } from "./ledger.js";

describe("[SCN-PND-011] the ledger's tally counts Pending Items apart from balanced and out-of-balance", () => {
  it("counts each Pending Item in pending, while every row keeps its own balanced or out-of-balance verdict", () => {
    const tally = ledgerTally(
      reconcile(
        [
          { scnId: "SCN-PDR-001", evidenceObligations: [{ qualityCheck: "unit" }] },
          {
            scnId: "SCN-PDR-002",
            evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration", pending: true }],
          },
          { scnId: "SCN-PDR-003", evidenceObligations: [{ qualityCheck: "unit" }] },
          {
            scnId: "SCN-PDR-004",
            evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration", pending: true }],
          },
        ],
        [
          { qualityCheck: "unit", scnId: "SCN-PDR-001", status: "passed" },
          { qualityCheck: "unit", scnId: "SCN-PDR-002", status: "passed" },
          { qualityCheck: "unit", scnId: "SCN-PDR-004", status: "failed" },
        ]
      )
    );

    expect(tally.pending).toBe(2);
    expect(tally.claimReconciliations).toMatchObject({ total: 4, balanced: 2, outOfBalance: 2 });
  });

  it("counts a row whose only exceptions are Pending Items as balanced", () => {
    const tally = ledgerTally(
      reconcile(
        [
          {
            scnId: "SCN-PDR-001",
            evidenceObligations: [
              { qualityCheck: "unit", pending: true },
              { qualityCheck: "integration", pending: true },
            ],
          },
        ],
        []
      )
    );

    expect(tally.pending).toBe(2);
    expect(tally.claimReconciliations).toMatchObject({ total: 1, balanced: 1, outOfBalance: 0 });
  });
});
