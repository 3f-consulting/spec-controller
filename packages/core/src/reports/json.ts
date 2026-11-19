import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import type {
  ClaimCode,
  ClaimCodeError,
  ClaimReconciliation,
  ConfigurationError,
  ErrorsInTheInputs,
  EvidenceObligation,
  EvidenceObservation,
  ExecutableClaim,
  PhantomClaim,
  Provenance,
  ProvenanceInput,
  QualityCheckCounts,
  QualityCheckKind,
  QualityCheckReconciliation,
  Result,
  RunIntegrity,
  RunVerdict,
  StepAccount,
  StepCounts,
  Totals,
  UnnamedClaim,
} from "./jsonReportTypes.js";

// The JSON report's own shape, the contract its readers hold. Its parts are the report's own types, so a domain change
// reaches the report, and its schema, only where the mapping below takes it.
export interface JsonReport {
  // Raised whenever the report's structure changes, so a reader can tell which contract a report follows.
  readonly schemaVersion: 2;
  readonly claimReconciliations: readonly ClaimReconciliation[];
  readonly runVerdict: RunVerdict;
  readonly totals: Totals;
  readonly stepAccount: StepAccount;
  readonly provenance: Provenance;
  readonly errorsInTheInputs: ErrorsInTheInputs;
  readonly runIntegrity: RunIntegrity;
}

// Each field a report type names, with what makes the domain's value the report's.
type FieldsOf<R> = { readonly [K in keyof R]-?: (value: NonNullable<R[K]>) => NonNullable<R[K]> };

// The fields the report's type names, in the order the domain's object holds them, and no others: a field the domain
// adds stays out of the report.
function picked<R extends object>(source: R, fields: FieldsOf<R>): R {
  const named = Object.entries(source).filter(([key, value]) => Object.hasOwn(fields, key) && value !== undefined);
  return Object.fromEntries(named.map(([key, value]) => [key, fields[key as keyof R](value)])) as R;
}

const same = <T>(value: T): T => value;

const each =
  <T>(of: (value: T) => T) =>
  (values: readonly T[]): readonly T[] =>
    values.map((value) => of(value));

const claimCodeOf = (code: ClaimCode): ClaimCode => picked(code, { featureCode: same, number: same });

const obligationOf = (obligation: EvidenceObligation): EvidenceObligation => picked(obligation, { kind: same<QualityCheckKind> });

const observationOf = (observation: EvidenceObservation): EvidenceObservation =>
  picked(observation, { cites: each(claimCodeOf), result: same<Result>, kind: same<QualityCheckKind>, place: same, name: same, message: same });

// An executable claim has a title; of the others, a phantom claim has a code and the unnamed claim holds nothing.
function claimOf(claim: ExecutableClaim | PhantomClaim | UnnamedClaim): ExecutableClaim | PhantomClaim | UnnamedClaim {
  if ("title" in claim) return picked(claim, { claimCode: claimCodeOf, file: same, title: same, obligations: each(obligationOf) });
  return claim.claimCode === undefined ? {} : { claimCode: claimCodeOf(claim.claimCode) };
}

// Every shape of a Quality Check Reconciliation names the same four fields, those it lacks as never.
const qualityCheckReconciliationOf = (reconciliation: QualityCheckReconciliation): QualityCheckReconciliation =>
  picked(reconciliation, { outcome: same, kind: same, obligation: obligationOf, observation: observationOf });

const claimReconciliationOf = (reconciliation: ClaimReconciliation): ClaimReconciliation =>
  picked(reconciliation, { claim: claimOf, qualityCheckReconciliations: each(qualityCheckReconciliationOf), verdict: same });

const runVerdictOf = (runVerdict: RunVerdict): RunVerdict =>
  runVerdict.verdict === "not-reconciled" ? picked(runVerdict, { verdict: same, why: same }) : picked(runVerdict, { verdict: same });

const BY_OUTCOME: FieldsOf<QualityCheckCounts["byOutcome"]> = {
  satisfied: same,
  failing: same,
  "cannot-fail": same,
  missing: same,
  "no-claim-code": same,
  "duplicate-claim-code": same,
  "not-asked-for": same,
  "cites-unknown-claim": same,
  "cites-no-claim": same,
  "never-ran": same,
  "no-quality-check": same,
};

const COUNTS: FieldsOf<QualityCheckCounts> = { evidenceObligations: same, evidenceObservations: same, byOutcome: (byOutcome) => picked(byOutcome, BY_OUTCOME) };

const countsOf = (counts: QualityCheckCounts): QualityCheckCounts => picked(counts, COUNTS);

const totalsOf = (totals: Totals): Totals =>
  picked(totals, {
    claimReconciliations: (claims) => picked(claims, { total: same, balanced: same, outOfBalance: same }),
    qualityCheckReconciliations: (checks) =>
      picked(checks, { byKind: each((row) => picked(row, { kind: same, ...COUNTS })), noKind: countsOf, all: countsOf }),
    evidenceObservations: (observations) => picked(observations, { total: same, onExecutableClaim: same, onPhantomClaim: same, onUnnamedClaim: same }),
    outOfBalanceByFeature: each((feature) => picked(feature, { file: same, count: same })),
    excludedClaimCodeOccurrences: same,
  });

const STEP_COUNTS: FieldsOf<StepCounts> = { stepsRead: same, runners: same, reconcilerSteps: same, nonChecks: same, plumbing: same, fitnessFunctions: same };

const stepAccountOf = (stepAccount: StepAccount): StepAccount =>
  picked(stepAccount, { jobs: each((job) => picked(job, { workflow: same, job: same, ...STEP_COUNTS })), total: (total) => picked(total, STEP_COUNTS) });

const inputOf = (input: ProvenanceInput): ProvenanceInput => picked(input, { name: same, path: same });

const provenanceOf = (provenance: Provenance): Provenance =>
  picked(provenance, { target: same, sourceSha: same, toolSha: same, toolVersion: same, runTime: same, inputs: each(inputOf) });

type ClaimCodeErrorKind = ClaimCodeError["kind"];

// Each kind of claim code error names its own fields.
const CLAIM_CODE_ERROR_FIELDS: { readonly [K in ClaimCodeErrorKind]: FieldsOf<Extract<ClaimCodeError, { readonly kind: K }>> } = {
  "foreign-claim-code": { kind: same, claimCode: claimCodeOf, file: same, filesWithItsFeatureCode: same },
  "no-feature-code": { kind: same, file: same },
  "duplicate-feature-code": { kind: same, featureCode: same, files: same },
  "several-claim-codes": { kind: same, file: same, title: same, claimCodes: each(claimCodeOf) },
  "claim-code-beside-clm-column": { kind: same, file: same, title: same, claimCode: claimCodeOf },
};

const claimCodeErrorOf = (error: ClaimCodeError): ClaimCodeError => picked(error, CLAIM_CODE_ERROR_FIELDS[error.kind] as FieldsOf<ClaimCodeError>);

const configurationErrorOf = (error: ConfigurationError): ConfigurationError => picked(error, { kind: same, entry: same });

const errorsInTheInputsOf = (errors: ErrorsInTheInputs): ErrorsInTheInputs =>
  picked(errors, { claimCodeErrors: each(claimCodeErrorOf), configurationErrors: each(configurationErrorOf) });

const runIntegrityOf = (runIntegrity: RunIntegrity): RunIntegrity => picked(runIntegrity, { neverRan: each(observationOf) });

export const jsonReportFrom = ({ claimReconciliations, runVerdict, totals, stepAccount, provenance, errorsInTheInputs, runIntegrity }: EvidenceReconciliation): JsonReport => ({
  schemaVersion: 2,
  claimReconciliations: claimReconciliations.map((reconciliation) => claimReconciliationOf(reconciliation)),
  runVerdict: runVerdictOf(runVerdict),
  totals: totalsOf(totals),
  stepAccount: stepAccountOf(stepAccount),
  provenance: provenanceOf(provenance),
  errorsInTheInputs: errorsInTheInputsOf(errorsInTheInputs),
  runIntegrity: runIntegrityOf(runIntegrity),
});

export const jsonReportOf = (reconciliation: EvidenceReconciliation): string => `${JSON.stringify(jsonReportFrom(reconciliation), null, 2)}\n`;
