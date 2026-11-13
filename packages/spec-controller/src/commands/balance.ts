import {
  claimCodeErrorsOf,
  claimReconciliationsOf,
  evidenceReconciliationOf,
  executableClaimsOf,
  featureAsWrittenFrom,
  fitnessObservationsOf,
  observationsByFile,
  provenanceOf,
  repositoryOfOrigin,
  resultsByFileFrom,
  shellAnswers,
  stepAccountOf,
  stepDispositionOf,
  scriptsFrom,
  stepRecordFrom,
  targetConfigurationFrom,
  workflowStepsFrom,
  type ProvenanceInput,
  type StepAccount,
  type TargetConfiguration,
  type WorkflowStepAsWritten,
} from "@3f-consulting/spec-controller-core";
import { join } from "node:path";
import { featureSourcesIn, jsonAt, workflowSourcesIn } from "../inputs/readFiles.js";
import type { StandardStreams } from "../output/streams.js";
import type { ExitCode } from "../runEnding/runEnding.js";
import { runIdentityIn } from "../runIdentity/runIdentity.js";
import { writeReports } from "../output/writer.js";
import { INPUT_KINDS, type InputRequest, type RunRequest } from "../runRequest/runRequest.js";

// Only an input the command line named is read.
const pathOf = (inputs: readonly InputRequest[], kind: InputRequest["kind"]): string | undefined => inputs.find((input) => input.kind === kind && !input.byDefault)?.path;

// An input the command line did not give reads as nothing.
const readEach = <Read>(path: string | undefined, read: (path: string) => readonly Read[]): readonly Read[] => (path === undefined ? [] : read(path));

// The step account is printed only for a run that was given workflows to read.
function stepAccountFor(
  workflows: string | undefined,
  steps: readonly WorkflowStepAsWritten[],
  configuration: TargetConfiguration,
  scripts: Readonly<Record<string, string>>,
): { readonly stepAccount?: StepAccount } {
  return workflows === undefined ? {} : { stepAccount: stepAccountOf(steps.map((step) => ({ step, disposition: stepDispositionOf(step, configuration, scripts, shellAnswers) }))) };
}

// Every input the run could read, each with its path when it read one.
const provenanceInputsOf = (inputs: readonly InputRequest[]): ProvenanceInput[] => INPUT_KINDS.map((kind) => ({ name: kind, path: pathOf(inputs, kind) }));

export function balance({ inputs, outputs, target, sourceSha }: Extract<RunRequest, { command: "balance" }>, folder: string, streams: StandardStreams): ExitCode {
  // Read first, so the run's time is when it started.
  const identity = runIdentityIn(folder, { target, sourceSha });
  const workflows = pathOf(inputs, "workflows");
  const featureFolder = pathOf(inputs, "features");
  const featureSources = readEach(featureFolder, featureSourcesIn);
  const workflowSources = readEach(workflows, workflowSourcesIn);
  const features = featureSources.map(({ file, source }) => featureAsWrittenFrom(file, source));
  const steps = workflowSources.flatMap(({ workflow, source }) => workflowStepsFrom(workflow, source));
  const record = readEach(pathOf(inputs, "stepRecord"), (path) => stepRecordFrom(jsonAt(path)));
  const manifestPath = pathOf(inputs, "manifest");
  const manifest = manifestPath === undefined ? undefined : jsonAt(manifestPath);
  const { configuration, errors } = targetConfigurationFrom(manifest, steps);
  const scripts = scriptsFrom(manifest);
  const targetFolder = identity.gitTopLevel ?? folder;
  const observations = [
    ...observationsByFile(readEach(pathOf(inputs, "vitest"), (path) => resultsByFileFrom(jsonAt(path), "vitest")), targetFolder),
    ...fitnessObservationsOf(steps, record, configuration, scripts, shellAnswers),
  ];
  const claimReconciliations = claimReconciliationsOf(executableClaimsOf(features, { deferralTags: configuration.deferralTags, strict: false }), observations);
  const provenance = provenanceOf(identity, provenanceInputsOf(inputs), targetFolder, repositoryOfOrigin);
  // No report may land on a file the run read: each one it was given, and each it read in a folder it was given.
  const filesRead = [
    ...featureSources.map(({ file }) => join(featureFolder ?? "", file)),
    ...workflowSources.map(({ workflow }) => join(workflows ?? "", workflow)),
    ...[pathOf(inputs, "vitest"), pathOf(inputs, "stepRecord"), pathOf(inputs, "manifest")].filter((path) => path !== undefined),
  ];
  const reconciliation = evidenceReconciliationOf({
    claimReconciliations,
    claimCodeErrors: claimCodeErrorsOf(features),
    configurationErrors: errors,
    features,
    ...stepAccountFor(workflows, steps, configuration, scripts),
    provenance,
  });
  return writeReports(outputs, filesRead, reconciliation, streams);
}
