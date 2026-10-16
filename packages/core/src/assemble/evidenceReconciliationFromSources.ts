import { evidenceReconciliationOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceObservation } from "../model.js";
import type { PackageJsonScripts } from "../parse/checkScriptsRunInCI.js";
import type { PipelineStep } from "../domain/pipelineStep.js";
import type { StepRecord } from "../domain/stepRecord.js";
import { ciStepRecordObservations } from "../parse/ciStepRecord.js";
import { recognisedRunners, runningFitnessFunctions } from "../parse/runningFitnessFunctions.js";
import { readTargetCorpus, type TargetCorpus } from "../parse/targetCorpus.js";
import { stepExclusions, type StepExclusions } from "../parse/stepExclusions.js";
import { discoveryScope } from "../parse/discoveryScope.js";
import { stepAccounting } from "../parse/stepAccounting.js";
import { scenarioCodeErrorsOf, scenarioCodePopulationOf } from "../parse/scenarioCodeErrors.js";
import { reconcilerSteps, type ReconcilerSteps } from "../parse/reconcilerSteps.js";
import { isGitHubPlumbingStep } from "../parse/gitHubPlumbing.js";
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
    ciSources: readonly string[];
    ciStepRecord?: StepRecord;
  },
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
      input.ciSources,
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
  readonly runners: ResolvedRunners;
  readonly exclusions: StepExclusions;
  readonly reconciler: ReconcilerSteps;
  readonly isExcluded: (step: PipelineStep) => boolean;
}

function pipelineReadings(input: EvidenceReconciliationSources): PipelineReadings {
  const { packageJson } = input;
  const exclusions = stepExclusions(
    input.ciSources,
    input.ciSourceNames ?? [],
    resolveNotChecks(packageJson)
  );

  const runners = resolveRunners(packageJson);

  const reconciler = reconcilerSteps(
    input.ciSources,
    input.ciSourceNames ?? [],
    input.reconcilerInvocation ?? "",
    packageJson
  );

  return {
    runners,
    exclusions,
    reconciler,
    isExcluded: (step) =>
      reconciler.isReconciler(step) || exclusions.isExcluded(step) || isGitHubPlumbingStep(step),
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

  const { runners, exclusions, reconciler, isExcluded } = pipelineReadings(input);

  const reconciliation = evidenceReconciliationOf(
    corpus.scenarios,
    observationStreams(input, corpus, packageJson, runners.tiers, isExcluded),
    [...input.untaggedScenarios],
    true,
    true
  );
  return withScenarioCodeErrors(
    withConfigurationAccount(
      withReaderAccounts(reconciliation, input, packageJson, runners, exclusions, reconciler, isExcluded),
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
  input: { ciSources: readonly string[]; ciSourceNames?: readonly string[] },
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
          withRunnerAccount(reconciliation, input.ciSources, packageJson, runners),
          reconciler
        ),
        exclusions
      ),
      input,
      packageJson,
      runners.tiers,
      isExcluded
    ),
    input.ciSources,
    packageJson,
    runners.tiers,
    reconciler,
    exclusions,
    isExcluded
  );
}

function withStepAccounting(
  reconciliation: EvidenceReconciliation,
  ciSources: readonly string[],
  packageJson: TargetManifest,
  runnerTiers: Readonly<Record<string, string | null>>,
  reconciler: ReconcilerSteps,
  exclusions: StepExclusions,
  isExcluded: (step: PipelineStep) => boolean
): EvidenceReconciliation {
  const accounting = stepAccounting(
    ciSources,
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
  input: { ciSources: readonly string[]; ciSourceNames?: readonly string[] },
  packageJson: TargetManifest,
  runnerTiers: Readonly<Record<string, string | null>>,
  isExcluded: (step: PipelineStep) => boolean
): EvidenceReconciliation {
  const scope = discoveryScope(
    input.ciSources,
    input.ciSourceNames ?? [],
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
  ciSources: readonly string[],
  packageJson: TargetManifest,
  { tiers: runnerTiers, tiersWithoutRunner, unrecognisedKeys }: ResolvedRunners
): EvidenceReconciliation {
  const behaviouralRunners: readonly BehaviouralRunner[] = recognisedRunners(
    ciSources,
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
  ciSources: readonly string[],
  packageJson: TargetManifest,
  runnerTiers: Readonly<Record<string, string | null>>,
  isExcluded: StepExclusions["isExcluded"],
  recordAnswersCitingSteps: boolean
): EvidenceObservation[] {
  return [
    ...runningFitnessFunctions(
      ciSources,
      packageJson,
      runnerTiers,
      (_script, citedByStep) => corpus.citedRow(citedByStep),
      isExcluded
    ).filter((o) => !(recordAnswersCitingSteps && o.scnId !== undefined)),
  ];
}
