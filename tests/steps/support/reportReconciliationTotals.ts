const SECTION = "reconciliationTotals";

// Where a refusal names the section, from the report's top.
export const RECONCILIATION_TOTALS_PATH: string = `summary.${SECTION}`;

interface ReconciliationTotalsOnReport {
  readonly claimReconciliations: Readonly<Record<string, number>>;
  readonly reconciliationLines: {
    readonly total: number;
    readonly byOutcome: Readonly<Record<string, number>>;
    readonly outOfBalance: number;
    readonly missingByQualityCheckKind: readonly unknown[];
  };
  readonly pending: number;
}

type ReconciliationTotalsSection<Totals> = { readonly [SECTION]: Totals };

export function reconciliationTotalsOf(report: unknown): ReconciliationTotalsOnReport {
  return (report as { readonly summary: ReconciliationTotalsSection<ReconciliationTotalsOnReport> }).summary[SECTION];
}

export function reconciliationTotalsSection<Totals>(totals: Totals): ReconciliationTotalsSection<Totals> {
  return { [SECTION]: totals };
}

export function withReconciliationTotals<Report extends { readonly summary: object }>(report: Report, totals: unknown): Report {
  return { ...report, summary: { ...report.summary, [SECTION]: totals } };
}

export function withReconciliationTotalsUnderEarlierKey<Report extends { readonly summary: object }>(report: Report): Report {
  const { [SECTION]: totals, ...summary } = report.summary as ReconciliationTotalsSection<unknown>;
  return { ...report, summary: { ...summary, evidenceReconciliation: totals } };
}
