import type {
  EvidenceObligation,
  EvidenceObservation,
  PendingItem,
  BehaviouralQualityCheck,
} from "./journal.js";
import { evidenceObligationsOf } from "./journal.js";
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

export function isPhantomScenario(row: ScenarioReconciliation): boolean {
  return row.kind === "phantom-scenario";
}

export function isSuspenseScenario(row: ScenarioReconciliation): boolean {
  return row.kind === "suspense-scenario";
}

export function isOutOfBalance(row: ScenarioReconciliation): boolean {
  return row.verdict === "out-of-balance";
}

export function outOfBalanceCountOf(rows: readonly ScenarioReconciliation[]): number {
  return rows.filter(isOutOfBalance).length;
}

export function carriesNoScnCode(row: ScenarioReconciliation): boolean {
  return row.reconcilingItems.some((item) => item.outcome === "no-scn-code");
}

export function fitnessFunctionReconciliationsOf(
  row: ScenarioReconciliation
): QualityCheckReconciliation[] {
  return row.qualityCheckReconciliations.filter((r) => r.qualityCheck === "fitness");
}

export function carriesFitnessFunction(row: ScenarioReconciliation): boolean {
  return fitnessFunctionReconciliationsOf(row).length > 0;
}

export function carriesBehaviouralQualityCheck(
  row: ScenarioReconciliation,
  qualityCheck: BehaviouralQualityCheck
): boolean {
  return (
    row.qualityCheckReconciliations.some((r) => r.qualityCheck === qualityCheck) ||
    row.evidenceObservations.some((o) => o.qualityCheck === qualityCheck)
  );
}

export function presentFitnessFunctionCountOf(row: ScenarioReconciliation): number {
  return fitnessFunctionReconciliationsOf(row).filter(
    (r) => r.outcome === "satisfied" || r.outcome === "watermelon"
  ).length;
}

export function namesQualityCheck(row: ScenarioReconciliation, qualityCheck: BehaviouralQualityCheck): boolean {
  return evidenceObligationsOf(row.evidenceObligations).some((o) => o.qualityCheck === qualityCheck);
}

export function observationCountOf(row: ScenarioReconciliation, qualityCheck: BehaviouralQualityCheck): number {
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
