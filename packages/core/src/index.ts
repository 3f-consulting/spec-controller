export type {
  QualityCheck,
  BehaviouralQualityCheck,
  EvidenceStatus,
  EvidenceObligation,
  Scenario,
  BehaviouralEvidenceObservation,
  FitnessEvidenceObservation,
  EvidenceObservation,
  Outcome,
  ScenarioVerdict,
  ScenarioKind,
  QualityCheckReconciliation,
  ScenarioReconciliation,
  Ledger,
} from "./model.js";

export { parseScenarios, countScnOccurrences, parseUntaggedScenarios } from "./parse/scenarios.js";

export { evidenceObligations } from "./census/evidenceObligations.js";
export type { EvidenceObligations, SharedScnCode, UntaggedScenario } from "./census/evidenceObligations.js";
export { sharedScnCodesOf, untaggedScenarioId } from "./census/evidenceObligations.js";

export { reconcile, evidenceReconciliationOf } from "./domain/evidenceReconciliation.js";
export { hasScenarioCodeErrors } from "./domain/scenarioCodeError.js";
export type { ScenarioCodeError, ScenarioCodeErrorKind, ScenarioCodePopulation } from "./domain/scenarioCodeError.js";
export {
  isBalanced,
  hasPendingItems,
  hasBrokenEvidence,
  hasNothingToReconcile,
} from "./domain/ledger.js";
export { verdictCode } from "./domain/verdictCode.js";
export type { VerdictCode, VerdictInputs } from "./domain/verdictCode.js";

export { nextScnCode } from "./domain/scnAllocation.js";
export type { Allocation, AllocationRequest, ScnOccurrence, UnknownPart } from "./domain/scnAllocation.js";

export { parseVitestEvidenceObservations } from "./parse/vitest.js";
export type { VitestJsonReport } from "./parse/vitest.js";
export { parseCucumberEvidenceObservations } from "./parse/cucumber.js";
export type { CucumberJsonReport } from "./parse/cucumber.js";
export { runningFitnessFunctions } from "./parse/runningFitnessFunctions.js";
export { commandInvokesScript } from "./parse/checkScriptsRunInCI.js";
export type { PackageJsonScripts } from "./parse/checkScriptsRunInCI.js";

export { assembleRenderInput } from "./assemble/renderInput.js";
export type {
  EvidenceReconciliation,
  RenderInput,
  ReportMetadata,
  Summary,
  ScenarioReconciliationTotals,
  QualityCheckReconciliationTotals,
  MissingByQualityCheck,
  TestVolumeTotals,
  FitnessFunctionTotals,
  FitnessTally,
  EvidenceObligationsSection,
} from "./assemble/renderInput.js";

export { evidenceReconciliationFromSources } from "./assemble/evidenceReconciliationFromSources.js";

export { renderJson } from "./render/json.js";
export { renderMarkdown, renderReport, renderReportFromJson } from "./render/markdown.js";
export type { FeatureNames } from "./render/markdown.js";

export { provenanceObject, projectProvenance, projectProvenanceObject } from "./provenance/provenance.js";
export type { RunContext, RunInputs, ProvenanceObject, ProvenanceFacts, ProvenanceInput } from "./provenance/provenance.js";

export { featureCodeOf, isFeaturePart } from "./domain/featureCode.js";
export { relativizeToRoot } from "./lib/portablePath.js";
