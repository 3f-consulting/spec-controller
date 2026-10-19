import type {
  EvidenceObligation,
  EvidenceObservation,
  PendingItem,
  QualityCheck,
} from "./journal.js";
import { evidenceObligationsOf } from "./journal.js";
import type { QualityCheckReconciliation } from "./qualityCheckReconciliation.js";
import { bothMissingReconciliation } from "./qualityCheckReconciliation.js";

export type Verdict = "balanced" | "out-of-balance";

export type ClaimKind = "scenario" | "phantom-claim" | "unnamed-claim";

export const UNNAMED_CLAIM_ID = "(unnamed claim)";

export interface ClaimReconciliation {
  readonly scnId: string;
  readonly kind: ClaimKind;
  readonly verdict: Verdict;
  readonly evidenceObservations: readonly EvidenceObservation[];
  readonly evidenceObligations: readonly EvidenceObligation[];
  readonly qualityCheckReconciliations: readonly QualityCheckReconciliation[];
  readonly reconcilingItems: readonly QualityCheckReconciliation[];
  readonly pendingItems: readonly PendingItem[];
}

export function verdictFor(evidenceObligations: QualityCheckReconciliation[]): Verdict {
  return reconcilingItemsOf(evidenceObligations).length === 0 ? "balanced" : "out-of-balance";
}

export function reconcilingItemsOf(
  evidenceObligations: QualityCheckReconciliation[]
): QualityCheckReconciliation[] {
  return evidenceObligations.filter((r) => r.outcome !== "satisfied");
}

export function isScenario(row: ClaimReconciliation): boolean {
  return row.kind === "scenario";
}

export function isPhantomClaim(row: ClaimReconciliation): boolean {
  return row.kind === "phantom-claim";
}

export function isUnnamedClaim(row: ClaimReconciliation): boolean {
  return row.kind === "unnamed-claim";
}

export function isOutOfBalance(row: ClaimReconciliation): boolean {
  return row.verdict === "out-of-balance";
}

export function outOfBalanceCountOf(rows: readonly ClaimReconciliation[]): number {
  return rows.filter(isOutOfBalance).length;
}

export function carriesNoScnCode(row: ClaimReconciliation): boolean {
  return row.reconcilingItems.some((item) => item.outcome === "no-scn-code");
}

export function fitnessFunctionReconciliationsOf(
  row: ClaimReconciliation
): QualityCheckReconciliation[] {
  return row.qualityCheckReconciliations.filter((r) => r.qualityCheck === "fitness");
}

export function carriesQualityCheck(row: ClaimReconciliation, qualityCheck: QualityCheck): boolean {
  return (
    row.qualityCheckReconciliations.some((r) => r.qualityCheck === qualityCheck) ||
    row.evidenceObservations.some((o) => o.qualityCheck === qualityCheck)
  );
}

export function namesQualityCheck(row: ClaimReconciliation, qualityCheck: QualityCheck): boolean {
  return evidenceObligationsOf(row.evidenceObligations).some((o) => o.qualityCheck === qualityCheck);
}

export function observationCountOf(row: ClaimReconciliation, qualityCheck: QualityCheck): number {
  return row.evidenceObservations.filter((o) => o.qualityCheck === qualityCheck).length;
}

export function qualityCheckReconciliationsOf(
  reconciledEvidenceObligations: readonly QualityCheckReconciliation[],
  noEvidenceObligationItems: readonly QualityCheckReconciliation[],
  pendingItems: readonly PendingItem[]
): QualityCheckReconciliation[] {
  const rows = [...reconciledEvidenceObligations, ...noEvidenceObligationItems];
  return rows.length === 0 && pendingItems.length === 0 ? [bothMissingReconciliation()] : rows;
}
