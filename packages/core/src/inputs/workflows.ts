import { parse } from "yaml";
import type { CiStep, ContinueOnError } from "../domain/workflowSteps.js";
import { coreText } from "../messages/catalogue.js";
import { InputDoesNotParse, parsedBy } from "./inputDoesNotParse.js";
import { isRecord } from "./shape.js";
import workflowsVariants from "./workflows.variants.json" with { type: "json" };

// Which steps only set the job up is the reader's to say, from its list of the actions that do, by owner and
// repository: an action in a repository on the list is one of them. An entry ending in * names a family of
// repositories, such as every setup action.
const usesAction = (uses: string, action: string): boolean => {
  const repository = uses.split("@")[0]!.split("/").slice(0, 2).join("/");
  return action.endsWith("*") ? repository.startsWith(action.slice(0, -1)) : repository === action;
};
const isPlumbing = (uses: string): boolean => workflowsVariants["plumbing-actions"].variants.some((action) => usesAction(uses, action));
const WRITES_STEP_RECORD = "toJSON(steps)";

type Mapping = Readonly<Record<string, unknown>>;

const text = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);
// A step's name as written, a number among them: YAML reads a bare 3 as a number.
const nameText = (value: unknown): string | undefined => (typeof value === "number" ? String(value) : text(value));
const entriesIn = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

// What a step holds in each place it can write the step record from: its command, or its env: values.
const HELD_IN: Readonly<Record<string, (step: Mapping) => readonly unknown[]>> = {
  "run:": (step) => [step["run"]],
  "env:": (step) => Object.values(isRecord(step["env"]) ? step["env"] : {}),
};
const writesStepRecord = (step: Mapping): boolean =>
  workflowsVariants["step-record-writers"].variants.some((place) => HELD_IN[place]!(step).some((value) => text(value)?.includes(WRITES_STEP_RECORD) === true));

// continue-on-error as the domain reads it: true or false as written, and anything else an expression the run decides.
const continueOnErrorOf = (value: unknown): ContinueOnError | undefined =>
  value === undefined || typeof value === "boolean" ? value : "decided-by-the-run";

function ciStepOf(workflow: string, job: string, jobContinueOnError: ContinueOnError | undefined, step: Mapping): CiStep {
  const uses = text(step["uses"]);
  return {
    workflow,
    job,
    jobContinueOnError,
    name: nameText(step["name"]),
    uses,
    run: text(step["run"]),
    id: text(step["id"]),
    continueOnError: continueOnErrorOf(step["continue-on-error"]),
    plumbing: uses !== undefined && isPlumbing(uses),
    writesStepRecord: writesStepRecord(step),
  };
}

export function workflowStepsFrom(workflow: string, source: string): CiStep[] {
  const document = parsedBy(() => parse(source) as unknown);
  const jobs = isRecord(document) && isRecord(document["jobs"]) ? document["jobs"] : {};
  // GitHub runs no workflow whose job is not a mapping, or whose step names neither an action nor a command.
  return Object.entries(jobs).flatMap(([job, definition]) => {
    if (!isRecord(definition)) throw new InputDoesNotParse(coreText("job-holds-no-settings", { place: `jobs.${job}` }));
    return entriesIn(definition["steps"]).map((step, at) => {
      if (!isRecord(step) || (text(step["uses"]) === undefined && text(step["run"]) === undefined)) {
        throw new InputDoesNotParse(coreText("step-names-neither-action-nor-command", { place: `jobs.${job}.steps[${at}]` }));
      }
      return ciStepOf(workflow, job, continueOnErrorOf(definition["continue-on-error"]), step);
    });
  });
}
