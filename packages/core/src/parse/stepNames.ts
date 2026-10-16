import type { PipelineStep } from "../domain/pipelineStep.js";

export function qualifiedStepName(
  step: PipelineStep,
  ciSourceNames: readonly string[]
): string | undefined {
  const source = ciSourceNames[step.sourceIndex];
  return source === undefined ? undefined : `${source}:${step.jobId}:${step.identity}`;
}
