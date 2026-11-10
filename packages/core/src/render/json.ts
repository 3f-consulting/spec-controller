import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";

export function renderJson(evidenceReconciliation: EvidenceReconciliation): string {
  return `${JSON.stringify(evidenceReconciliation, null, 2)}\n`;
}
