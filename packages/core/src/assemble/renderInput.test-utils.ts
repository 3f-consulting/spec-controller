import { reconcile } from "../domain/evidenceReconciliation.js";
import type { Ledger } from "../model.js";

export function reportLedger(): Ledger {
  return reconcile(
    [
      { scnId: "SCN-RMD-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
      { scnId: "SCN-RMD-002", evidenceObligations: [{ qualityCheckKind: "unit" }, { qualityCheckKind: "integration" }] },
    ],
    [{ qualityCheckKind: "unit", scnId: "SCN-RMD-001", status: "passed" }],
  );
}
