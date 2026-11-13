import type {
  FeatureAsWritten,
  ResultsByExampleAsWritten,
  ResultsByFileAsWritten,
  ResultsBySuiteAsWritten,
  ScenarioResultAsWritten,
  StepRecordEntryAsWritten,
  WorkflowStepAsWritten,
} from "@3f-consulting/spec-controller-core";
import type { UsageError } from "../runRequest/runRequest.js";
import type { InputRequest } from "../runRequest/runRequest.js";

// Every input the run read, each as its reader reports it; an input not read is absent.
export interface InputsRead {
  readonly features: readonly FeatureAsWritten[];
  readonly workflowSteps?: readonly WorkflowStepAsWritten[];
  readonly vitest?: readonly ResultsByFileAsWritten[];
  readonly jest?: readonly ResultsByFileAsWritten[];
  readonly pytest?: readonly ResultsBySuiteAsWritten[];
  readonly junit?: readonly ResultsBySuiteAsWritten[];
  readonly rspec?: ResultsByExampleAsWritten;
  readonly cucumber?: readonly ScenarioResultAsWritten[];
  readonly stepRecord?: readonly StepRecordEntryAsWritten[];
  readonly manifest?: unknown;
  // Every file read, so no report lands on one.
  readonly filesRead: readonly string[];
}

export function inputsReadFor(_inputs: readonly InputRequest[], _folder: string): InputsRead | UsageError {
  return { features: [], filesRead: [] };
}
