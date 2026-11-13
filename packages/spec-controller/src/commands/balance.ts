import {
  claimReconciliationsOf,
  evidenceObservationsOf,
  executableClaimsOf,
  featureAsWrittenFrom,
  fitnessObservationsOf,
  markdownReportOf,
  resultsByFileFrom,
  runVerdictOf,
  shellAnswers,
  stepAccountOf,
  stepDispositionOf,
  stepRecordFrom,
  workflowStepsFrom,
  type StepAccount,
  type TargetConfiguration,
  type WorkflowStepAsWritten,
} from "@3f-consulting/spec-controller-core";
import { featureSourcesIn, jsonAt, workflowSourcesIn } from "../inputs/readFiles.js";
import { writeToStandardOutput } from "../output/standardOutput.js";
import { endRunOn } from "../runEnding/exitCode.js";
import type { InputRequest } from "../runRequest/runRequest.js";

const NO_SETTINGS: TargetConfiguration = { runners: {}, nonChecks: [], deferralTags: [] };

const pathOf = (inputs: readonly InputRequest[], kind: InputRequest["kind"]): string | undefined => inputs.find((input) => input.kind === kind)?.path;

// An input the command line did not give reads as nothing.
const readEach = <Read>(path: string | undefined, read: (path: string) => readonly Read[]): readonly Read[] => (path === undefined ? [] : read(path));

// The step account is printed only for a run that was given workflows to read.
function stepAccountFor(workflows: string | undefined, steps: readonly WorkflowStepAsWritten[]): { readonly stepAccount?: StepAccount } {
  return workflows === undefined ? {} : { stepAccount: stepAccountOf(steps.map((step) => ({ step, disposition: stepDispositionOf(step, NO_SETTINGS, {}, shellAnswers) }))) };
}

export function balance(inputs: readonly InputRequest[]): void {
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
  writeToStandardOutput(markdownReportOf({ runVerdict, ...stepAccountFor(workflows, steps) }));
  endRunOn(runVerdict);
}
