import { ciWorkflowSteps } from "./checkScriptsRunInCI.js";
import type { PipelineStep } from "../domain/pipelineStep.js";
import { commandRuns } from "./commandRuns.js";
import { qualifiedStepName } from "./stepNames.js";
import type { ReconcilerStep } from "../domain/evidenceReconciliation.js";

export interface ReconcilerSteps {
  readonly steps: readonly ReconcilerStep[];
  readonly isReconciler: (step: PipelineStep) => boolean;
}

const STEP_RECORD_EXPRESSION = "tojson(steps)";

function producesTheStepRecord(step: PipelineStep): boolean {
  const written = "runs" in step ? [...step.env, step.runs] : step.env;
  return written.some((text) =>
    text.replace(/\s/g, "").toLowerCase().includes(STEP_RECORD_EXPRESSION)
  );
}

function roleOf(
  step: PipelineStep,
  invocation: string,
  scripts: Readonly<Record<string, string>>
): ReconcilerStep["role"] | undefined {
  if ("runs" in step && commandRuns(step.runs, invocation, scripts)) return "reconciles";
  return producesTheStepRecord(step) ? "records" : undefined;
}

export function reconcilerSteps(
  ciSources: readonly string[],
  ciSourceNames: readonly string[],
  invocation: string,
  packageJson: { scripts?: Record<string, string> }
): ReconcilerSteps {
  const scripts = packageJson.scripts ?? {};
  return {
    steps: ciWorkflowSteps(ciSources).flatMap((step) => {
      const role = roleOf(step, invocation, scripts);
      return role === undefined
        ? []
        : [{ step: qualifiedStepName(step, ciSourceNames) ?? step.identity, role }];
    }),
    isReconciler: (step) => roleOf(step, invocation, scripts) !== undefined,
  };
}
