import type { CiWorkflowStep } from "./checkScriptsRunInCI.js";

export function qualifiedStepName(
  step: CiWorkflowStep,
  ciSourceNames: readonly string[]
): string | undefined {
  const source = ciSourceNames[step.sourceIndex];
  return source === undefined ? undefined : `${source}:${step.jobId}:${step.identity}`;
}
