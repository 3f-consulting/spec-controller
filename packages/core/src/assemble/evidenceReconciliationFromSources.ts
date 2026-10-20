import { evidenceReconciliationOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceObservation, FitnessEvidenceObservation } from "../model.js";
import { pipelineStepsOf, type PackageJsonScripts, type ParsedWorkflow } from "../parse/checkScriptsRunInCI.js";
import type { PipelineStep } from "../domain/pipelineStep.js";
import { fitnessObservationsOf } from "../domain/fitnessReconciliation.js";
import { recordedCheckStepsOf, type StepRecord } from "../parse/ciStepRecord.js";
import { fitnessFunctionsAmong } from "../parse/runningFitnessFunctions.js";
import { readTargetCorpus, type TargetCorpus } from "../parse/targetCorpus.js";
import { scenarioCodeErrorsOf, scenarioCodePopulationOf } from "../domain/scnTags.js";
import type { ParsedFeatureFile } from "../parse/scenarios.js";
import { qualifiedStepName } from "../parse/stepNames.js";
import { commandRuns, shellReading } from "../parse/commandRuns.js";
import {
  declaredRunnerTest,
  discoveryScope,
  notChecksApplied,
  recognisedRunners,
  reconcilerSteps,
  stepAccounting,
  stepDispositions,
  type ReconcilerSteps,
  type StepDisposition,
  type StepExclusions,
  type StepTest,
} from "../domain/uncitedFitnessFunctions.js";
import {
  configurationNotRead,
  resolveDeferralTags,
  resolveNotChecks,
  resolveRunners,
  type ResolvedRunners,
} from "../parse/targetManifest.js";
import type { BehaviouralRunner } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "./renderInput.js";

type TargetManifest = PackageJsonScripts & {
  readonly specController?: {
    readonly deferralTags?: unknown;
    readonly runners?: unknown;
    readonly notChecks?: unknown;
  };
};

function observationStreams(
  input: {
    behaviouralObservations: readonly EvidenceObservation[];
    ciStepRecord?: StepRecord;
  },
  steps: readonly PipelineStep[],
  corpus: TargetCorpus,
  packageJson: TargetManifest,
  isCandidate: StepTest
): EvidenceObservation[] {
  return [
    ...input.behaviouralObservations,
    ...fitnessObservationsOf(
      checkObservations(corpus, steps, packageJson, isCandidate),
      recordedCheckStepsOf(input.ciStepRecord)
    ),
  ];
}

export interface EvidenceReconciliationSources {
  readonly features: readonly ParsedFeatureFile[];
  readonly untaggedScenarios: readonly string[];
  readonly packageJson: TargetManifest;
  readonly ciWorkflows: readonly ParsedWorkflow[];
  readonly reconcilerInvocation?: string;
  readonly behaviouralObservations: readonly EvidenceObservation[];
  readonly deferralTags: readonly string[];
  readonly ciStepRecord?: StepRecord;
}

interface PipelineReadings {
  readonly steps: readonly PipelineStep[];
  readonly workflowNames: readonly string[];
  readonly runners: ResolvedRunners;
  readonly exclusions: StepExclusions;
  readonly reconciler: ReconcilerSteps;
  readonly dispositionOf: (step: PipelineStep) => StepDisposition;
}

function pipelineReadings(input: EvidenceReconciliationSources): PipelineReadings {
  const { packageJson } = input;
  const steps = pipelineStepsOf(input.ciWorkflows);
  const workflowNames = input.ciWorkflows.map(({ file }) => file);
  const nameOf = (step: PipelineStep): string | undefined => qualifiedStepName(step, workflowNames);
  const exclusions = notChecksApplied(steps, nameOf, resolveNotChecks(packageJson));

  const runners = resolveRunners(packageJson);

  const invocation = input.reconcilerInvocation ?? "";
  const scripts = packageJson.scripts ?? {};
  const reconciler = reconcilerSteps(steps, nameOf, (command) =>
    commandRuns(command, invocation, scripts)
  );

  const runsARunner = declaredRunnerTest(scripts, runners.tiers, shellReading);

  return {
    steps,
    workflowNames,
    runners,
    exclusions,
    reconciler,
    dispositionOf: stepDispositions({
      isReconciler: reconciler.isReconciler,
      isNamedANonCheck: exclusions.isExcluded,
      runsARunner,
    }),
  };
}

export function evidenceReconciliationFromSources(
  input: EvidenceReconciliationSources
): EvidenceReconciliation {
  const { packageJson } = input;
  const corpus = readTargetCorpus(
    input.features,
    resolveDeferralTags(packageJson, input.deferralTags)
  );

  const { steps, workflowNames, runners, exclusions, reconciler, dispositionOf } = pipelineReadings(input);
  const isCandidate: StepTest = (step) => dispositionOf(step) === "candidate";

  const reconciliation = evidenceReconciliationOf(
    corpus.scenarios,
    observationStreams(input, steps, corpus, packageJson, isCandidate),
    [...input.untaggedScenarios],
    true,
    true
  );
  return withScenarioCodeErrors(
    withConfigurationAccount(
      withReaderAccounts(reconciliation, steps, workflowNames, packageJson, runners, exclusions, reconciler, dispositionOf),
      packageJson
    ),
    input
  );
}

function withConfigurationAccount(
  reconciliation: EvidenceReconciliation,
  packageJson: TargetManifest
): EvidenceReconciliation {
  const { wrongKinds, unknownKeys } = configurationNotRead(packageJson);
  return {
    ...reconciliation,
    summary: {
      ...reconciliation.summary,
      ...(wrongKinds.length > 0 ? { configurationOfWrongKind: wrongKinds } : {}),
      ...(unknownKeys.length > 0 ? { configurationKeysNotRead: unknownKeys } : {}),
    },
  };
}

function withScenarioCodeErrors(
  reconciliation: EvidenceReconciliation,
  input: EvidenceReconciliationSources
): EvidenceReconciliation {
  return {
    ...reconciliation,
    scenarioCodeErrors: scenarioCodeErrorsOf(input.features),
    scenarioCodePopulation: scenarioCodePopulationOf(input.features),
  };
}

function withReaderAccounts(
  reconciliation: EvidenceReconciliation,
  steps: readonly PipelineStep[],
  workflowNames: readonly string[],
  packageJson: TargetManifest,
  runners: ResolvedRunners,
  exclusions: StepExclusions,
  reconciler: ReconcilerSteps,
  dispositionOf: (step: PipelineStep) => StepDisposition
): EvidenceReconciliation {
  return withStepAccounting(
    withScopeAccount(
      withExclusionAccount(
        withReconcilerAccount(
          withRunnerAccount(reconciliation, steps, packageJson, runners),
          reconciler
        ),
        exclusions
      ),
      steps,
      workflowNames,
      dispositionOf
    ),
    steps,
    dispositionOf
  );
}

function withStepAccounting(
  reconciliation: EvidenceReconciliation,
  steps: readonly PipelineStep[],
  dispositionOf: (step: PipelineStep) => StepDisposition
): EvidenceReconciliation {
  const accounting = stepAccounting(steps, dispositionOf);
  if (accounting.stepsRead === 0) return reconciliation;
  return {
    ...reconciliation,
    summary: { ...reconciliation.summary, stepAccounting: accounting },
  };
}

function withScopeAccount(
  reconciliation: EvidenceReconciliation,
  steps: readonly PipelineStep[],
  workflowNames: readonly string[],
  dispositionOf: (step: PipelineStep) => StepDisposition
): EvidenceReconciliation {
  const scope = discoveryScope(steps, workflowNames, dispositionOf);
  if (scope.length === 0) return reconciliation;
  return { ...reconciliation, summary: { ...reconciliation.summary, discoveryScope: scope } };
}

function withReconcilerAccount(
  reconciliation: EvidenceReconciliation,
  reconciler: ReconcilerSteps
): EvidenceReconciliation {
  if (reconciler.steps.length === 0) return reconciliation;
  return {
    ...reconciliation,
    summary: { ...reconciliation.summary, reconcilerSteps: reconciler.steps },
  };
}

function withExclusionAccount(
  reconciliation: EvidenceReconciliation,
  exclusions: StepExclusions
): EvidenceReconciliation {
  const { excluded, unmatchedEntries } = exclusions;
  return {
    ...reconciliation,
    summary: {
      ...reconciliation.summary,
      ...(excluded.length > 0 ? { excludedSteps: excluded } : {}),
      ...(unmatchedEntries.length > 0 ? { nonChecksMatchingNoStep: unmatchedEntries } : {}),
    },
  };
}

function withRunnerAccount(
  reconciliation: EvidenceReconciliation,
  steps: readonly PipelineStep[],
  packageJson: TargetManifest,
  { tiers: runnerTiers, tiersWithoutRunner, unrecognisedKeys }: ResolvedRunners
): EvidenceReconciliation {
  const behaviouralRunners: readonly BehaviouralRunner[] = recognisedRunners(
    steps,
    packageJson.scripts ?? {},
    runnerTiers,
    shellReading
  );
  return {
    ...reconciliation,
    summary: {
      ...reconciliation.summary,
      ...(behaviouralRunners.length > 0 ? { behaviouralRunners } : {}),
      ...(tiersWithoutRunner.length > 0 ? { tiersWithoutRunner } : {}),
      ...(unrecognisedKeys.length > 0 ? { runnerKeysNotATier: unrecognisedKeys } : {}),
    },
  };
}

function checkObservations(
  corpus: TargetCorpus,
  steps: readonly PipelineStep[],
  packageJson: TargetManifest,
  isCandidate: StepTest
): FitnessEvidenceObservation[] {
  return fitnessFunctionsAmong(steps, packageJson, isCandidate, (_script, citedByStep) =>
    corpus.citedRow(citedByStep)
  );
}
