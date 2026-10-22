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
  Verdict,
  ClaimKind,
  QualityCheckReconciliation,
  ClaimReconciliation,
  Ledger,
} from "./model.js";

export {
  countScnOccurrences,
  parseFeatureCorpus,
  scenariosOf,
  untaggedScenariosOf,
  featureCountsOf,
  corpusCountsOfFeatures,
} from "./parse/scenarios.js";
export type { ParsedFeatureFile } from "./parse/scenarios.js";

export { evidenceObligations, corpusCountsOf, sharedScnCodesOf, untaggedScenarioId } from "./domain/corpusCounts.js";
export type { EvidenceObligations, SharedScnCode, UntaggedScenario } from "./domain/corpusCounts.js";

export { reconcile, evidenceReconciliationOf } from "./domain/evidenceReconciliation.js";
export { hasScenarioCodeErrors } from "./domain/scnTags.js";
export type { ScenarioCodeError, ScenarioCodeErrorKind, ScenarioCodePopulation } from "./domain/scnTags.js";
export {
  isBalanced,
  hasPendingItems,
  hasBrokenEvidence,
  hasNothingToReconcile,
} from "./domain/ledger.js";
export { BUILT_IN_DEFERRAL_TAGS } from "./domain/pendingItems.js";
export { runVerdict } from "./domain/runVerdict.js";
export type { RunVerdict, VerdictInputs } from "./domain/runVerdict.js";

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
export { parseWorkflows } from "./parse/checkScriptsRunInCI.js";
export { commandInvokesScript } from "./parse/commandRuns.js";
export type { PackageJsonScripts, ParsedWorkflow } from "./parse/checkScriptsRunInCI.js";
export type { WorkflowStep } from "./domain/pipelineStep.js";
export type { Parsed, Source, SourceFault, SourcesParse } from "./parse/sourceParse.js";

export { assembleRenderInput } from "./assemble/renderInput.js";
export type { RenderInput, ReportMetadata, EvidenceObligationsSection, FeatureNames, ExitCodeOf } from "./domain/renderInput.js";
export type {
  EvidenceReconciliation,
  Summary,
  ClaimReconciliationTotals,
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
export type { RunContext, RunInput, RunInputName, RunInputs, ProvenanceObject } from "./domain/runProvenance.js";

export { featureCodeOf, isFeaturePart } from "./domain/featureCode.js";
export { relativizeToRoot } from "./lib/portablePath.js";
