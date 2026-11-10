import type { ClaimCodeError } from "./claimCodes.js";
import type { ClaimReconciliation, Outcome } from "./claimReconciliation.js";
import type { QualityCheckKind } from "./postEvidenceObligation.js";
import type { EvidenceObservation } from "./postEvidenceObservation.js";

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
