export const QUALITY_CHECKS = ["fitness", "unit", "integration", "e2e", "performance"] as const;

export type QualityCheck = (typeof QUALITY_CHECKS)[number];

export type BehaviouralQualityCheck = Exclude<QualityCheck, "fitness">;

export type EvidenceReportKind = "test-results" | "scenario-runs";

const FALLBACK_QUALITY_CHECK: Readonly<Record<EvidenceReportKind, BehaviouralQualityCheck>> = {
  "test-results": "unit",
  "scenario-runs": "integration",
};

export function fallbackQualityCheckOf(kind: EvidenceReportKind): BehaviouralQualityCheck {
  return FALLBACK_QUALITY_CHECK[kind];
}

const TIERS: ReadonlySet<string> = new Set(
  QUALITY_CHECKS.filter((qualityCheck) => qualityCheck !== "fitness" && qualityCheck !== "unit")
);

export function qualityChecksPostedAt(
  tagNames: readonly string[],
  fallbackQualityCheck: BehaviouralQualityCheck
): BehaviouralQualityCheck[] {
  const qualityChecks: BehaviouralQualityCheck[] = [];
  for (const name of tagNames) {
    if (TIERS.has(name) && !qualityChecks.includes(name as BehaviouralQualityCheck)) {
      qualityChecks.push(name as BehaviouralQualityCheck);
    }
  }
  return qualityChecks.length > 0 ? qualityChecks : [fallbackQualityCheck];
}

export interface EvidenceObligation {
  readonly qualityCheck?: QualityCheck;
  readonly pending?: boolean;
}

export interface Scenario {
  readonly scnId: string;
  readonly evidenceObligations: readonly EvidenceObligation[];
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

export type RunResult = "passed" | "failed" | "never-reached-its-assertions" | "inconclusive";

export interface RunEvidence {
  readonly status: EvidenceStatus;
  readonly broken?: true;
}

export function evidenceOfRunResult(result: RunResult): RunEvidence | undefined {
  if (result === "inconclusive") return undefined;
  if (result === "never-reached-its-assertions") return { status: "failed", broken: true };
  return { status: result };
}

interface SeveralScnCodesNote {
  readonly kind: "several-scn-codes";
  readonly codes: readonly string[];
}

interface AmbiguousStepNote {
  readonly kind: "ambiguous-step";
  readonly step?: string;
}

interface CheckStepDidNotRunNote {
  readonly kind: "check-step-did-not-run";
  readonly code: string;
  readonly outcome?: string;
}

export type ObservationNote = SeveralScnCodesNote | AmbiguousStepNote | CheckStepDidNotRunNote;

export interface BehaviouralEvidenceObservation {
  readonly qualityCheck: BehaviouralQualityCheck;
  readonly scnId: string | null;
  readonly status: EvidenceStatus;
  readonly locator?: string;
  readonly broken?: true;
  readonly message?: string;
  readonly notes?: readonly ObservationNote[];
  readonly testName?: string;
}

export interface FitnessEvidenceObservation {
  readonly qualityCheck: "fitness";
  readonly fitnessFunction: string;
  readonly scnId?: string;
  readonly exists: boolean;
  readonly enforcedOverRealSource: boolean;
  readonly status?: EvidenceStatus;
  readonly broken?: true;
  readonly message?: string;
  readonly notes?: readonly ObservationNote[];
  readonly locator?: string;
}

export function isFitnessObservation(
  observation: EvidenceObservation
): observation is FitnessEvidenceObservation {
  return observation.qualityCheck === "fitness";
}

export type EvidenceObservation = BehaviouralEvidenceObservation | FitnessEvidenceObservation;

export interface PendingItem {
  readonly qualityCheck?: QualityCheck;
}
