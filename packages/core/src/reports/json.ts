import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";

export const jsonReportOf = (reconciliation: EvidenceReconciliation): string => `${JSON.stringify(reconciliation, null, 2)}\n`;
