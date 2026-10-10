export type QualityCheck = "fitness" | "unit" | "integration" | "e2e" | "performance";

export type RuntimeQualityCheck = Exclude<QualityCheck, "fitness">;

export interface EvidenceObligation {
  qualityCheck?: QualityCheck;
  pending?: boolean;
}

export interface Scenario {
  scnId: string;
  evidenceObligations: EvidenceObligation[];
}

export function evidenceObligationPairsOf(scenarios: readonly Scenario[]): Set<string> {
  const pairs = new Set<string>();
  for (const scenario of scenarios) {
    for (const obligation of scenario.evidenceObligations) {
      if (obligation.pending === true) continue;
      pairs.add(evidenceObligationPairKey(scenario.scnId, obligation.qualityCheck));
    }
  }
  return pairs;
}

export function evidenceObligationPairKey(
  scnId: string,
  qualityCheck: QualityCheck | undefined
): string {
  return `${scnId} ${qualityCheck}`;
}

export function evidenceObligationsOf(
  evidenceObligations: readonly EvidenceObligation[]
): EvidenceObligation[] {
  return evidenceObligations.filter((obligation) => !obligation.pending);
}

export function pendingItemsOf(scenario: Scenario): PendingItem[] {
  return scenario.evidenceObligations
    .filter((obligation) => obligation.pending)
    .map((obligation) => ({ qualityCheck: obligation.qualityCheck }));
}

export type EvidenceStatus = "passed" | "failed";

export interface RuntimeEvidenceObservation {
  qualityCheck: RuntimeQualityCheck;
  scnId: string | null;
  status: EvidenceStatus;
  locator?: string;
  broken?: true;
  message?: string;
}

export interface FitnessEvidenceObservation {
  qualityCheck: "fitness";
  fitnessFunction: string;
  scnId?: string;
  exists: boolean;
  enforcedOverRealSource: boolean;
  status?: EvidenceStatus;
  broken?: true;
  message?: string;
  locator?: string;
}

export function isFitnessObservation(
  observation: EvidenceObservation
): observation is FitnessEvidenceObservation {
  return observation.qualityCheck === "fitness";
}

export type EvidenceObservation = RuntimeEvidenceObservation | FitnessEvidenceObservation;

export interface PendingItem {
  qualityCheck?: QualityCheck;
}
