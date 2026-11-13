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
  StepDisposition,
  StepRecordEntryAsWritten,
  UnnamedClaim,
} from "./domain/postEvidenceObservation.js";
export type { WorkflowStepAsWritten } from "./domain/workflowSteps.js";
export type { ClaimReconciliation, EvidenceGroup, Outcome, QualityCheckReconciliation } from "./domain/claimReconciliation.js";
export type {
  ErrorsInTheInputs,
  EvidenceReconciliation,
  QualityCheckCounts,
  RunIntegrity,
  RunReconciled,
  RunVerdict,
  StepAccount,
  StepCounts,
  Totals,
} from "./domain/evidenceReconciliation.js";
export type { Provenance, RepositoryOfOrigin, RunIdentity, ProvenanceInput } from "./domain/provenance.js";
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

export { allocationOf, claimCodeErrorsOf, featureCodeOfFile, isFeatureCode, writtenClaimCode } from "./domain/claimCodes.js";
export { claimReconciliationsOf } from "./domain/claimReconciliation.js";
export { evidenceReconciliationOf, runVerdictOf, stepAccountOf, totalsOf } from "./domain/evidenceReconciliation.js";
export { outputPlanOf } from "./domain/outputPlan.js";
export { executableClaimsOf } from "./domain/postEvidenceObligation.js";
export { provenanceOf } from "./domain/provenance.js";
export { fitnessObservationsOf, observationsByExample, observationsByFile, observationsBySuite, observationsOfScenarios, stepDispositionOf } from "./domain/postEvidenceObservation.js";
export { featureAsWrittenFrom } from "./inputs/gherkin.js";
export { scriptsFrom, targetConfigurationFrom } from "./inputs/manifest.js";
export { repositoryOfOrigin } from "./inputs/origin.js";
export { shellAnswers } from "./inputs/shell.js";
export { stepRecordFrom } from "./inputs/stepRecord.js";
export { resultsByFileFrom } from "./inputs/vitest.js";
export { workflowStepsFrom } from "./inputs/workflows.js";
export { textFor } from "./messages/catalogue.js";
export { jsonReportOf } from "./reports/json.js";
export { resultsBySuiteFrom } from "./inputs/junit.js";
export { resultsByExampleFrom } from "./inputs/rspec.js";
export { scenarioResultsFrom } from "./inputs/cucumber.js";
export { markdownReportOf } from "./reports/markdown.js";
