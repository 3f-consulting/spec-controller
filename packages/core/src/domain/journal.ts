export const QUALITY_CHECK_KINDS = ["fitness", "unit", "integration", "e2e", "performance"] as const;

export type QualityCheckKind = (typeof QUALITY_CHECK_KINDS)[number];

export type Layer = Exclude<QualityCheckKind, "fitness">;

export type EvidenceReportKind = "test-results" | "scenario-runs";

const FALLBACK_LAYER: Readonly<Record<EvidenceReportKind, Layer>> = {
  "test-results": "unit",
  "scenario-runs": "integration",
};

export function fallbackLayerOf(kind: EvidenceReportKind): Layer {
  return FALLBACK_LAYER[kind];
}

const NON_UNIT_LAYERS: ReadonlySet<string> = new Set(
  QUALITY_CHECK_KINDS.filter((qualityCheckKind) => qualityCheckKind !== "fitness" && qualityCheckKind !== "unit")
);

export function layersPostedAt(
  tagNames: readonly string[],
  fallbackLayer: Layer
): Layer[] {
  const layers: Layer[] = [];
  for (const name of tagNames) {
    if (NON_UNIT_LAYERS.has(name) && !layers.includes(name as Layer)) {
      layers.push(name as Layer);
    }
  }
  return layers.length > 0 ? layers : [fallbackLayer];
}

export interface EvidenceObligation {
  readonly qualityCheckKind?: QualityCheckKind;
  readonly pending?: boolean;
}

export interface Scenario {
  readonly claimCode: string;
  readonly evidenceObligations: readonly EvidenceObligation[];
  readonly feature?: string;
  readonly title?: string;
}

export function evidenceObligationPairsOf(scenarios: readonly Scenario[]): Set<string> {
  const pairs = new Set<string>();
  for (const scenario of scenarios) {
    for (const obligation of scenario.evidenceObligations) {
      if (obligation.pending === true) continue;
      pairs.add(evidenceObligationPairKey(scenario.claimCode, obligation.qualityCheckKind));
    }
  }
  return pairs;
}

export function evidenceObligationPairKey(
  claimCode: string,
  qualityCheckKind: QualityCheckKind | undefined
): string {
  return `${claimCode} ${qualityCheckKind}`;
}

export function evidenceObligationsOf<T extends { readonly pending?: boolean }>(
  evidenceObligations: readonly T[]
): T[] {
  return evidenceObligations.filter((obligation) => !obligation.pending);
}

export function pendingItemsOf(scenario: Scenario): PendingItem[] {
  return scenario.evidenceObligations
    .filter((obligation) => obligation.pending)
    .map((obligation) => ({ qualityCheckKind: obligation.qualityCheckKind ?? null }));
}

export type EvidenceStatus = "passed" | "failed";

export type RunResult = "passed" | "failed" | "never-reached-its-assertions" | "inconclusive";

export interface RunEvidence {
  readonly status: EvidenceStatus;
  readonly neverRan?: true;
}

export function evidenceOfRunResult(result: RunResult): RunEvidence | undefined {
  if (result === "inconclusive") return undefined;
  if (result === "never-reached-its-assertions") return { status: "failed", neverRan: true };
  return { status: result };
}

interface SeveralClaimCodesNote {
  readonly kind: "several-claim-codes";
  readonly codes: readonly string[];
}

interface SharedClaimCodeNote {
  readonly kind: "shared-claim-code";
  readonly code: string;
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

export type ObservationNote = SeveralClaimCodesNote | SharedClaimCodeNote | AmbiguousStepNote | CheckStepDidNotRunNote;

export interface BehaviouralEvidenceObservation {
  readonly qualityCheckKind: Layer;
  readonly claimCode: string | null;
  readonly status: EvidenceStatus;
  readonly locator?: string;
  readonly neverRan?: true;
  readonly message?: string;
  readonly notes?: readonly ObservationNote[];
  readonly testName?: string;
}

export interface FitnessEvidenceObservation {
  readonly qualityCheckKind: "fitness";
  readonly fitnessFunction: string;
  readonly claimCode?: string;
  /** The CI step it was observed at, as workflow, job and step. */
  readonly step?: string;
  readonly exists: boolean;
  readonly enforcedOverRealSource: boolean;
  readonly status?: EvidenceStatus;
  readonly neverRan?: true;
  readonly message?: string;
  readonly notes?: readonly ObservationNote[];
  readonly locator?: string;
}

export function isFitnessObservation(
  observation: EvidenceObservation
): observation is FitnessEvidenceObservation {
  return observation.qualityCheckKind === "fitness";
}

export function ranAsFitnessFunction(observation: EvidenceObservation): observation is FitnessEvidenceObservation {
  return isFitnessObservation(observation) && observation.neverRan !== true && observation.exists;
}

export type EvidenceObservation = BehaviouralEvidenceObservation | FitnessEvidenceObservation;

export interface PendingItem {
  readonly qualityCheckKind: QualityCheckKind | null;
}
