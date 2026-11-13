import type { ClaimCodeError } from "./claimCodes.js";
import type { ClaimReconciliation, Outcome, QualityCheckReconciliation } from "./claimReconciliation.js";
import type { ConfigurationError } from "./configuration.js";
import type { FeatureAsWritten, QualityCheckKind } from "./postEvidenceObligation.js";
import type { EvidenceObservation, StepDisposition } from "./postEvidenceObservation.js";
import type { WorkflowStepAsWritten } from "./workflowSteps.js";
import { claimCodeFrom } from "./claimCodes.js";
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

// Not reconciled, first because evidence never ran, then for claim code errors, then for nothing to reconcile; otherwise
// balanced only when every Claim Reconciliation is.
export function runVerdictOf(claimReconciliations: readonly ClaimReconciliation[], claimCodeErrors: readonly ClaimCodeError[]): RunVerdict {
  const neverRan = claimReconciliations.some(({ qualityCheckReconciliations }) => qualityCheckReconciliations.some(({ outcome }) => outcome === "never-ran"));
  if (neverRan) return { verdict: "not-reconciled", why: "unsound" };
  if (claimCodeErrors.length > 0) return { verdict: "not-reconciled", why: "claim-code-errors" };
  if (claimReconciliations.length === 0) return { verdict: "not-reconciled", why: "nothing-to-reconcile" };
  return { verdict: claimReconciliations.every(({ verdict }) => verdict === "balanced") ? "balanced" : "out-of-balance" };
}

const COUNTED: Readonly<Record<StepDisposition, keyof Omit<StepCounts, "stepsRead">>> = {
  runner: "runners",
  reconciler: "reconcilerSteps",
  nonCheck: "nonChecks",
  plumbing: "plumbing",
  candidate: "candidates",
};

const NONE: StepCounts = { stepsRead: 0, runners: 0, reconcilerSteps: 0, nonChecks: 0, plumbing: 0, candidates: 0 };

const countedIn = (counts: StepCounts, disposition: StepDisposition): StepCounts => ({
  ...counts,
  stepsRead: counts.stepsRead + 1,
  [COUNTED[disposition]]: counts[COUNTED[disposition]] + 1,
});

type DisposedStep = { readonly step: WorkflowStepAsWritten; readonly disposition: StepDisposition };

const countsOf = (steps: readonly DisposedStep[]): StepCounts => steps.reduce((counts, { disposition }) => countedIn(counts, disposition), NONE);

const sameJob = (one: WorkflowStepAsWritten, other: WorkflowStepAsWritten): boolean => one.workflow === other.workflow && one.job === other.job;

// A row for each workflow and job, in the order read, and a total over them. Every step read has one disposition.
export function stepAccountOf(steps: readonly DisposedStep[]): StepAccount {
  const firstOfEachJob = steps.filter(({ step }, at) => steps.findIndex((other) => sameJob(other.step, step)) === at);
  const jobs = firstOfEachJob.map(({ step: { workflow, job } }) => ({
    workflow,
    job,
    ...countsOf(steps.filter(({ step }) => step.workflow === workflow && step.job === job)),
  }));
  const total = countsOf(steps);
  return { jobs, total: { ...total, accountedFor: total.runners + total.reconcilerSteps + total.nonChecks + total.plumbing + total.candidates } };
}

const OUTCOMES: readonly Outcome[] = [
  "satisfied",
  "failing",
  "cannot-fail",
  "missing",
  "no-claim-code",
  "duplicate-claim-code",
  "not-asked-for",
  "cites-unknown-claim",
  "cites-no-claim",
  "never-ran",
  "no-quality-check",
];

const KINDS: readonly QualityCheckKind[] = ["unit", "integration", "e2e", "performance", "fitness"];

const countsOfReconciliations = (reconciliations: readonly QualityCheckReconciliation[], evidenceObligations: number): QualityCheckCounts => ({
  evidenceObligations,
  evidenceObservations: reconciliations.filter(({ observation }) => observation !== undefined).length,
  byOutcome: Object.fromEntries(OUTCOMES.map((outcome) => [outcome, reconciliations.filter((reconciliation) => reconciliation.outcome === outcome).length])) as Record<Outcome, number>,
});

const sumOf = (rows: readonly QualityCheckCounts[]): QualityCheckCounts => ({
  evidenceObligations: rows.reduce((sum, { evidenceObligations }) => sum + evidenceObligations, 0),
  evidenceObservations: rows.reduce((sum, { evidenceObservations }) => sum + evidenceObservations, 0),
  byOutcome: Object.fromEntries(OUTCOMES.map((outcome) => [outcome, rows.reduce((sum, { byOutcome }) => sum + byOutcome[outcome], 0)])) as Record<Outcome, number>,
});

// Each kind's Evidence Obligations are the claims' own; its Evidence Observations and outcomes, its Quality Check
// Reconciliations'. The row with no kind holds what names none, and the All row sums every row.
function qualityCheckCountsOf(claimReconciliations: readonly ClaimReconciliation[]): Totals["qualityCheckReconciliations"] {
  const reconciliations = claimReconciliations.flatMap(({ qualityCheckReconciliations }) => qualityCheckReconciliations);
  const obligations = claimReconciliations.flatMap(({ claim }) => ("obligations" in claim ? claim.obligations : []));
  const byKind = KINDS.map((kind) => ({
    kind,
    ...countsOfReconciliations(
      reconciliations.filter((reconciliation) => reconciliation.kind === kind),
      obligations.filter((obligation) => obligation.kind === kind).length,
    ),
  }));
  const noKind = countsOfReconciliations(
    reconciliations.filter(({ kind }) => kind === undefined),
    0,
  );
  return { byKind, noKind, all: sumOf([...byKind, noKind]) };
}

// Each Evidence Observation counts once, on the claim it was filed on: an executable claim, a phantom claim or the unnamed claim.
function whereFiledOf(claimReconciliations: readonly ClaimReconciliation[]): Totals["evidenceObservations"] {
  const observedOn = (filedOn: (claim: ClaimReconciliation["claim"]) => boolean): number =>
    claimReconciliations
      .filter(({ claim }) => filedOn(claim))
      .flatMap(({ qualityCheckReconciliations }) => qualityCheckReconciliations)
      .filter(({ observation }) => observation !== undefined).length;
  const onExecutableClaim = observedOn((claim) => "obligations" in claim);
  const onPhantomClaim = observedOn((claim) => !("obligations" in claim) && claim.claimCode !== undefined);
  const onUnnamedClaim = observedOn((claim) => !("obligations" in claim) && claim.claimCode === undefined);
  return { total: onExecutableClaim + onPhantomClaim + onUnnamedClaim, onExecutableClaim, onPhantomClaim, onUnnamedClaim };
}

// Each feature file with an out-of-balance executable claim, in the order read, and how many; a phantom claim and the
// unnamed claim are counted in the total, on no feature's row.
function outOfBalanceByFeatureOf(claimReconciliations: readonly ClaimReconciliation[]): { readonly outOfBalanceByFeature?: Totals["outOfBalanceByFeature"] } {
  const counts = new Map<string, number>();
  for (const { claim, verdict } of claimReconciliations) if (verdict === "out-of-balance" && "obligations" in claim) counts.set(claim.file, (counts.get(claim.file) ?? 0) + 1);
  const rows = [...counts].map(([file, count]) => ({ file, count }));
  return rows.length === 0 ? {} : { outOfBalanceByFeature: rows };
}

// A claim code written as a tag anywhere but on a scenario is read by no claim: in a title, a step, a description or a comment.
// Punctuation stuck to its end, as in a list, leaves it a claim code.
function excludedClaimCodeOccurrencesOf(features: readonly FeatureAsWritten[]): number {
  const claimCodesIn = (words: readonly string[]): number => words.filter((word) => claimCodeFrom(word.replace(/\p{P}+$/u, "")) !== undefined).length;
  return features.reduce((sum, { wordsWrittenAsTags, scenarios }) => sum + claimCodesIn(wordsWrittenAsTags) - claimCodesIn(scenarios.flatMap(({ tags }) => tags)), 0);
}

export function totalsOf(claimReconciliations: readonly ClaimReconciliation[], features: readonly FeatureAsWritten[]): Totals {
  const balanced = claimReconciliations.filter(({ verdict }) => verdict === "balanced").length;
  return {
    claimReconciliations: { total: claimReconciliations.length, balanced, outOfBalance: claimReconciliations.length - balanced },
    qualityCheckReconciliations: qualityCheckCountsOf(claimReconciliations),
    evidenceObservations: whereFiledOf(claimReconciliations),
    ...outOfBalanceByFeatureOf(claimReconciliations),
    excludedClaimCodeOccurrences: excludedClaimCodeOccurrencesOf(features),
  };
}

// What a run read and worked out, for the Evidence Reconciliation to be assembled from.
export interface RunReconciled {
  readonly claimReconciliations: readonly ClaimReconciliation[];
  readonly claimCodeErrors: readonly ClaimCodeError[];
  readonly configurationErrors: readonly ConfigurationError[];
  readonly features: readonly FeatureAsWritten[];
  readonly stepAccount?: StepAccount;
  readonly provenance: Provenance;
}

// The domain's one entry point: an optional part is present only when the run has something for it.
export function evidenceReconciliationOf({ claimReconciliations, claimCodeErrors, configurationErrors, features, stepAccount, provenance }: RunReconciled): EvidenceReconciliation {
  const neverRan = claimReconciliations.flatMap(({ qualityCheckReconciliations }) =>
    qualityCheckReconciliations.flatMap(({ outcome, observation }) => (outcome === "never-ran" && observation !== undefined ? [observation] : [])),
  );
  const errors = { ...(claimCodeErrors.length > 0 && { claimCodeErrors }), ...(configurationErrors.length > 0 && { configurationErrors }) };
  return {
    claimReconciliations,
    runVerdict: runVerdictOf(claimReconciliations, claimCodeErrors),
    totals: totalsOf(claimReconciliations, features),
    ...(stepAccount && { stepAccount }),
    provenance,
    ...(Object.keys(errors).length > 0 && { errorsInTheInputs: errors }),
    ...(neverRan.length > 0 && { runIntegrity: { neverRan } }),
  };
}
