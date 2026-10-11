import { parse } from "yaml";

export interface PackageJsonScripts {
  readonly scripts?: Record<string, string>;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

const CONTINUE_ON_ERROR = "continue-on-error";

export type CiStepAction =
  | { readonly runs: string }
  | { readonly uses: string };

export type CiWorkflowStep = {
  readonly sourceIndex: number;
  readonly jobId: string;
  readonly identity: string;
  readonly id?: string;
  readonly env: readonly string[];
  readonly abortsJob: boolean;
} & CiStepAction;

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
    read.push({
      sourceIndex,
      jobId,
      identity: identityOf(step["name"], action),
      env: envValuesOf(step["env"]),
      id: idOf(step["id"]),
      ...action,
      abortsJob: abortsJobOf(step[CONTINUE_ON_ERROR], jobValue),
    });
  }
  return read;
}

function stepsOf(ciSource: string, sourceIndex: number): CiWorkflowStep[] {
  let doc: unknown;
  try {
    doc = parse(ciSource);
  } catch {
    // An unparseable workflow declares no steps, as one with no jobs does.
  }
  const jobs = isRecord(doc) ? doc["jobs"] : undefined;
  if (!isRecord(jobs)) return [];
  return Object.entries(jobs).flatMap(([jobId, job]) => stepsOfJob(jobId, job, sourceIndex));
}

export function ciWorkflowSteps(ciSources: readonly string[]): CiWorkflowStep[] {
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
