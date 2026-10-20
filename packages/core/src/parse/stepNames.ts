import type { PipelineStep } from "../domain/pipelineStep.js";

export function qualifiedStepName(
  step: PipelineStep,
  workflowNames: readonly string[]
): string | undefined {
  const source = workflowNames[step.sourceIndex];
  return source === undefined ? undefined : `${source}:${step.job}:${step.identity}`;
}
