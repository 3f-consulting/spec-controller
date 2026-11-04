import type { Summary } from "../domain/evidenceReconciliation.js";

const SECTION = "reconciliationTotals";

export const RECONCILIATION_TOTALS_KEY: string = SECTION;

type ReconciliationTotalsOnReport = Summary[typeof SECTION];

export function reconciliationTotalsOf(report: unknown): ReconciliationTotalsOnReport {
  return (report as { readonly summary: Pick<Summary, typeof SECTION> }).summary[SECTION];
}
