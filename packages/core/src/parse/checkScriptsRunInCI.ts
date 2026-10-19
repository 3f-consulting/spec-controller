import { parse } from "yaml";
import type { PipelineStep, PipelineStepAction, UsedAction } from "../domain/pipelineStep.js";
import { WorkflowSourceNotYaml } from "./workflowSourceNotYaml.js";

export interface PackageJsonScripts {
  readonly scripts?: Record<string, string>;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

const CONTINUE_ON_ERROR = "continue-on-error";

const STEP_RECORD_EXPRESSION = "tojson(steps)";

function vouchesForTheStep(value: unknown): boolean {
  return value === undefined || value === false || value === "false";
}

function envValuesOf(value: unknown): readonly string[] {
  return Object.values(isRecord(value) ? value : {}).filter(
    (entry): entry is string => typeof entry === "string"
  );
}

function idOf(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const id = value.trim();
  return id === "" ? undefined : id;
}

function abortsJobOf(ownValue: unknown, jobValue: unknown): boolean {
  return vouchesForTheStep(ownValue) && vouchesForTheStep(jobValue);
}

function usedActionOf(name: string): UsedAction {
  const [owner, repository] = name.split(/[/@]/);
  return { name, owner: String(owner), repository: String(repository) };
}

function actionOf(step: Record<string, unknown>): PipelineStepAction | undefined {
  const command = step["run"];
  if (typeof command === "string") return { command };
  const uses = step["uses"];
  if (typeof uses === "string") return { action: usedActionOf(uses) };
  return undefined;
}

function identityOf(name: unknown, action: PipelineStepAction): string {
  if (typeof name === "string" && name.trim() !== "") return name.trim();
  if ("action" in action) return action.action.name;
  return action.command.split(/\r?\n/).find((line) => line.trim() !== "")?.trim() ?? "";
}

function writesStepRecordOf(env: unknown, action: PipelineStepAction): boolean {
  const written = "command" in action ? [...envValuesOf(env), action.command] : envValuesOf(env);
  return written.some((text) => text.replace(/\s/g, "").toLowerCase().includes(STEP_RECORD_EXPRESSION));
}

function stepsOfJob(job: string, jobBody: unknown, sourceIndex: number): PipelineStep[] {
  if (!isRecord(jobBody)) return [];
  const steps = jobBody["steps"];
  if (!Array.isArray(steps)) return [];
  const jobValue = jobBody[CONTINUE_ON_ERROR];
  const read: PipelineStep[] = [];
  for (const step of steps) {
    if (!isRecord(step)) continue;
    const action = actionOf(step);
    if (action === undefined) continue;
    read.push({
      sourceIndex,
      job,
      identity: identityOf(step["name"], action),
      writesStepRecord: writesStepRecordOf(step["env"], action),
      id: idOf(step["id"]),
      ...action,
      abortsJob: abortsJobOf(step[CONTINUE_ON_ERROR], jobValue),
    });
  }
  return read;
}

function parseWorkflow(ciSource: string): unknown {
  try {
    return parse(ciSource);
  } catch (err) {
    throw new WorkflowSourceNotYaml(err as Error);
  }
}

function stepsOf(ciSource: string, sourceIndex: number): PipelineStep[] {
  const doc = parseWorkflow(ciSource);
  const jobs = isRecord(doc) ? doc["jobs"] : undefined;
  if (!isRecord(jobs)) return [];
  return Object.entries(jobs).flatMap(([job, jobBody]) => stepsOfJob(job, jobBody, sourceIndex));
}

export function ciWorkflowSteps(ciSources: readonly string[]): PipelineStep[] {
  return ciSources.flatMap((ciSource, sourceIndex) => stepsOf(ciSource, sourceIndex));
}

function lineInvokesScript(line: string, script: string): boolean {
  const tokens = line.trim().split(/\s+/);
  for (const [i, tok] of tokens.entries()) {
    if (tok === "pnpm" || tok === "yarn") {
      let j = i + 1;
      if (tokens[j] === "run") j++;
      if (tokens[j] === script) return true;
    }
    if (tok === "npm" && tokens[i + 1] === "run" && tokens[i + 2] === script) {
      return true;
    }
  }
  return false;
}

export function commandInvokesScript(command: string, script: string): boolean {
  return command.split(/\r?\n/).some((line) => lineInvokesScript(line, script));
}
