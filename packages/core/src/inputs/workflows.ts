import { parse } from "yaml";
import type { WorkflowStepAsWritten } from "../domain/postEvidenceObservation.js";
import plumbingActions from "./plumbingActions.json" with { type: "json" };

// Which steps only set the job up is the reader's to say, from its list of the actions that do.
// An entry ending in * names a family of actions, such as every setup action.
const usesAction = (uses: string, action: string): boolean => {
  const name = uses.split("@")[0]!;
  return action.endsWith("*") ? name.startsWith(action.slice(0, -1)) : name === action;
};
const isPlumbing = (uses: string): boolean => plumbingActions.some((action) => usesAction(uses, action));
const WRITES_STEP_RECORD = "toJSON(steps)";

type Mapping = Readonly<Record<string, unknown>>;

const isMapping = (value: unknown): value is Mapping => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);
const mappingsIn = (value: unknown): Mapping[] => (Array.isArray(value) ? value.filter(isMapping) : []);

function stepAsWritten(workflow: string, job: string, jobContinueOnError: unknown, step: Mapping): WorkflowStepAsWritten {
  const uses = text(step["uses"]);
  const run = text(step["run"]);
  return {
    workflow,
    job,
    jobContinueOnError,
    ...(text(step["name"]) === undefined ? {} : { name: text(step["name"]) }),
    ...(uses === undefined ? {} : { uses }),
    ...(run === undefined ? {} : { run }),
    ...(text(step["id"]) === undefined ? {} : { id: text(step["id"]) }),
    continueOnError: step["continue-on-error"],
    plumbing: uses !== undefined && isPlumbing(uses),
    writesStepRecord: run?.includes(WRITES_STEP_RECORD) ?? false,
  };
}

export function workflowStepsFrom(workflow: string, source: string): WorkflowStepAsWritten[] {
  const document: unknown = parse(source);
  const jobs = isMapping(document) && isMapping(document["jobs"]) ? document["jobs"] : {};
  return Object.entries(jobs).flatMap(([job, definition]) =>
    isMapping(definition)
      ? mappingsIn(definition["steps"]).map((step) => stepAsWritten(workflow, job, definition["continue-on-error"], step))
      : [],
  );
}
