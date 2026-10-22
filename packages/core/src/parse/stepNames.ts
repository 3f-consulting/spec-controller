import type { PipelineStep } from "../domain/pipelineStep.js";

export function qualifiedStepName(step: PipelineStep): string {
  return `${step.workflow}:${step.job}:${step.identity}`;
}
