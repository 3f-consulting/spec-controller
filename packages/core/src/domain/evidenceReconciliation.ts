import type { ClaimCodeError } from "./claimCodes.js";
import type { ClaimReconciliation, Outcome } from "./claimReconciliation.js";
import type { ConfigurationError } from "./configuration.js";
import type { QualityCheckKind } from "./postEvidenceObligation.js";
import type { EvidenceObservation } from "./postEvidenceObservation.js";
import type { Provenance } from "./provenance.js";

export type RunVerdict =
  | { readonly verdict: "balanced" }
  | { readonly verdict: "out-of-balance" }
  | { readonly verdict: "not-reconciled"; readonly why: "unsound" | "claim-code-errors" | "nothing-to-reconcile" };

// One row of the Quality Check Reconciliations by kind. Every outcome has a count, zero included.
export interface QualityCheckCounts {
  readonly evidenceObligations: number;
  readonly evidenceObservations: number;
  readonly byOutcome: Readonly<Record<Outcome, number>>;
}

export interface Totals {
  readonly claimReconciliations: {
    readonly total: number;
    readonly balanced: number;
    readonly outOfBalance: number;
  };
  readonly qualityCheckReconciliations: {
    readonly byKind: readonly ({ readonly kind: QualityCheckKind } & QualityCheckCounts)[];
    readonly noKind: QualityCheckCounts;
    readonly all: QualityCheckCounts;
  };
  readonly evidenceObservations: {
    readonly total: number;
    readonly onExecutableClaim: number;
    readonly onPhantomClaim: number;
    readonly onUnnamedClaim: number;
  };
  readonly outOfBalanceByFeature?: readonly { readonly file: string; readonly count: number }[];
  readonly excludedClaimCodeOccurrences: number;
}

export interface StepCounts {
  readonly stepsRead: number;
  readonly runners: number;
  readonly reconcilerSteps: number;
  readonly nonChecks: number;
  readonly plumbing: number;
  readonly candidates: number;
}

export interface StepAccount {
  readonly jobs: readonly ({ readonly workflow: string; readonly job: string } & StepCounts)[];
  readonly total: StepCounts & { readonly accountedFor: number };
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

export function runVerdictOf(claimReconciliations: readonly ClaimReconciliation[]): RunVerdict {
  return { verdict: claimReconciliations.every(({ verdict }) => verdict === "balanced") ? "balanced" : "out-of-balance" };
}
