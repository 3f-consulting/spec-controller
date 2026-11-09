const LIST = "claimReconciliations";

export const CLAIM_RECONCILIATIONS_SECTION: string = LIST;

export type ClaimReconciliationsSection<Row> = { readonly [LIST]: Row[] };

export function claimReconciliationsOf<Row>(report: ClaimReconciliationsSection<Row>): Row[];
export function claimReconciliationsOf<Row>(report: unknown): Row[];
export function claimReconciliationsOf<Row>(report: unknown): Row[] {
  return (report as ClaimReconciliationsSection<Row>)[LIST];
}
