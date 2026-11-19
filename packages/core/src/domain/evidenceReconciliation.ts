import { claimCodeErrorsOf, claimCodeFrom, type ClaimCodeError } from "./claimCodes.js";
import { claimReconciliationsOf, isExecutable, type ClaimReconciliation, type CreditJournal, type Outcome, type QualityCheckReconciliation } from "./claimReconciliation.js";
import { targetConfigurationOf, type ConfigurationError, type ConfigurationSettings, type Layer } from "./configuration.js";
import { deferredScenariosOf, executableClaimsOf, QUALITY_CHECK_KINDS, type ClaimReadingSettings, type FeatureFile, type QualityCheckKind } from "./postEvidenceObligation.js";
import {
  disposedStepsOf,
  fitnessObservationsOf,
  observationsOfTestResults,
  type DisposedStep,
  type EvidenceObservation,
  type RecordedStep,
  type Scripts,
  type ShellAnswers,
  type StepDisposition,
  type TestResult,
} from "./postEvidenceObservation.js";
import type { CiStep } from "./workflowSteps.js";
import { provenanceOf, type Provenance, type ProvenanceInput, type RepositoryOfOrigin, type RunIdentity } from "./provenance.js";

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
  // The scenarios a deferral tag set aside, an Outline counted once.
  readonly deferredScenarios: number;
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

export interface ErrorsInTheInputs {
  readonly claimCodeErrors: readonly ClaimCodeError[];
  readonly configurationErrors: readonly ConfigurationError[];
}

export interface RunIntegrity {
  readonly neverRan: readonly EvidenceObservation[];
}

export interface EvidenceReconciliation {
  readonly claimReconciliations: readonly ClaimReconciliation[];
  readonly runVerdict: RunVerdict;
  readonly totals: Totals;
  readonly stepAccount: StepAccount;
  readonly provenance: Provenance;
  readonly errorsInTheInputs: ErrorsInTheInputs;
  readonly runIntegrity: RunIntegrity;
}

// Not reconciled, first because evidence never ran, then for claim code errors, then for nothing to reconcile; otherwise
// balanced only when every Claim Reconciliation counted is. Counting only the executable claims leaves the phantom claims
// and the unnamed claim out of the never-ran check and the balance.
export function runVerdictOf(claimReconciliations: readonly ClaimReconciliation[], claimCodeErrors: readonly ClaimCodeError[], countOnlyExecutableClaims: boolean): RunVerdict {
  const counted = countOnlyExecutableClaims ? claimReconciliations.filter(({ claim }) => isExecutable(claim)) : claimReconciliations;
  const neverRan = counted.some(({ qualityCheckReconciliations }) => qualityCheckReconciliations.some(({ outcome }) => outcome === "never-ran"));
  if (neverRan) return { verdict: "not-reconciled", why: "unsound" };
  if (claimCodeErrors.length > 0) return { verdict: "not-reconciled", why: "claim-code-errors" };
  if (claimReconciliations.length === 0) return { verdict: "not-reconciled", why: "nothing-to-reconcile" };
  return { verdict: counted.every(({ verdict }) => verdict === "balanced") ? "balanced" : "out-of-balance" };
}

const COUNTED: Readonly<Record<StepDisposition, keyof Omit<StepCounts, "stepsRead">>> = {
  runner: "runners",
  reconciler: "reconcilerSteps",
  nonCheck: "nonChecks",
  plumbing: "plumbing",
  fitnessFunction: "fitnessFunctions",
};

const NONE: StepCounts = { stepsRead: 0, runners: 0, reconcilerSteps: 0, nonChecks: 0, plumbing: 0, fitnessFunctions: 0 };

const countedIn = (counts: StepCounts, disposition: StepDisposition): StepCounts => ({
  ...counts,
  stepsRead: counts.stepsRead + 1,
  [COUNTED[disposition]]: counts[COUNTED[disposition]] + 1,
});

const countsOf = (steps: readonly DisposedStep[]): StepCounts => steps.reduce((counts, { disposition }) => countedIn(counts, disposition), NONE);

const sameJob = (one: CiStep, other: CiStep): boolean => one.workflow === other.workflow && one.job === other.job;

// A row for each workflow and job, in the order read, and a total over them. Every step read has one disposition.
export function stepAccountOf(steps: readonly DisposedStep[]): StepAccount {
  const firstOfEachJob = steps.filter(({ step }, at) => steps.findIndex((other) => sameJob(other.step, step)) === at);
  const jobs = firstOfEachJob.map(({ step: { workflow, job } }) => ({
    workflow,
    job,
    ...countsOf(steps.filter(({ step }) => step.workflow === workflow && step.job === job)),
  }));
  return { jobs, total: countsOf(steps) };
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
  const obligations = claimReconciliations
    .map(({ claim }) => claim)
    .filter(isExecutable)
    .flatMap(({ obligations: asked }) => asked);
  const byKind = QUALITY_CHECK_KINDS.map((kind) => ({
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

const filedOn = (claim: ClaimReconciliation["claim"]): "onExecutableClaim" | "onPhantomClaim" | "onUnnamedClaim" =>
  isExecutable(claim) ? "onExecutableClaim" : claim.claimCode === undefined ? "onUnnamedClaim" : "onPhantomClaim";

// Each Evidence Observation counts once, on the claim it was filed on: an executable claim, a phantom claim or the unnamed claim.
function whereFiledOf(claimReconciliations: readonly ClaimReconciliation[]): Totals["evidenceObservations"] {
  const filed = { onExecutableClaim: 0, onPhantomClaim: 0, onUnnamedClaim: 0 };
  for (const { claim, qualityCheckReconciliations } of claimReconciliations) {
    filed[filedOn(claim)] += qualityCheckReconciliations.filter(({ observation }) => observation !== undefined).length;
  }
  return { total: filed.onExecutableClaim + filed.onPhantomClaim + filed.onUnnamedClaim, ...filed };
}

// Each feature file with an out-of-balance executable claim, in the order read, and how many; a phantom claim and the
// unnamed claim are counted in the total, on no feature's row.
function outOfBalanceByFeatureOf(claimReconciliations: readonly ClaimReconciliation[]): Totals["outOfBalanceByFeature"] {
  const counts = new Map<string, number>();
  for (const { claim, verdict } of claimReconciliations) if (verdict === "out-of-balance" && isExecutable(claim)) counts.set(claim.file, (counts.get(claim.file) ?? 0) + 1);
  return [...counts].map(([file, count]) => ({ file, count }));
}

// A claim code written as a tag anywhere but on a scenario is read by no claim: in a title, a step, a description or a comment.
// Punctuation stuck to its end, as in a list, leaves it a claim code.
function excludedClaimCodeOccurrencesOf(features: readonly FeatureFile[]): number {
  const claimCodesIn = (words: readonly string[]): number => words.filter((word) => claimCodeFrom(word.replace(/\p{P}+$/u, "")) !== undefined).length;
  return features.reduce((sum, { wordsWrittenAsTags, scenarios }) => sum + claimCodesIn(wordsWrittenAsTags) - claimCodesIn(scenarios.flatMap(({ tags }) => tags)), 0);
}

export function totalsOf(claimReconciliations: readonly ClaimReconciliation[], features: readonly FeatureFile[], deferredScenarios: number): Totals {
  const balanced = claimReconciliations.filter(({ verdict }) => verdict === "balanced").length;
  return {
    claimReconciliations: { total: claimReconciliations.length, balanced, outOfBalance: claimReconciliations.length - balanced },
    qualityCheckReconciliations: qualityCheckCountsOf(claimReconciliations),
    evidenceObservations: whereFiledOf(claimReconciliations),
    outOfBalanceByFeature: outOfBalanceByFeatureOf(claimReconciliations),
    excludedClaimCodeOccurrences: excludedClaimCodeOccurrencesOf(features),
    deferredScenarios,
  };
}

// What a run read and worked out, for the Evidence Reconciliation to be assembled from.
export interface RunReconciled {
  readonly claimReconciliations: readonly ClaimReconciliation[];
  readonly claimCodeErrors: readonly ClaimCodeError[];
  readonly configurationErrors: readonly ConfigurationError[];
  readonly features: readonly FeatureFile[];
  // How the claims were read from the features, so the scenarios a deferral tag set aside are counted by the same reading.
  readonly claimReading: ClaimReadingSettings;
  // Whether the run verdict counts the executable claims alone, leaving out the phantom claims and the unnamed claim.
  readonly countOnlyExecutableClaims: boolean;
  readonly stepAccount: StepAccount;
  readonly provenance: Provenance;
}

// The Evidence Reconciliation assembled from its parts: every part is present, empty when the run had nothing for it.
export function evidenceReconciliationOf({
  claimReconciliations,
  claimCodeErrors,
  configurationErrors,
  features,
  claimReading,
  countOnlyExecutableClaims,
  stepAccount,
  provenance,
}: RunReconciled): EvidenceReconciliation {
  const neverRan = claimReconciliations.flatMap(({ qualityCheckReconciliations }) =>
    qualityCheckReconciliations.flatMap((reconciliation) => (reconciliation.outcome === "never-ran" ? [reconciliation.observation] : [])),
  );
  return {
    claimReconciliations,
    runVerdict: runVerdictOf(claimReconciliations, claimCodeErrors, countOnlyExecutableClaims),
    totals: totalsOf(claimReconciliations, features, deferredScenariosOf(features, claimReading)),
    stepAccount,
    provenance,
    errorsInTheInputs: { claimCodeErrors, configurationErrors },
    runIntegrity: { neverRan },
  };
}

// One evidence report as its reader gave it: its test results; the layers of the runners naming it, one or more; and
// whether its results are posted with the feature files.
export interface ReportGiven {
  readonly results: readonly TestResult[];
  readonly layers: readonly Layer[];
  readonly needsFeatures: boolean;
}

// What the readers gave a run, as data and answers: the domain reads no file and asks no reader.
export interface ReadersGave {
  readonly features: readonly FeatureFile[];
  // Every evidence report, in the order its results are posted.
  readonly reports: readonly ReportGiven[];
  readonly steps: readonly CiStep[];
  readonly stepRecord: readonly RecordedStep[];
  // The configuration settings as parsed, before they are checked against the steps and the reports.
  readonly settings: ConfigurationSettings;
  // Every report path a runner's long form names at which no file was.
  readonly reportsNotFound?: readonly string[];
  readonly scripts: Scripts;
  readonly shell: ShellAnswers;
  readonly repositoryOf: RepositoryOfOrigin;
  readonly identity: RunIdentity;
  // Every input the run could read, each path already resolved.
  readonly provenanceInputs: readonly ProvenanceInput[];
  readonly targetFolder: string;
  readonly strict: boolean;
  // Whether the run verdict counts the executable claims alone, leaving out the phantom claims and the unnamed claim.
  readonly countOnlyExecutableClaims: boolean;
}

// The credit journal: each report's results as Evidence Observations, beside the fitness functions' from the CI steps.
function creditJournalOf({ reports, features, stepRecord, targetFolder }: ReadersGave, disposedSteps: readonly DisposedStep[]): CreditJournal {
  return [
    ...reports.flatMap(({ results, layers, needsFeatures }) => observationsOfTestResults(results, targetFolder, layers, needsFeatures ? features : [])),
    ...fitnessObservationsOf(disposedSteps, stepRecord),
  ];
}

// What the readers gave, reconciled in one call: the configuration checked, the steps disposed, the claims and the evidence
// posted and reconciled, and the whole assembled.
export function reconcile(given: ReadersGave): EvidenceReconciliation {
  const { features, steps, stepRecord, settings, reportsNotFound, scripts, shell, repositoryOf, identity, provenanceInputs, targetFolder, strict, countOnlyExecutableClaims } = given;
  const { configuration, errors } = targetConfigurationOf(settings, steps, reportsNotFound);
  // Each step with what it is: posting and the step account both take it, and posting the same record.
  const disposedSteps = disposedStepsOf(steps, configuration, scripts, shell, stepRecord);
  const claimReading = { deferralTags: configuration.deferralTags, strict };
  const debitJournal = executableClaimsOf(features, claimReading);
  return evidenceReconciliationOf({
    claimReconciliations: claimReconciliationsOf(debitJournal, creditJournalOf(given, disposedSteps)),
    claimCodeErrors: claimCodeErrorsOf(features),
    configurationErrors: errors,
    features,
    claimReading,
    countOnlyExecutableClaims,
    stepAccount: stepAccountOf(disposedSteps),
    provenance: provenanceOf(identity, provenanceInputs, targetFolder, repositoryOf),
  });
}
