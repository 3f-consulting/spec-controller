import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";

export const jsonReportOf = (reconciliation: Partial<EvidenceReconciliation>): string => `${JSON.stringify(reconciliation, null, 2)}\n`;
