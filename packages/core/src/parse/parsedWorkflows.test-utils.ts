import { parseWorkflows, pipelineStepsOf, type ParsedWorkflow } from "./checkScriptsRunInCI.js";
import type { PipelineStep } from "../domain/pipelineStep.js";

export function parsedWorkflows(sources: readonly string[]): ParsedWorkflow[] {
  const parse = parseWorkflows(sources.map((source, i) => ({ file: `source-${i}.yml`, source })));
  if (parse.kind === "unparseable") throw new Error(parse.faults.map(({ message }) => message).join("\n"));
  return [...parse.workflows];
}

export function workflowSteps(sources: readonly string[]): PipelineStep[] {
  return pipelineStepsOf(parsedWorkflows(sources));
}
