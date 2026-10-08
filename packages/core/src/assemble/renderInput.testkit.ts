import { reconcile } from "../domain/evidenceReconciliation.js";
import type { Ledger } from "../model.js";

export const reportLedger: Ledger = reconcile(
  [
    { scnId: "SCN-RMD-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    { scnId: "SCN-RMD-002", evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration" }] },
  ],
  [{ qualityCheck: "unit", scnId: "SCN-RMD-001", status: "passed" }],
);
