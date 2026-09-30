import { parse } from "yaml";

export interface PackageJsonScripts {
  scripts?: Record<string, string>;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

const CONTINUE_ON_ERROR = "continue-on-error";

export type CiRunStep = { readonly command: string; readonly id?: string } & StepAbortsJob;

type StepAbortsJob =
  | { readonly abortsJob: true }
  | {
      readonly abortsJob: false;
      readonly continuesOnError: { readonly carriedBy: "step" | "job"; readonly value: string };
    };

export type CiStepAction =
  | { readonly runs: string }
  | { readonly uses: string };

export type CiWorkflowStep = {
  readonly sourceIndex: number;
  readonly jobId: string;
  readonly identity: string;
  readonly id?: string;
  readonly env: readonly string[];
} & CiStepAction &
  StepAbortsJob;

function vouchesForTheStep(value: unknown): boolean {
  return value === undefined || value === false || value === "false";
}

function envValuesOf(value: unknown): readonly string[] {
  return isRecord(value)
    ? Object.values(value).filter((entry): entry is string => typeof entry === "string")
    : [];
}

function idOf(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const id = value.trim();
  return id === "" ? undefined : id;
}

function abortsJobOf(ownValue: unknown, jobValue: unknown): StepAbortsJob {
  if (!vouchesForTheStep(ownValue)) {
    return { abortsJob: false, continuesOnError: { carriedBy: "step", value: String(ownValue) } };
  }
  if (!vouchesForTheStep(jobValue)) {
    return { abortsJob: false, continuesOnError: { carriedBy: "job", value: String(jobValue) } };
  }
  return { abortsJob: true };
}

function actionOf(step: Record<string, unknown>): CiStepAction | undefined {
  const runs = step["run"];
  if (typeof runs === "string") return { runs };
  const uses = step["uses"];
  if (typeof uses === "string") return { uses };
  return undefined;
}

function identityOf(name: unknown, action: CiStepAction): string {
  if (typeof name === "string" && name.trim() !== "") return name.trim();
  if ("uses" in action) return action.uses;
  return action.runs.split(/\r?\n/).find((line) => line.trim() !== "")?.trim() ?? "";
}

function stepsOfJob(jobId: string, job: unknown, sourceIndex: number): CiWorkflowStep[] {
  if (!isRecord(job)) return [];
  const steps = job["steps"];
  if (!Array.isArray(steps)) return [];
  const jobValue = job[CONTINUE_ON_ERROR];
  const read: CiWorkflowStep[] = [];
  for (const step of steps) {
    if (!isRecord(step)) continue;
    const action = actionOf(step);
    if (action === undefined) continue;
    const id = idOf(step["id"]);
    read.push({
      sourceIndex,
      jobId,
      identity: identityOf(step["name"], action),
      env: envValuesOf(step["env"]),
      ...(id !== undefined ? { id } : {}),
      ...action,
      ...abortsJobOf(step[CONTINUE_ON_ERROR], jobValue),
    });
  }
  return read;
}

function stepsOf(ciSource: string, sourceIndex: number): CiWorkflowStep[] {
  let doc: unknown;
  try {
    doc = parse(ciSource);
  } catch {
    return [];
  }
  const jobs = isRecord(doc) ? doc["jobs"] : undefined;
  if (!isRecord(jobs)) return [];
  return Object.entries(jobs).flatMap(([jobId, job]) => stepsOfJob(jobId, job, sourceIndex));
}

function runStepOf(step: CiWorkflowStep & { readonly runs: string }): CiRunStep {
  const read = { command: step.runs, ...(step.id !== undefined ? { id: step.id } : {}) };
  return step.abortsJob
    ? { ...read, abortsJob: true }
    : { ...read, abortsJob: false, continuesOnError: step.continuesOnError };
}

export function ciRunCommands(ciSources: readonly string[]): string[] {
  return ciRunSteps(ciSources).map((step) => step.command);
}

export function ciRunSteps(ciSources: readonly string[]): CiRunStep[] {
  return ciWorkflowSteps(ciSources).flatMap((step) => ("runs" in step ? [runStepOf(step)] : []));
}

export function ciWorkflowSteps(ciSources: readonly string[]): CiWorkflowStep[] {
  return ciSources.flatMap((ciSource, sourceIndex) => stepsOf(ciSource, sourceIndex));
}

function lineInvokesScript(line: string, script: string): boolean {
  const tokens = line.trim().split(/\s+/);
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
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
