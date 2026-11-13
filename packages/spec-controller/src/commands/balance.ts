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
import { resolve } from "node:path";
import type { InputsRead } from "../inputs/inputsRead.js";
import type { StandardStreams } from "../output/streams.js";
import type { ExitCode } from "../runEnding/runEnding.js";
import { runIdentityIn } from "../runIdentity/runIdentity.js";
import { writeReports } from "../output/writer.js";
import { INPUT_KINDS, type InputRequest, type RunRequest } from "../runRequest/runRequest.js";

// The step account is printed only for a run that read workflows.
function stepAccountFor(
  steps: readonly WorkflowStepAsWritten[] | undefined,
  configuration: TargetConfiguration,
  scripts: Readonly<Record<string, string>>,
): { readonly stepAccount?: StepAccount } {
  return steps === undefined ? {} : { stepAccount: stepAccountOf(steps.map((step) => ({ step, disposition: stepDispositionOf(step, configuration, scripts, shellAnswers) }))) };
}

// Every input the run could read, each with its path when it read one.
const provenanceInputsOf = ({ pathsRead }: InputsRead): ProvenanceInput[] => INPUT_KINDS.map((kind) => ({ name: kind, path: pathsRead[kind] }));

// A corpus the command line named is where the target is; with none named, it is where the run started.
const corpusNamed = (inputs: readonly InputRequest[], folder: string): string | undefined => {
  const corpus = inputs.find((input) => input.kind === "features" && !input.byDefault);
  return corpus === undefined ? undefined : resolve(folder, corpus.path);
};

// Each runner's results posted as Evidence Observations, beside the fitness functions' from the CI steps.
function observationsOf(read: InputsRead, configuration: TargetConfiguration, scripts: Readonly<Record<string, string>>, targetFolder: string): EvidenceObservation[] {
  const steps = read.workflowSteps ?? [];
  return [
    ...observationsByFile([...(read.vitest ?? []), ...(read.jest ?? [])], targetFolder),
    ...observationsBySuite([...(read.pytest ?? []), ...(read.junit ?? [])], targetFolder),
    ...(read.rspec === undefined ? [] : observationsByExample(read.rspec, targetFolder)),
    ...(read.cucumber === undefined ? [] : observationsOfScenarios(read.cucumber, read.features, targetFolder)),
    ...fitnessObservationsOf(steps, read.stepRecord ?? [], configuration, scripts, shellAnswers),
  ];
}

export function balance(
  { inputs, outputs, target, sourceSha, strict, exitZero }: Extract<RunRequest, { command: "balance" }>,
  read: InputsRead,
  folder: string,
  streams: StandardStreams,
): ExitCode {
  const corpus = corpusNamed(inputs, folder);
  // Read first, so the run's time is when it started.
  const identity = runIdentityIn(corpus ?? folder, { target, sourceSha });
  const { configuration, errors } = targetConfigurationFrom(read.manifest, read.workflowSteps ?? []);
  const scripts = scriptsFrom(read.manifest);
  const targetFolder = targetFolderOf({ workingFolder: folder, ...(corpus === undefined ? {} : { corpus }), ...(identity.gitTopLevel === undefined ? {} : { gitTopLevel: identity.gitTopLevel }) });
  const claims = executableClaimsOf(read.features, { deferralTags: configuration.deferralTags, strict });
  const claimReconciliations = claimReconciliationsOf(claims, observationsOf(read, configuration, scripts, targetFolder));
  const provenance = provenanceOf(identity, provenanceInputsOf(read), targetFolder, repositoryOfOrigin);
  const reconciliation = evidenceReconciliationOf({
    claimReconciliations,
    claimCodeErrors: claimCodeErrorsOf(read.features),
    configurationErrors: errors,
    features: read.features,
    ...stepAccountFor(read.workflowSteps, configuration, scripts),
    provenance,
  });
  return writeReports(outputs, read.filesRead, reconciliation, streams, { exitZero });
}
