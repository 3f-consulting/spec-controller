import { claimCodeFrom, type ClaimCodeError } from "./claimCodes.js";
import type { ClaimReconciliation, Outcome, QualityCheckReconciliation } from "./claimReconciliation.js";
import type { FeatureAsWritten, QualityCheckKind } from "./postEvidenceObligation.js";
import type { EvidenceObservation, PipelineStep, StepDisposition } from "./postEvidenceObservation.js";

export type RunVerdict =
  | { readonly verdict: "balanced" }
  | { readonly verdict: "out-of-balance" }
  | { readonly verdict: "not-reconciled"; readonly why: "unsound" | "claim-code-errors" | "nothing-to-reconcile" };

interface CountByKind {
  readonly kind: QualityCheckKind;
  readonly count: number;
}

export interface Totals {
  readonly claimReconciliations: {
    readonly total: number;
    readonly balanced: number;
    readonly outOfBalance: number;
  };
  readonly qualityCheckReconciliations: {
    readonly total: number;
    readonly outOfBalance: number;
    readonly byOutcome: readonly { readonly outcome: Exclude<Outcome, "satisfied">; readonly count: number }[];
    readonly missingByKind: readonly CountByKind[];
  };
  readonly evidenceObservations: {
    readonly total: number;
    readonly byKind: readonly CountByKind[];
    readonly onExecutableClaim: number;
    readonly onPhantomClaim: number;
    readonly onUnnamedClaim: number;
    readonly fitnessFunctionsRan: number;
  };
  readonly outOfBalanceByFeature?: readonly { readonly file: string; readonly count: number }[];
  readonly excludedClaimCodeOccurrences: number;
}

interface StepCounts {
  readonly stepsRead: number;
  readonly runners: number;
  readonly reconcilerSteps: number;
  readonly nonChecks: number;
  readonly plumbing: number;
  readonly candidates: number;
}

export interface StepAccount {
  readonly jobs: readonly (StepCounts & { readonly workflow: string; readonly job: string })[];
  readonly total: StepCounts & { readonly accountedFor: number };
}

export interface Provenance {
  readonly target: string;
  readonly sourceSha: string;
  readonly toolSha?: string;
  readonly toolVersion: string;
  readonly inputs: readonly { readonly name: string; readonly path?: string }[];
}

export interface ConfigurationError {
  readonly kind:
    | "configuration-wrong-kind"
    | "configuration-unknown-key"
    | "runner-key-not-a-layer"
    | "not-checks-entry-matches-no-step"
    | "not-checks-entry-not-a-step-name";
  readonly entry: string;
}

export interface ErrorsInTheInputs {
  readonly claimCodeErrors?: readonly ClaimCodeError[];
  readonly configurationErrors?: readonly ConfigurationError[];
}

export interface RunIntegrity {
  readonly neverRan: readonly EvidenceObservation[];
}

export interface EvidenceReconciliation {
  readonly claimReconciliations: readonly ClaimReconciliation[];
  readonly runVerdict: RunVerdict;
  readonly totals: Totals;
  readonly stepAccount?: StepAccount;
  readonly provenance: Provenance;
  readonly errorsInTheInputs?: ErrorsInTheInputs;
  readonly runIntegrity?: RunIntegrity;
}

const qualityCheckReconciliationsOf = (claimReconciliations: readonly ClaimReconciliation[]): QualityCheckReconciliation[] =>
  claimReconciliations.flatMap(({ qualityCheckReconciliations }) => qualityCheckReconciliations);

const isOutOfBalance = ({ verdict }: ClaimReconciliation): boolean => verdict === "out-of-balance";

export function runVerdictOf(
  claimReconciliations: readonly ClaimReconciliation[],
  claimCodeErrors: readonly ClaimCodeError[],
): RunVerdict {
  if (qualityCheckReconciliationsOf(claimReconciliations).some(({ outcome }) => outcome === "never-ran")) {
    return { verdict: "not-reconciled", why: "unsound" };
  }
  if (claimCodeErrors.length > 0) return { verdict: "not-reconciled", why: "claim-code-errors" };
  if (claimReconciliations.length === 0) return { verdict: "not-reconciled", why: "nothing-to-reconcile" };
  return claimReconciliations.some(isOutOfBalance) ? { verdict: "out-of-balance" } : { verdict: "balanced" };
}

function countsBy<T, K>(items: readonly T[], keyOf: (item: T) => K): { readonly key: K; readonly count: number }[] {
  const counts = new Map<K, number>();
  for (const item of items) counts.set(keyOf(item), (counts.get(keyOf(item)) ?? 0) + 1);
  return [...counts].map(([key, count]) => ({ key, count }));
}

const kindCounts = (kinds: readonly QualityCheckKind[]): CountByKind[] =>
  countsBy(kinds, (kind) => kind).map(({ key, count }) => ({ kind: key, count }));

function observedOn(claimReconciliations: readonly ClaimReconciliation[]) {
  return claimReconciliations.flatMap(({ claim, qualityCheckReconciliations }) =>
    qualityCheckReconciliations.flatMap(({ observation }) => (observation === undefined ? [] : [{ claim, observation }])),
  );
}

function outOfBalanceByFeatureOf(claimReconciliations: readonly ClaimReconciliation[]): Totals["outOfBalanceByFeature"] {
  const files = claimReconciliations.filter(isOutOfBalance).flatMap(({ claim }) => (claim.file === undefined ? [] : [claim.file]));
  return files.length === 0 ? undefined : countsBy(files, (file) => file).map(({ key, count }) => ({ file: key, count }));
}

export function excludedClaimCodeOccurrencesOf(features: readonly FeatureAsWritten[]): number {
  const codesIn = (words: readonly string[]): number => words.filter((word) => claimCodeFrom(word) !== undefined).length;
  return features.reduce(
    (sum, { tagFormWords, scenarios }) => sum + codesIn(tagFormWords) - codesIn(scenarios.flatMap(({ tags }) => tags)),
    0,
  );
}

export function totalsOf(claimReconciliations: readonly ClaimReconciliation[], excludedClaimCodeOccurrences: number): Totals {
  const qualityChecks = qualityCheckReconciliationsOf(claimReconciliations);
  const reconciling = qualityChecks.filter(({ outcome }) => outcome !== "satisfied");
  const observed = observedOn(claimReconciliations);
  const outOfBalanceByFeature = outOfBalanceByFeatureOf(claimReconciliations);
  const balanced = claimReconciliations.filter((each) => !isOutOfBalance(each)).length;
  return {
    claimReconciliations: { total: claimReconciliations.length, balanced, outOfBalance: claimReconciliations.length - balanced },
    qualityCheckReconciliations: {
      total: qualityChecks.length,
      outOfBalance: reconciling.length,
      byOutcome: countsBy(reconciling, ({ outcome }) => outcome as Exclude<Outcome, "satisfied">).map(({ key, count }) => ({ outcome: key, count })),
      missingByKind: kindCounts(qualityChecks.flatMap((each) => (each.outcome === "missing" ? [each.kind] : []))),
    },
    evidenceObservations: {
      total: observed.length,
      byKind: kindCounts(observed.map(({ observation }) => observation.kind)),
      onExecutableClaim: observed.filter(({ claim }) => claim.file !== undefined).length,
      onPhantomClaim: observed.filter(({ claim }) => claim.file === undefined && claim.claimCode !== undefined).length,
      onUnnamedClaim: observed.filter(({ claim }) => claim.file === undefined && claim.claimCode === undefined).length,
      fitnessFunctionsRan: observed.filter(({ observation }) => observation.kind === "fitness" && observation.result !== "never-ran").length,
    },
    ...(outOfBalanceByFeature === undefined ? {} : { outOfBalanceByFeature }),
    excludedClaimCodeOccurrences,
  };
}

const NO_STEPS: StepCounts = { stepsRead: 0, runners: 0, reconcilerSteps: 0, nonChecks: 0, plumbing: 0, candidates: 0 };

const COUNTED_AS: Readonly<Record<StepDisposition, keyof StepCounts>> = {
  runner: "runners",
  reconciler: "reconcilerSteps",
  nonCheck: "nonChecks",
  plumbing: "plumbing",
  candidate: "candidates",
};

const added = (counts: StepCounts, count: keyof StepCounts): StepCounts => ({ ...counts, stepsRead: counts.stepsRead + 1, [count]: counts[count] + 1 });

export function stepAccountOf(steps: readonly PipelineStep[], dispositionOf: (step: PipelineStep) => StepDisposition): StepAccount {
  return { jobs: [], total: { stepsRead: -1, runners: -1, reconcilerSteps: -1, nonChecks: -1, plumbing: -1, candidates: -1, accountedFor: -1 } };
}

export interface RunIdentity {
  readonly target?: string;
  readonly origin?: string;
  readonly sourceSha?: string;
  readonly toolSha?: string;
  readonly toolVersion: string;
}

const UNKNOWN = "unknown";

export function provenanceOf(identity: RunIdentity, inputs: Provenance["inputs"]): Provenance {
  return { target: "stub", sourceSha: "stub", toolSha: "stub", toolVersion: "stub", inputs: [] };
}
