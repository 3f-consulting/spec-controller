// The JSON report's own parts, the contract its readers hold. Each has the shape of the domain type of the same name, and
// a domain change reaches the report only through the mapping in json.ts. The schema is generated from these, so each
// exported name is a definition in it.

// A claim code as written: CLM, a feature code, and a number kept as written, so 001 stays 001.
export interface ClaimCode {
  readonly featureCode: string;
  readonly number: string;
}

export type QualityCheckKind = "fitness" | "unit" | "integration" | "e2e" | "performance";

export interface EvidenceObligation {
  readonly kind: QualityCheckKind;
}

export interface ExecutableClaim {
  readonly claimCode?: ClaimCode;
  readonly file: string;
  readonly title: string;
  readonly obligations: readonly EvidenceObligation[];
}

export interface PhantomClaim {
  readonly claimCode: ClaimCode;
}

// The claim that takes evidence no one executable claim can: it holds nothing.
export interface UnnamedClaim {
  readonly claimCode?: never;
  readonly file?: never;
}

// not-recorded is a step a workflow has that no step record names: balance has no word on how it went.
export type Result = "passed" | "passed-on-error" | "failed" | "never-ran" | "not-recorded";

// place is a file or a CI step; name is a test's title where it has one.
export interface EvidenceObservation {
  readonly cites: readonly ClaimCode[];
  readonly result: Result;
  readonly kind: QualityCheckKind;
  readonly place: string;
  readonly name?: string;
  readonly message?: string;
}

// Each shape names the sides it does not have as never.
interface BothSides {
  readonly outcome: "satisfied" | "failing" | "cannot-fail";
  readonly kind: QualityCheckKind;
  readonly obligation: EvidenceObligation;
  readonly observation: EvidenceObservation;
}

interface ObligationOnly {
  readonly outcome: "missing";
  readonly kind: QualityCheckKind;
  readonly obligation: EvidenceObligation;
  readonly observation?: never;
}

interface UnanswerableObligation {
  readonly outcome: "no-claim-code" | "duplicate-claim-code";
  readonly kind: QualityCheckKind;
  readonly obligation: EvidenceObligation;
  readonly observation?: never;
}

interface NoSides {
  readonly kind?: never;
  readonly obligation?: never;
  readonly observation?: never;
}

interface NoCodeNothingAsked extends NoSides {
  readonly outcome: "no-claim-code";
}

interface ObservationOnly {
  readonly outcome: "not-asked-for" | "cites-unknown-claim" | "cites-no-claim" | "never-ran";
  readonly kind: QualityCheckKind;
  readonly obligation?: never;
  readonly observation: EvidenceObservation;
}

interface NeitherSide extends NoSides {
  readonly outcome: "no-quality-check";
}

export type QualityCheckReconciliation = BothSides | ObligationOnly | UnanswerableObligation | NoCodeNothingAsked | ObservationOnly | NeitherSide;

type Outcome = QualityCheckReconciliation["outcome"];

export interface ClaimReconciliation {
  readonly claim: ExecutableClaim | PhantomClaim | UnnamedClaim;
  readonly qualityCheckReconciliations: readonly QualityCheckReconciliation[];
  readonly verdict: "balanced" | "out-of-balance";
}

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
  readonly outOfBalanceByFeature: readonly { readonly file: string; readonly count: number }[];
  readonly excludedClaimCodeOccurrences: number;
}

export interface StepCounts {
  readonly stepsRead: number;
  readonly runners: number;
  readonly reconcilerSteps: number;
  readonly nonChecks: number;
  readonly plumbing: number;
  readonly fitnessFunctions: number;
}

export interface StepAccount {
  readonly jobs: readonly ({ readonly workflow: string; readonly job: string } & StepCounts)[];
  readonly total: StepCounts;
}

// An input the run was given or took by default, its path relative to the target's folder; no path when it was absent.
export interface ProvenanceInput {
  readonly name: string;
  readonly path?: string;
}

// target is unknown-target when nothing names one; sourceSha is unknown outside git.
export interface Provenance {
  readonly target: string;
  readonly sourceSha: string;
  readonly toolSha?: string;
  readonly toolVersion: string;
  readonly runTime: string;
  readonly inputs: readonly ProvenanceInput[];
}

export type ClaimCodeError =
  | {
      readonly kind: "foreign-claim-code";
      readonly claimCode: ClaimCode;
      readonly file: string;
      // The files tagged with the code's feature code: none, one, or several where the feature code is duplicated.
      readonly filesWithItsFeatureCode: readonly string[];
    }
  | { readonly kind: "no-feature-code"; readonly file: string }
  | { readonly kind: "duplicate-feature-code"; readonly featureCode: string; readonly files: readonly string[] }
  | {
      readonly kind: "several-claim-codes";
      readonly file: string;
      readonly title: string;
      readonly claimCodes: readonly ClaimCode[];
    }
  | { readonly kind: "claim-code-beside-clm-column"; readonly file: string; readonly title: string; readonly claimCode: ClaimCode };

// entry is the setting as written, such as runners.unit or deferralTags[0].
export interface ConfigurationError {
  readonly kind:
    | "configuration-wrong-kind"
    | "configuration-unknown-key"
    | "runner-key-not-a-layer"
    | "runner-report-not-read"
    | "not-checks-entry-matches-no-step"
    | "not-checks-entry-not-a-step-name";
  readonly entry: string;
}

export interface ErrorsInTheInputs {
  readonly claimCodeErrors: readonly ClaimCodeError[];
  readonly configurationErrors: readonly ConfigurationError[];
}

export interface RunIntegrity {
  readonly neverRan: readonly EvidenceObservation[];
}
