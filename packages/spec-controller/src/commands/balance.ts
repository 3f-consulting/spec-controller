import {
  claimReconciliationsOf,
  evidenceObservationsOf,
  executableClaimsOf,
  featureAsWrittenFrom,
  fitnessObservationsOf,
  markdownReportOf,
  provenanceOf,
  repositoryOfOrigin,
  resultsByFileFrom,
  runVerdictOf,
  shellAnswers,
  stepAccountOf,
  stepDispositionOf,
  stepRecordFrom,
  workflowStepsFrom,
  type ProvenanceInput,
  type StepAccount,
  type TargetConfiguration,
  type WorkflowStepAsWritten,
} from "@3f-consulting/spec-controller-core";
import { featureSourcesIn, jsonAt, workflowSourcesIn } from "../inputs/readFiles.js";
import { writeToStandardOutput } from "../output/standardOutput.js";
import { endRunOn } from "../runEnding/exitCode.js";
import { runIdentityIn } from "../runIdentity/runIdentity.js";
import { INPUT_KINDS, type InputRequest, type RunRequest } from "../runRequest/runRequest.js";

const NO_SETTINGS: TargetConfiguration = { runners: {}, nonChecks: [], deferralTags: [] };

const pathOf = (inputs: readonly InputRequest[], kind: InputRequest["kind"]): string | undefined => inputs.find((input) => input.kind === kind)?.path;

// An input the command line did not give reads as nothing.
const readEach = <Read>(path: string | undefined, read: (path: string) => readonly Read[]): readonly Read[] => (path === undefined ? [] : read(path));

// The step account is printed only for a run that was given workflows to read.
function stepAccountFor(workflows: string | undefined, steps: readonly WorkflowStepAsWritten[]): { readonly stepAccount?: StepAccount } {
  return workflows === undefined ? {} : { stepAccount: stepAccountOf(steps.map((step) => ({ step, disposition: stepDispositionOf(step, NO_SETTINGS, {}, shellAnswers) }))) };
}

// Every input the run could read, each with its path when it read one.
const provenanceInputsOf = (inputs: readonly InputRequest[]): ProvenanceInput[] => INPUT_KINDS.map((kind) => ({ name: kind, path: pathOf(inputs, kind) }));

export function balance({ inputs, target, sourceSha }: Extract<RunRequest, { command: "balance" }>, folder: string): void {
  // Read first, so the run's time is when it started.
  const identity = runIdentityIn(folder, { target, sourceSha });
  const workflows = pathOf(inputs, "workflows");
  const features = readEach(pathOf(inputs, "features"), featureSourcesIn).map(({ file, source }) => featureAsWrittenFrom(file, source));
  const steps = readEach(workflows, workflowSourcesIn).flatMap(({ workflow, source }) => workflowStepsFrom(workflow, source));
  const record = readEach(pathOf(inputs, "stepRecord"), (path) => stepRecordFrom(jsonAt(path)));
  const observations = [
    ...evidenceObservationsOf(readEach(pathOf(inputs, "vitest"), (path) => resultsByFileFrom(jsonAt(path)))),
    ...fitnessObservationsOf(steps, record, NO_SETTINGS, {}, shellAnswers),
  ];
  const claimReconciliations = claimReconciliationsOf(executableClaimsOf(features, { deferralTags: [], strict: false }), observations);
  const runVerdict = runVerdictOf(claimReconciliations);
  const provenance = provenanceOf(identity, provenanceInputsOf(inputs), identity.gitTopLevel ?? folder, repositoryOfOrigin);
  writeToStandardOutput(markdownReportOf({ runVerdict, provenance, ...stepAccountFor(workflows, steps) }));
  endRunOn(runVerdict);
}
