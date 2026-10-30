import { evidenceReconciliationOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceObservation, FitnessEvidenceObservation } from "../model.js";
import { pipelineStepsOf, type PackageJsonScripts, type ParsedWorkflow } from "../parse/checkScriptsRunInCI.js";
import type { PipelineStep } from "../domain/pipelineStep.js";
import { fitnessObservationsOf, recordedAtSteps } from "../domain/fitnessReconciliation.js";
import { recordedCheckStepsOf, type StepRecord } from "../parse/ciStepRecord.js";
import { fitnessFunctionsAmong } from "../parse/runningFitnessFunctions.js";
import { readTargetCorpus, type TargetCorpus } from "../parse/targetCorpus.js";
import { scenarioCodeErrorsOf, scenarioCodePopulationOf } from "../domain/scnTags.js";
import { untaggedScenariosOf, type ParsedFeatureFile } from "../parse/scenarios.js";
import { untaggedScenarioId } from "../domain/corpusCounts.js";
import { qualifiedStepName } from "../parse/stepNames.js";
import { commandRuns, shellReading } from "../parse/commandRuns.js";
import {
  declaredRunnerTest,
  nonChecksApplied,
  recognisedRunners,
  reconcilerSteps,
  stepAccountOf,
  stepDispositions,
  type ReconcilerRole,
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
import { ciStepsJoined, type BehaviouralRunner } from "../domain/evidenceReconciliation.js";
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
      recordedAtSteps(recordedCheckStepsOf(input.ciStepRecord), steps, qualifiedStepName)
    ),
  ];
}

export interface EvidenceReconciliationSources {
  readonly features: readonly ParsedFeatureFile[];
  readonly packageJson: TargetManifest;
  readonly ciWorkflows: readonly ParsedWorkflow[];
  readonly reconcilerInvocation?: string;
  readonly behaviouralObservations: readonly EvidenceObservation[];
  readonly deferralTags: readonly string[];
  readonly ciStepRecord?: StepRecord;
}

interface PipelineReadings {
  readonly steps: readonly PipelineStep[];
  readonly runners: ResolvedRunners;
  readonly exclusions: StepExclusions;
  readonly reconciler: ReconcilerSteps;
  readonly dispositionOf: (step: PipelineStep) => StepDisposition;
}

function pipelineReadings(input: EvidenceReconciliationSources): PipelineReadings {
  const { packageJson } = input;
  const steps = pipelineStepsOf(input.ciWorkflows);
  const exclusions = nonChecksApplied(steps, qualifiedStepName, resolveNotChecks(packageJson));

  const runners = resolveRunners(packageJson);

  const invocation = input.reconcilerInvocation ?? "";
  const scripts = packageJson.scripts ?? {};
  const reconciler = reconcilerSteps(steps, qualifiedStepName, (command) =>
    commandRuns(command, invocation, scripts)
  );

  const runsARunner = declaredRunnerTest(scripts, runners.tiers, shellReading);

  return {
    steps,
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

function untaggedScenariosAmong(features: readonly ParsedFeatureFile[]): string[] {
  return features.flatMap((parsed) =>
    untaggedScenariosOf(parsed).map((scenario) => untaggedScenarioId({ feature: parsed.file, scenario }))
  );
}

export function evidenceReconciliationFromSources(
  input: EvidenceReconciliationSources
): EvidenceReconciliation {
  const { packageJson } = input;
  const corpus = readTargetCorpus(
    input.features,
    resolveDeferralTags(packageJson, input.deferralTags)
  );

  const { steps, runners, exclusions, reconciler, dispositionOf } = pipelineReadings(input);
  const isCandidate: StepTest = (step) => dispositionOf(step) === "candidate";

  const reconciliation = evidenceReconciliationOf(
    corpus.scenarios,
    observationStreams(input, steps, corpus, packageJson, isCandidate),
    untaggedScenariosAmong(input.features)
  );
  return withScenarioCodeErrors(
    withConfigurationAccount(
      withReaderAccounts(reconciliation, steps, packageJson, runners, exclusions, reconciler, dispositionOf),
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
  packageJson: TargetManifest,
  runners: ResolvedRunners,
  exclusions: StepExclusions,
  reconciler: ReconcilerSteps,
  dispositionOf: (step: PipelineStep) => StepDisposition
): EvidenceReconciliation {
  return withStepAccounting(
    withUnmatchedNonChecks(withRunnerAccount(reconciliation, steps, packageJson, runners), exclusions),
    steps,
    dispositionOf,
    reconciler.roleOf
  );
}

function withStepAccounting(
  reconciliation: EvidenceReconciliation,
  steps: readonly PipelineStep[],
  dispositionOf: (step: PipelineStep) => StepDisposition,
  roleOf: ReconcilerRole
): EvidenceReconciliation {
  if (steps.length === 0) return reconciliation;
  return {
    ...reconciliation,
    summary: {
      ...reconciliation.summary,
      stepAccounting: stepAccountOf(steps, dispositionOf, qualifiedStepName, roleOf),
    },
  };
}

function withUnmatchedNonChecks(
  reconciliation: EvidenceReconciliation,
  { unmatchedEntries }: StepExclusions
): EvidenceReconciliation {
  if (unmatchedEntries.length === 0) return reconciliation;
  return {
    ...reconciliation,
    summary: { ...reconciliation.summary, nonChecksMatchingNoStep: unmatchedEntries },
  };
}

function withRunnerAccount(
  reconciliation: EvidenceReconciliation,
  steps: readonly PipelineStep[],
  packageJson: TargetManifest,
  { tiers: runnerTiers, unrecognisedKeys }: ResolvedRunners
): EvidenceReconciliation {
  const scripts = packageJson.scripts ?? {};
  const behaviouralRunners: readonly BehaviouralRunner[] = recognisedRunners(steps, scripts, runnerTiers, shellReading);
  const { evidenceObservations } = reconciliation.summary;
  return {
    ...reconciliation,
    summary: {
      ...reconciliation.summary,
      ...(evidenceObservations === undefined
        ? {}
        : {
            evidenceObservations: ciStepsJoined(
              evidenceObservations,
              reconciliation.ledger,
              behaviouralRunners,
              runnerTiers,
              steps.map(qualifiedStepName)
            ),
          }),
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
