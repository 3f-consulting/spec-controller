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
  stepDispositionOf,
  scriptsFrom,
  targetConfigurationFrom,
  type EvidenceObservation,
  type ProvenanceInput,
  type StepAccount,
  type TargetConfiguration,
  type WorkflowStepAsWritten,
} from "@3f-consulting/spec-controller-core";
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
const provenanceInputsOf = (requested: readonly InputRequest[], read: InputsRead): ProvenanceInput[] =>
  INPUT_KINDS.map((kind) => ({ name: kind, path: (kind === "features" || kind === "workflows" ? read[kind === "features" ? "features" : "workflowSteps"] : read[kind]) === undefined ? undefined : requested.find((input) => input.kind === kind)?.path }));

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
  // Read first, so the run's time is when it started.
  const identity = runIdentityIn(folder, { target, sourceSha });
  const { configuration, errors } = targetConfigurationFrom(read.manifest, read.workflowSteps ?? []);
  const scripts = scriptsFrom(read.manifest);
  const targetFolder = identity.gitTopLevel ?? folder;
  const claims = executableClaimsOf(read.features, { deferralTags: configuration.deferralTags, strict });
  const claimReconciliations = claimReconciliationsOf(claims, observationsOf(read, configuration, scripts, targetFolder));
  const provenance = provenanceOf(identity, provenanceInputsOf(inputs, read), targetFolder, repositoryOfOrigin);
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
