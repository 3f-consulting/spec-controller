import { ciWorkflowSteps, type CiWorkflowStep } from "./checkScriptsRunInCI.js";
import { commandRuns } from "./commandRuns.js";
import { qualifiedStepName } from "./stepNames.js";
import type { ReconcilerStep } from "../domain/evidenceReconciliation.js";

export interface ReconcilerSteps {
  readonly steps: readonly ReconcilerStep[];
  readonly isReconciler: (step: CiWorkflowStep) => boolean;
}

const STEP_RECORD_EXPRESSION = "tojson(steps)";

function producesTheStepRecord(step: CiWorkflowStep): boolean {
  return [...step.env, ...("runs" in step ? [step.runs] : [])].some((written) =>
    written.replace(/\s+/g, "").toLowerCase().includes(STEP_RECORD_EXPRESSION)
  );
}

function roleOf(
  step: CiWorkflowStep,
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
