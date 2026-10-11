import type {
  EvidenceObligation,
  EvidenceObservation,
  PendingItem,
} from "./journal.js";
import type { QualityCheckReconciliation } from "./qualityCheckReconciliation.js";
import { bothMissingReconciliation } from "./qualityCheckReconciliation.js";

export type ScenarioVerdict = "balanced" | "out-of-balance";

export type ScenarioKind = "scenario" | "phantom-scenario" | "suspense-scenario";

export interface ScenarioReconciliation {
  readonly scnId: string;
  readonly kind: ScenarioKind;
  readonly verdict: ScenarioVerdict;
  readonly evidenceObservations: readonly EvidenceObservation[];
  readonly evidenceObligations: readonly EvidenceObligation[];
  readonly qualityCheckReconciliations: readonly QualityCheckReconciliation[];
  readonly reconcilingItems: readonly QualityCheckReconciliation[];
  readonly pendingItems: readonly PendingItem[];
}

export function verdictFor(evidenceObligations: QualityCheckReconciliation[]): ScenarioVerdict {
  return reconcilingItemsOf(evidenceObligations).length === 0 ? "balanced" : "out-of-balance";
}

export function reconcilingItemsOf(
  evidenceObligations: QualityCheckReconciliation[]
): QualityCheckReconciliation[] {
  return evidenceObligations.filter((r) => r.outcome !== "satisfied");
}

export function isScenario(row: ScenarioReconciliation): boolean {
  return row.kind === "scenario";
}

export function fitnessFunctionReconciliationsOf(
  row: ScenarioReconciliation
): QualityCheckReconciliation[] {
  return row.qualityCheckReconciliations.filter((r) => r.qualityCheck === "fitness");
}

export function presentFitnessFunctionCountOf(row: ScenarioReconciliation): number {
  return fitnessFunctionReconciliationsOf(row).filter(
    (r) => r.outcome === "satisfied" || r.outcome === "watermelon"
  ).length;
}

export function qualityCheckReconciliationsOf(
  reconciledEvidenceObligations: readonly QualityCheckReconciliation[],
  noEvidenceObligationItems: readonly QualityCheckReconciliation[],
  pendingItems: readonly PendingItem[]
): QualityCheckReconciliation[] {
  const rows = [...reconciledEvidenceObligations, ...noEvidenceObligationItems];
  return rows.length === 0 && pendingItems.length === 0 ? [bothMissingReconciliation()] : rows;
}
