import { evidenceReconciliationOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceObservation } from "../model.js";
import { ciWorkflowSteps, type PackageJsonScripts } from "../parse/checkScriptsRunInCI.js";
import type { PipelineStep } from "../domain/pipelineStep.js";
import type { StepRecord } from "../domain/stepRecord.js";
import { ciStepRecordObservations } from "../parse/ciStepRecord.js";
import { fitnessFunctionsAmong, recognisedRunners } from "../parse/runningFitnessFunctions.js";
import { readTargetCorpus, type TargetCorpus } from "../parse/targetCorpus.js";
import { discoveryScope } from "../parse/discoveryScope.js";
import { stepAccounting } from "../parse/stepAccounting.js";
import { scenarioCodeErrorsOf, scenarioCodePopulationOf } from "../parse/scenarioCodeErrors.js";
import { qualifiedStepName } from "../parse/stepNames.js";
import { commandRuns } from "../parse/commandRuns.js";
import {
  isExcludedFromDiscovery,
  notChecksApplied,
  reconcilerSteps,
  type ReconcilerSteps,
  type StepExclusions,
} from "../domain/fitnessDiscovery.js";
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
  runnerTiers: Readonly<Record<string, string | null>>,
  isExcluded: StepExclusions["isExcluded"]
): EvidenceObservation[] {
  const recordAnswersCitingSteps = input.ciStepRecord !== undefined;
  return [
    ...input.behaviouralObservations,
    ...checkObservations(
      corpus,
      steps,
      packageJson,
      runnerTiers,
      isExcluded,
      recordAnswersCitingSteps
    ),
    ...ciStepRecordObservations(input.ciStepRecord),
  ];
}

export interface EvidenceReconciliationSources {
  readonly featureSources: readonly string[];
  readonly featureFiles?: readonly FeatureFileHeader[];
  readonly untaggedScenarios: readonly string[];
  readonly packageJson: TargetManifest;
  readonly ciSources: readonly string[];
  readonly ciSourceNames?: readonly string[];
  readonly reconcilerInvocation?: string;
  readonly behaviouralObservations: readonly EvidenceObservation[];
  readonly deferralTags: readonly string[];
  readonly ciStepRecord?: StepRecord;
}

interface FeatureFileHeader {
  readonly slug: string;
  readonly featureCode: string | null;
}

interface PipelineReadings {
  readonly steps: readonly PipelineStep[];
  readonly runners: ResolvedRunners;
  readonly exclusions: StepExclusions;
  readonly reconciler: ReconcilerSteps;
  readonly isExcluded: (step: PipelineStep) => boolean;
}

function pipelineReadings(input: EvidenceReconciliationSources): PipelineReadings {
  const { packageJson } = input;
  const steps = ciWorkflowSteps(input.ciSources);
  const ciSourceNames = input.ciSourceNames ?? [];
  const nameOf = (step: PipelineStep): string | undefined => qualifiedStepName(step, ciSourceNames);
  const exclusions = notChecksApplied(steps, nameOf, resolveNotChecks(packageJson));

  const runners = resolveRunners(packageJson);

  const invocation = input.reconcilerInvocation ?? "";
  const scripts = packageJson.scripts ?? {};
  const reconciler = reconcilerSteps(steps, nameOf, (command) =>
    commandRuns(command, invocation, scripts)
  );

  return {
    steps,
    runners,
    exclusions,
    reconciler,
    isExcluded: (step) => isExcludedFromDiscovery(step, reconciler, exclusions),
  };
}

export function evidenceReconciliationFromSources(
  input: EvidenceReconciliationSources
): EvidenceReconciliation {
  const { packageJson } = input;
  const corpus = readTargetCorpus(
    input.featureSources,
    resolveDeferralTags(packageJson, input.deferralTags)
  );

  const { steps, runners, exclusions, reconciler, isExcluded } = pipelineReadings(input);

  const reconciliation = evidenceReconciliationOf(
    corpus.scenarios,
    observationStreams(input, steps, corpus, packageJson, runners.tiers, isExcluded),
    [...input.untaggedScenarios],
    true,
    true
  );
  return withScenarioCodeErrors(
    withConfigurationAccount(
      withReaderAccounts(reconciliation, steps, input.ciSourceNames ?? [], packageJson, runners, exclusions, reconciler, isExcluded),
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
  if (input.featureFiles === undefined) return reconciliation;
  const files = input.featureFiles.map((header, i) => ({ ...header, source: input.featureSources[i] ?? "" }));
  return {
    ...reconciliation,
    scenarioCodeErrors: scenarioCodeErrorsOf(files),
    scenarioCodePopulation: scenarioCodePopulationOf(files),
  };
}

function withReaderAccounts(
  reconciliation: EvidenceReconciliation,
  steps: readonly PipelineStep[],
  ciSourceNames: readonly string[],
  packageJson: TargetManifest,
  runners: ResolvedRunners,
  exclusions: StepExclusions,
  reconciler: ReconcilerSteps,
  isExcluded: (step: PipelineStep) => boolean
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
      ciSourceNames,
      packageJson,
      runners.tiers,
      isExcluded
    ),
    steps,
    packageJson,
    runners.tiers,
    reconciler,
    exclusions,
    isExcluded
  );
}

function withStepAccounting(
  reconciliation: EvidenceReconciliation,
  steps: readonly PipelineStep[],
  packageJson: TargetManifest,
  runnerTiers: Readonly<Record<string, string | null>>,
  reconciler: ReconcilerSteps,
  exclusions: StepExclusions,
  isExcluded: (step: PipelineStep) => boolean
): EvidenceReconciliation {
  const accounting = stepAccounting(
    steps,
    packageJson,
    runnerTiers,
    reconciler.isReconciler,
    exclusions.isExcluded,
    isExcluded
  );
  if (accounting.stepsRead === 0) return reconciliation;
  return {
    ...reconciliation,
    summary: { ...reconciliation.summary, stepAccounting: accounting },
  };
}

function withScopeAccount(
  reconciliation: EvidenceReconciliation,
  steps: readonly PipelineStep[],
  ciSourceNames: readonly string[],
  packageJson: TargetManifest,
  runnerTiers: Readonly<Record<string, string | null>>,
  isExcluded: (step: PipelineStep) => boolean
): EvidenceReconciliation {
  const scope = discoveryScope(
    steps,
    ciSourceNames,
    packageJson,
    runnerTiers,
    isExcluded
  );
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
    packageJson,
    runnerTiers
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
  runnerTiers: Readonly<Record<string, string | null>>,
  isExcluded: StepExclusions["isExcluded"],
  recordAnswersCitingSteps: boolean
): EvidenceObservation[] {
  return [
    ...fitnessFunctionsAmong(
      steps,
      packageJson,
      runnerTiers,
      (_script, citedByStep) => corpus.citedRow(citedByStep),
      isExcluded
    ).filter((o) => !(recordAnswersCitingSteps && o.scnId !== undefined)),
  ];
}
