export function claimReconciliationsOf<Row>(report: unknown): Row[] {
  return (report as { claimReconciliations: Row[] }).claimReconciliations;
}
