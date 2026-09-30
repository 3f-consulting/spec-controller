import { evidenceReconciliationOf } from "../domain/evidenceReconciliation.js";
import { bareTerm } from "../lib/bareTerm.js";
import type { EvidenceObservation } from "../model.js";
import type { CiWorkflowStep, PackageJsonScripts } from "../parse/checkScriptsRunInCI.js";
import { ciStepRecordCredits, type CiStepRecord } from "../parse/ciStepRecord.js";
import { recognisedRunners, runningStaticChecks } from "../parse/runningStaticChecks.js";
import { readTargetCorpus, type TargetCorpus } from "../parse/targetCorpus.js";
import { stepExclusions, type StepExclusions } from "../parse/stepExclusions.js";
import { discoveryScope } from "../parse/discoveryScope.js";
import { stepAccounting } from "../parse/stepAccounting.js";
import { scenarioCodeErrorsOf, scenarioCodePopulationOf } from "../parse/scenarioCodeErrors.js";
import { reconcilerSteps, type ReconcilerSteps } from "../parse/reconcilerSteps.js";
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
  specController?: {
    deferralTags?: unknown;
    runners?: unknown;
    notChecks?: unknown;
  };
};

function observationStreams(
  input: {
    runtimeObservations: readonly EvidenceObservation[];
    ciSources: readonly string[];
    ciStepRecord?: CiStepRecord;
  },
  corpus: TargetCorpus,
  packageJson: TargetManifest,
  runnerTiers: Readonly<Record<string, string | null>>,
  isExcluded: StepExclusions["isExcluded"]
): EvidenceObservation[] {
  const recordAnswersCitingSteps = input.ciStepRecord !== undefined;
  return [
    ...input.runtimeObservations,
    ...checkObservations(
      corpus,
      input.ciSources,
      packageJson,
      runnerTiers,
      isExcluded,
      recordAnswersCitingSteps
    ),
    ...ciStepRecordCredits(input.ciStepRecord),
  ];
}

export interface EvidenceReconciliationSources {
  featureSources: readonly string[];
  featureFiles?: readonly FeatureFileHeader[];
  untaggedScenarios: readonly string[];
  packageJson: TargetManifest;
  ciSources: readonly string[];
  ciSourceNames?: readonly string[];
  reconcilerInvocation?: string;
  runtimeObservations: readonly EvidenceObservation[];
  deferralTags: readonly string[];
  ciStepRecord?: CiStepRecord;
}

export interface FeatureFileHeader {
  readonly slug: string;
  readonly featureCode: string | null;
}

interface PipelineReadings {
  readonly runners: ResolvedRunners;
  readonly exclusions: StepExclusions;
  readonly reconciler: ReconcilerSteps;
  readonly isExcluded: (step: CiWorkflowStep) => boolean;
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
    isExcluded: (step) => reconciler.isReconciler(step) || exclusions.isExcluded(step),
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
      withReaderAccounts(reconciliation, corpus, input, packageJson, runners, exclusions, reconciler, isExcluded),
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
  if (wrongKinds.length === 0 && unknownKeys.length === 0) return reconciliation;
  return {
    ...reconciliation,
    summary: {
      ...reconciliation.summary,
      ...(wrongKinds.length > 0 ? { wrongKindConfiguration: wrongKinds } : {}),
      ...(unknownKeys.length > 0 ? { unknownConfigurationKeys: unknownKeys } : {}),
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
  corpus: TargetCorpus,
  input: { ciSources: readonly string[]; ciSourceNames?: readonly string[] },
  packageJson: TargetManifest,
  runners: ResolvedRunners,
  exclusions: StepExclusions,
  reconciler: ReconcilerSteps,
  isExcluded: (step: CiWorkflowStep) => boolean
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
    exclusions
  );
}

function withStepAccounting(
  reconciliation: EvidenceReconciliation,
  ciSources: readonly string[],
  packageJson: TargetManifest,
  runnerTiers: Readonly<Record<string, string | null>>,
  reconciler: ReconcilerSteps,
  exclusions: StepExclusions
): EvidenceReconciliation {
  const accounting = stepAccounting(
    ciSources,
    packageJson,
    runnerTiers,
    reconciler.isReconciler,
    exclusions.isExcluded
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
  isExcluded: (step: CiWorkflowStep) => boolean
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
  if (excluded.length === 0 && unmatchedEntries.length === 0) return reconciliation;
  return {
    ...reconciliation,
    summary: {
      ...reconciliation.summary,
      ...(excluded.length > 0 ? { excludedSteps: excluded } : {}),
      ...(unmatchedEntries.length > 0 ? { unmatchedNotChecks: unmatchedEntries } : {}),
    },
  };
}

function withRunnerAccount(
  reconciliation: EvidenceReconciliation,
  ciSources: readonly string[],
  packageJson: TargetManifest,
  { tiers: runnerTiers, unrecognisedKeys }: ResolvedRunners
): EvidenceReconciliation {
  const behaviouralRunners: readonly BehaviouralRunner[] = recognisedRunners(
    ciSources,
    packageJson,
    runnerTiers
  );
  const named = Object.keys(runnerTiers).length > 0;
  if (behaviouralRunners.length === 0 && !named && unrecognisedKeys.length === 0) {
    return reconciliation;
  }
  return {
    ...reconciliation,
    summary: {
      ...reconciliation.summary,
      ...(behaviouralRunners.length > 0 ? { behaviouralRunners } : {}),
      ...(named ? { runnerTiers } : {}),
      ...(unrecognisedKeys.length > 0 ? { unrecognisedRunnerKeys: unrecognisedKeys } : {}),
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
    ...runningStaticChecks(
      ciSources,
      packageJson,
      runnerTiers,
      (_script, citedByStep) => corpus.citedRow(citedByStep),
      isExcluded
    ).filter((o) => !(recordAnswersCitingSteps && o.scnId !== undefined)),
  ];
}
