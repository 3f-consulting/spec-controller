import { parse } from "yaml";
import type { PipelineStep, PipelineStepAction, WorkflowStep } from "../domain/pipelineStep.js";
import { parseSources, type Parsed, type Source, type SourcesParse } from "./sourceParse.js";

export interface PackageJsonScripts {
  readonly scripts?: Record<string, string>;
}

interface WorkflowContent {
  readonly steps: readonly WorkflowStep[];
}

export type ParsedWorkflow = Parsed<WorkflowContent>;

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

export interface UsesReading {
  readonly owner: string;
  readonly repository: string;
}

export function readUses(uses: string): UsesReading {
  const [owner, repository] = uses.split(/[/@]/);
  return { owner: String(owner), repository: String(repository) };
}

const PLUMBING_OWNER = "actions";
const PLUMBING_REPOSITORIES: ReadonlySet<string> = new Set(["checkout", "cache", "upload-artifact", "download-artifact"]);
const PLUMBING_REPOSITORY_PREFIX = "setup-";

function isPlumbing(action: PipelineStepAction): boolean {
  if (!("action" in action)) return false;
  const { owner, repository } = readUses(action.action.name);
  return owner === PLUMBING_OWNER && (PLUMBING_REPOSITORIES.has(repository) || repository.startsWith(PLUMBING_REPOSITORY_PREFIX));
}

function actionOf(step: Record<string, unknown>): PipelineStepAction | undefined {
  const command = step["run"];
  if (typeof command === "string") return { command };
  const uses = step["uses"];
  if (typeof uses === "string") return { action: { name: uses } };
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

function stepsOfJob(job: string, jobBody: unknown): WorkflowStep[] {
  if (!isRecord(jobBody)) return [];
  const steps = jobBody["steps"];
  if (!Array.isArray(steps)) return [];
  const jobValue = jobBody[CONTINUE_ON_ERROR];
  const read: WorkflowStep[] = [];
  for (const step of steps) {
    if (!isRecord(step)) continue;
    const action = actionOf(step);
    if (action === undefined) continue;
    read.push({
      job,
      identity: identityOf(step["name"], action),
      writesStepRecord: writesStepRecordOf(step["env"], action),
      id: idOf(step["id"]),
      ...action,
      abortsJob: abortsJobOf(step[CONTINUE_ON_ERROR], jobValue),
      plumbing: isPlumbing(action),
    });
  }
  return read;
}

function stepsOfDocument(doc: unknown): WorkflowStep[] {
  const jobs = isRecord(doc) ? doc["jobs"] : undefined;
  if (!isRecord(jobs)) return [];
  return Object.entries(jobs).flatMap(([job, jobBody]) => stepsOfJob(job, jobBody));
}

function workflowOf(document: unknown): WorkflowContent {
  return { steps: stepsOfDocument(document) };
}

export function parseWorkflows(sources: readonly Source[]): SourcesParse<WorkflowContent> {
  return parseSources(sources, (source): unknown => parse(source), workflowOf);
}

export function pipelineStepsOf(workflows: readonly ParsedWorkflow[]): PipelineStep[] {
  return workflows.flatMap(({ steps }, sourceIndex) => steps.map((step) => ({ sourceIndex, ...step })));
}
