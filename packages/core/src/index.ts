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

export {
  parseScenarios,
  countScnOccurrences,
  parseUntaggedScenarios,
  parseFeatureCounts,
} from "./parse/scenarios.js";

export { evidenceObligations, corpusCountsOf, sharedScnCodesOf, untaggedScenarioId } from "./domain/corpusCounts.js";
export type { EvidenceObligations, SharedScnCode, UntaggedScenario } from "./domain/corpusCounts.js";

export { reconcile, evidenceReconciliationOf } from "./domain/evidenceReconciliation.js";
export { hasScenarioCodeErrors } from "./domain/scenarioCodeError.js";
export type { ScenarioCodeError, ScenarioCodeErrorKind, ScenarioCodePopulation } from "./domain/scenarioCodeError.js";
export {
  isBalanced,
  hasPendingItems,
  hasBrokenEvidence,
  hasNothingToReconcile,
} from "./domain/ledger.js";
export { BUILT_IN_DEFERRAL_TAGS } from "./domain/pendingItems.js";
export { verdictCode } from "./domain/verdictCode.js";
export type { VerdictCode, VerdictInputs } from "./domain/verdictCode.js";

export { nextScnCode } from "./domain/scnAllocation.js";
export type { Allocation, AllocationRequest, ScnOccurrence, UnknownPart } from "./domain/scnAllocation.js";

export { parseVitestEvidenceObservations } from "./parse/vitest.js";
export type { VitestJsonReport } from "./parse/vitest.js";
export { parseJunitEvidenceObservations, parsePytestEvidenceObservations } from "./parse/pytest.js";
export type { JunitXmlReport } from "./parse/pytest.js";
export { parseRspecEvidenceObservations } from "./parse/rspec.js";
export type { RspecJsonReport } from "./parse/rspec.js";
export { parseCucumberEvidenceObservations } from "./parse/cucumber.js";
export type { CucumberJsonReport } from "./parse/cucumber.js";
export { runningFitnessFunctions } from "./parse/runningFitnessFunctions.js";
export type { StepRecord } from "./parse/ciStepRecord.js";
export { commandInvokesScript } from "./parse/checkScriptsRunInCI.js";
export type { PackageJsonScripts } from "./parse/checkScriptsRunInCI.js";

export { assembleRenderInput } from "./assemble/renderInput.js";
export type { RenderInput, ReportMetadata, EvidenceObligationsSection, FeatureNames } from "./domain/renderInput.js";
export type {
  EvidenceReconciliation,
  Summary,
  ScenarioReconciliationTotals,
  QualityCheckReconciliationTotals,
  MissingByQualityCheck,
  TestVolumeTotals,
  FitnessFunctionTotals,
  FitnessTally,
} from "./assemble/renderInput.js";

export { evidenceReconciliationFromSources } from "./assemble/evidenceReconciliationFromSources.js";

export { renderJson, renderMarkdown, projectProvenance } from "./assemble/composers.js";
export { renderReport, renderReportFromJson } from "./render/markdown.js";

export { provenanceObject } from "./provenance/provenance.js";
export { projectProvenanceObject } from "./render/provenanceFacts.js";
export type { ProvenanceFacts, ProvenanceInput } from "./render/provenanceFacts.js";
export type { RunContext, RunInputs, ProvenanceObject } from "./domain/runProvenance.js";

export { featureCodeOf, isFeaturePart } from "./domain/featureCode.js";
export { relativizeToRoot } from "./lib/portablePath.js";
