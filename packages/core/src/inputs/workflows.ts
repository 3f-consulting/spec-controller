import { parse } from "yaml";
import type { PipelineStep, PipelineStepAction, WorkflowStep } from "../domain/postEvidenceObservation.js";
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

function envValuesOf(value: unknown): readonly string[] {
  return Object.values(isRecord(value) ? value : {}).filter(
    (entry): entry is string => typeof entry === "string"
  );
}

function idOf(value: unknown): string | undefined {
  return typeof value === "string" ? value || undefined : undefined;
}

const STEP_RECORD_EXPRESSION = "tojson(steps)";

interface UsesReading {
  readonly owner: string;
  readonly repository: string;
}

function readUses(uses: string): UsesReading {
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

function writesStepRecordOf(env: unknown, action: PipelineStepAction): boolean {
  const written = "command" in action ? [...envValuesOf(env), action.command] : envValuesOf(env);
  return written.some((text) => text.replace(/\s/g, "").toLowerCase().includes(STEP_RECORD_EXPRESSION));
}

function actionOf(step: Record<string, unknown>): PipelineStepAction {
  const command = step["run"];
  return typeof command === "string" ? { command } : { action: { name: step["uses"] as string } };
}

function nameOf(value: unknown): { readonly name?: string } {
  return typeof value === "string" ? { name: value } : {};
}

function stepsOfJob(job: string, jobBody: Record<string, unknown>): WorkflowStep[] {
  const steps = jobBody["steps"];
  if (!Array.isArray(steps)) return [];
  const jobContinueOnError = jobBody[CONTINUE_ON_ERROR];
  return (steps as Record<string, unknown>[]).map((step) => {
    const action = actionOf(step);
    return {
      job,
      ...nameOf(step["name"]),
      id: idOf(step["id"]),
      continueOnError: step[CONTINUE_ON_ERROR],
      jobContinueOnError,
      writesStepRecord: writesStepRecordOf(step["env"], action),
      plumbing: isPlumbing(action),
      ...action,
    };
  });
}

function stepsOfDocument(doc: unknown): WorkflowStep[] {
  const jobs = isRecord(doc) ? doc["jobs"] : undefined;
  if (!isRecord(jobs)) return [];
  return Object.entries(jobs as Record<string, Record<string, unknown>>).flatMap(([job, jobBody]) => stepsOfJob(job, jobBody));
}

function workflowOf(document: unknown): WorkflowContent {
  return { steps: stepsOfDocument(document) };
}

export function parseWorkflows(sources: readonly Source[]): SourcesParse<WorkflowContent> {
  return parseSources(sources, (source): unknown => parse(source), workflowOf);
}

export function pipelineStepsOf(workflows: readonly ParsedWorkflow[]): PipelineStep[] {
  return workflows.flatMap(({ file, steps }) => steps.map((step) => ({ workflow: file, ...step })));
}
