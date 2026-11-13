import { parse } from "yaml";
import type { WorkflowStepAsWritten } from "../domain/workflowSteps.js";
import workflowsVariants from "./workflows.variants.json" with { type: "json" };

// Which steps only set the job up is the reader's to say, from its list of the actions that do.
// An entry ending in * names a family of actions, such as every setup action.
const usesAction = (uses: string, action: string): boolean => {
  const name = uses.split("@")[0]!;
  return action.endsWith("*") ? name.startsWith(action.slice(0, -1)) : name === action;
};
const isPlumbing = (uses: string): boolean => workflowsVariants["CLM-OBS-015"].variants.some((action) => usesAction(uses, action));
const WRITES_STEP_RECORD = "toJSON(steps)";

type Mapping = Readonly<Record<string, unknown>>;

const isMapping = (value: unknown): value is Mapping => typeof value === "object" && value !== null;
const text = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);
const mappingsIn = (value: unknown): Mapping[] => (Array.isArray(value) ? value : []);

// What a step holds in each place it can write the step record from: its command, or its env: values.
const HELD_IN: Readonly<Record<string, (step: Mapping) => readonly unknown[]>> = {
  "run:": (step) => [step["run"]],
  "env:": (step) => (isMapping(step["env"]) ? Object.values(step["env"]) : []),
};
const writesStepRecord = (step: Mapping): boolean =>
  workflowsVariants["CLM-OBS-013"].variants.some((place) => HELD_IN[place]!(step).some((value) => text(value)?.includes(WRITES_STEP_RECORD) === true));

function stepAsWritten(workflow: string, job: string, jobContinueOnError: unknown, step: Mapping): WorkflowStepAsWritten {
  const uses = text(step["uses"]);
  return {
    workflow,
    job,
    jobContinueOnError,
    name: text(step["name"]),
    uses,
    run: text(step["run"]),
    id: text(step["id"]),
    continueOnError: step["continue-on-error"],
    plumbing: uses !== undefined && isPlumbing(uses),
    writesStepRecord: writesStepRecord(step),
  };
}

export function workflowStepsFrom(workflow: string, source: string): WorkflowStepAsWritten[] {
  const document: unknown = parse(source);
  const jobs = isMapping(document) && isMapping(document["jobs"]) ? document["jobs"] : {};
  // GitHub runs no workflow whose job or step is not a mapping.
  return Object.entries(jobs as Readonly<Record<string, Mapping>>).flatMap(([job, definition]) =>
    mappingsIn(definition["steps"]).map((step) => stepAsWritten(workflow, job, definition["continue-on-error"], step)),
  );
}
