import {
  claimCodeErrorsOf,
  claimReconciliationsOf,
  evidenceReconciliationOf,
  executableClaimsOf,
  fitnessObservationsOf,
  observationsByExample,
  observationsByFile,
  observationsBySuite,
  observationsOfScenarios,
  provenanceOf,
  repositoryOfOrigin,
  shellAnswers,
  stepAccountOf,
  targetFolderOf,
  stepDispositionOf,
  scriptsFrom,
  targetConfigurationFrom,
  type EvidenceObservation,
  type ProvenanceInput,
  type StepAccount,
  type TargetConfiguration,
  type WorkflowStepAsWritten,
} from "@3f-consulting/spec-controller-core";
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { inputsReadFor, type InputsRead } from "../inputs/inputsRead.js";
import type { StandardStreams } from "../output/streams.js";
import type { Complain } from "../runEnding/crashGuards.js";
import { exitCodeOf } from "../runEnding/exitCode.js";
import { refusedWith } from "../runEnding/refusal.js";
import type { ExitCode } from "../runEnding/runEnding.js";
import { runIdentityIn } from "../runIdentity/runIdentity.js";
import { writeReports } from "../output/writer.js";
import { INPUT_KINDS, type InputRequest, type RunRequest } from "../runRequest/runRequest.js";

// A run has no step and no step record of an input it did not read.
const NONE: readonly never[] = [];

// The step account is printed only for a run that read a workflow step.
function stepAccountFor(
  steps: readonly WorkflowStepAsWritten[],
  configuration: TargetConfiguration,
  scripts: Readonly<Record<string, string>>,
): { readonly stepAccount?: StepAccount } {
  return steps.length === 0 ? {} : { stepAccount: stepAccountOf(steps.map((step) => ({ step, disposition: stepDispositionOf(step, configuration, scripts, shellAnswers) }))) };
}

// Every input the run could read, each with the path it read, its links followed, when it read one.
const provenanceInputsOf = ({ pathsRead }: InputsRead, folder: string): ProvenanceInput[] =>
  INPUT_KINDS.map((kind) => ({ name: kind, path: pathsRead[kind] && realpathSync(resolve(folder, pathsRead[kind])) }));

// A corpus the command line named is where the target is; with none named, it is where the run started.
const corpusNamed = (inputs: readonly InputRequest[], folder: string): string | undefined => {
  const corpus = inputs.find((input) => input.kind === "features" && !input.byDefault);
  return corpus === undefined ? undefined : resolve(folder, corpus.path);
};

// Each runner's results posted as Evidence Observations, beside the fitness functions' from the CI steps.
function observationsOf(
  read: InputsRead,
  steps: readonly WorkflowStepAsWritten[],
  configuration: TargetConfiguration,
  scripts: Readonly<Record<string, string>>,
  targetFolder: string,
): EvidenceObservation[] {
  return [
    ...observationsByFile([...(read.vitest ?? []), ...(read.jest ?? [])], targetFolder),
    ...observationsBySuite([...(read.pytest ?? []), ...(read.junit ?? [])], targetFolder),
    ...(read.rspec === undefined ? [] : observationsByExample(read.rspec, targetFolder)),
    ...(read.cucumber === undefined ? [] : observationsOfScenarios(read.cucumber, read.features, targetFolder)),
    ...fitnessObservationsOf(steps, read.stepRecord ?? NONE, configuration, scripts, shellAnswers),
  ];
}

export function balance(
  { inputs, outputs, target, sourceSha, strict, exitZero }: Extract<RunRequest, { command: "balance" }>,
  folder: string,
  streams: StandardStreams,
  complain: Complain,
): ExitCode {
  const corpus = corpusNamed(inputs, folder);
  // Read first, so the run's time is when it started.
  const identity = runIdentityIn(corpus ?? folder, { target, sourceSha });
  const read = inputsReadFor(inputs, folder);
  if ("refusals" in read) return refusedWith(read.refusals, streams.error.write);
  const steps = read.workflowSteps ?? NONE;
  const { configuration, errors } = targetConfigurationFrom(read.manifest, steps);
  const scripts = scriptsFrom(read.manifest);
  // git gives its top level with every link followed, so the folders and paths it is compared with follow theirs too.
  const targetFolder = targetFolderOf({ workingFolder: realpathSync(folder), corpus: corpus && realpathSync(corpus), gitTopLevel: identity.gitTopLevel });
  const claims = executableClaimsOf(read.features, { deferralTags: configuration.deferralTags, strict });
  const claimReconciliations = claimReconciliationsOf(claims, observationsOf(read, steps, configuration, scripts, targetFolder));
  const provenance = provenanceOf(identity, provenanceInputsOf(read, folder), targetFolder, repositoryOfOrigin);
  const reconciliation = evidenceReconciliationOf({
    claimReconciliations,
    claimCodeErrors: claimCodeErrorsOf(read.features),
    configurationErrors: errors,
    features: read.features,
    ...stepAccountFor(steps, configuration, scripts),
    provenance,
  });
  try {
    return writeReports(outputs, read.filesRead, reconciliation, streams, { exitZero });
  } catch (error) {
    // The run has its verdict, so an error in writing it out leaves the verdict's exit code alone.
    complain(error);
    return exitCodeOf(reconciliation.runVerdict, { exitZero });
  }
}
