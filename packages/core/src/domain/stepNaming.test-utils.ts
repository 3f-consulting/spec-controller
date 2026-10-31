import type { PipelineStep } from "./pipelineStep.js";

export const namedInItsWorkflow = (step: PipelineStep): string => `ci.yml:${step.job}:${step.identity}`;

export const namedByIdentity = (step: PipelineStep): string => step.identity;
