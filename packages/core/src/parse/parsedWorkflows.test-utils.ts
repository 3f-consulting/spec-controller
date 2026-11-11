import { parseWorkflows, pipelineStepsOf, type ParsedWorkflow } from "./checkScriptsRunInCI.js";
import type { PipelineStep } from "../domain/postEvidenceObservation.js";

function parsedWorkflows(sources: readonly string[], files: readonly string[] = []): ParsedWorkflow[] {
  const parse = parseWorkflows(sources.map((source, i) => ({ file: files[i] ?? `workflow-${i}.yml`, source })));
  if (parse.kind === "unparseable") throw new Error(parse.faults.map(({ message }) => message).join("\n"));
  return [...parse.parsed];
}

export function workflowSteps(sources: readonly string[], files: readonly string[] = []): PipelineStep[] {
  return pipelineStepsOf(parsedWorkflows(sources, files));
}
