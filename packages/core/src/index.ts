export type {
  QualityCheckKind,
  Layer,
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
  countClaimCodeOccurrences,
  parseFeatureCorpus,
  scenariosOf,
  untaggedScenariosOf,
  featureCountsOf,
  corpusCountsOfFeatures,
  claimCodesAtOf,
} from "./parse/scenarios.js";
export type { ClaimCodesAt } from "./parse/scenarios.js";
export type { ParsedFeatureFile } from "./parse/scenarios.js";

export { evidenceObligations, corpusCountsOf, sharedClaimCodesOf, untaggedScenarioId } from "./domain/corpusCounts.js";
export type { EvidenceObligations, SharedClaimCode } from "./domain/corpusCounts.js";
export type { ScenarioName } from "./domain/qualityCheckReconciliation.js";

export { reconcile, evidenceReconciliationOf } from "./domain/evidenceReconciliation.js";
export { hasClaimCodeErrors } from "./domain/claimCodes.js";
export type { ClaimCodeError, ClaimCodeErrorKind, ClaimCodePopulation } from "./domain/claimCodes.js";
export {
  isBalanced,
  hasPendingItems,
  hasNeverRanEvidence,
  hasNothingToReconcile,
} from "./domain/ledger.js";
export { BUILT_IN_DEFERRAL_TAGS } from "./domain/pendingItems.js";
export type { RunVerdict } from "./domain/runVerdict.js";

export { ALLOCATION_COUNTED_PREFIXES, nextClaimCode, unknownPartCarried } from "./domain/claimCodeAllocation.js";
export type { Allocation, AllocationRequest, ClaimCodeOccurrence, UnknownPart, UnknownPartCarried } from "./domain/claimCodeAllocation.js";

export { parseVitestEvidenceObservations } from "./parse/vitest.js";
export type { VitestJsonReport } from "./parse/vitest.js";
export { parseJunitEvidenceObservations, parsePytestEvidenceObservations } from "./parse/junit.js";
export type { JunitXmlReport } from "./parse/junit.js";
export { parseRspecEvidenceObservations } from "./parse/rspec.js";
export type { RspecJsonReport } from "./parse/rspec.js";
export { parseCucumberEvidenceObservations } from "./parse/cucumber.js";
export type { CucumberJsonReport } from "./parse/cucumber.js";
export type { StepRecord } from "./parse/ciStepRecord.js";
export { parseWorkflows } from "./parse/checkScriptsRunInCI.js";
export type { PackageJsonScripts, ParsedWorkflow } from "./parse/checkScriptsRunInCI.js";
export type { WorkflowStep } from "./domain/pipelineStep.js";
export type { Parsed, Source, SourceFault, SourcesParse } from "./parse/sourceParse.js";

export { assembleRenderInput } from "./assemble/renderInput.js";
export type { RenderInput, FeatureNames, ExitCodeOf } from "./domain/renderInput.js";
export type {
  EvidenceReconciliation,
  Summary,
  ClaimReconciliationTotals,
  ReconciliationLineTotals,
  MissingByQualityCheckKind,
} from "./assemble/renderInput.js";

export { evidenceReconciliationFromSources } from "./assemble/evidenceReconciliationFromSources.js";

export { renderJson, renderMarkdown, projectProvenance } from "./assemble/composers.js";
export { renderReport } from "./render/markdown.js";

export { projectProvenanceObject } from "./render/provenanceFacts.js";
export type { ProvenanceFacts, ProvenanceInput } from "./render/provenanceFacts.js";
export type { RunContext, RunInput, RunInputName, RunInputs, ProvenanceObject } from "./domain/runProvenance.js";

export { CLAIM_CODE_PREFIXES, featureCodeOf, isFeaturePart } from "./domain/featureCode.js";
export { relativizeToRoot } from "./lib/portablePath.js";

export { messagesFrom } from "./render/message.js";
export { CoreError } from "./render/messages.js";
export type { Message, MessageValues } from "./render/message.js";
