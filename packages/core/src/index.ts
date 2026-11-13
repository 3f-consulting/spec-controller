export type {
  Allocation,
  AllocationAsked,
  ClaimCode,
  ClaimCodeError,
  ClaimCodeOccurrence,
  HistoryBoundary,
} from "./domain/claimCodes.js";
export type {
  EvidenceObligation,
  OutlineExamplesAsWritten,
  ExecutableClaim,
  FeatureAsWritten,
  QualityCheckKind,
  ClaimReadingSettings,
  ScenarioAsWritten,
} from "./domain/postEvidenceObligation.js";
export type {
  EvidenceObservation,
  ExampleResultAsWritten,
  FailureAsWritten,
  PhantomClaim,
  Result,
  ResultInFileAsWritten,
  ResultInSuiteAsWritten,
  ResultsByExampleAsWritten,
  ResultsByFileAsWritten,
  ResultsBySuiteAsWritten,
  ScenarioResultAsWritten,
  ShellAnswers,
  StepRecordEntryAsWritten,
  UnnamedClaim,
  WorkflowStepAsWritten,
} from "./domain/postEvidenceObservation.js";
export type { ClaimReconciliation, EvidenceGroup, Outcome, QualityCheckReconciliation } from "./domain/claimReconciliation.js";
export type {
  ErrorsInTheInputs,
  EvidenceReconciliation,
  QualityCheckCounts,
  RunIntegrity,
  RunVerdict,
  StepAccount,
  StepCounts,
  Totals,
} from "./domain/evidenceReconciliation.js";
export type { Provenance, RunIdentity, ProvenanceInput } from "./domain/provenance.js";
export type { ConfigurationError, Layer, StepAddress, TargetConfiguration, TargetSettingsAsWritten } from "./domain/configuration.js";
export type {
  Destination,
  FileIdentity,
  IdentifiedInput,
  IdentifiedOutput,
  OutputPlan,
  OutputRefusal,
  OutputRequest,
} from "./domain/outputPlan.js";

export { claimReconciliationOf } from "./domain/claimReconciliation.js";
export { runVerdictOf } from "./domain/evidenceReconciliation.js";
export { executableClaimsOf } from "./domain/postEvidenceObligation.js";
export { evidenceObservationsOf, observationsFiledUnder } from "./domain/postEvidenceObservation.js";
export { featureAsWrittenFrom } from "./inputs/gherkin.js";
export { resultsByFileFrom } from "./inputs/vitest.js";
export { markdownReportOf } from "./reports/markdown.js";
