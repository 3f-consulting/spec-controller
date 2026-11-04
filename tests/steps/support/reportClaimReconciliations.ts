const LIST = "claimReconciliations";

export const CLAIM_RECONCILIATIONS_SECTION: string = LIST;

// Where a refusal names the list, from the report's top.
export const CLAIM_RECONCILIATIONS_PATH: string = LIST;

export type ClaimReconciliationsSection<Row> = { readonly [LIST]: Row[] };

export function claimReconciliationsOf<Row>(report: ClaimReconciliationsSection<Row>): Row[];
export function claimReconciliationsOf<Row>(report: unknown): Row[];
export function claimReconciliationsOf<Row>(report: unknown): Row[] {
  return (report as ClaimReconciliationsSection<Row>)[LIST];
}

export function claimReconciliationsSection<Row>(rows: Row[]): ClaimReconciliationsSection<Row> {
  return { [LIST]: rows };
}

export function withClaimReconciliations<Report extends object>(report: Report, rows: unknown): Report {
  return { ...report, [LIST]: rows };
}

export function withoutClaimReconciliations<Report extends object>(report: Report): Report {
  return { ...report, [LIST]: undefined };
}
