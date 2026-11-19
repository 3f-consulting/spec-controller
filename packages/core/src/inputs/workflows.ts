import { parse } from "yaml";
import type { CiStep, FailureAllowed } from "../domain/workflowSteps.js";
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
const failureAllowedOf = (value: unknown): FailureAllowed | undefined =>
  value === undefined || typeof value === "boolean" ? value : "decided-by-the-run";

// A step is known by its name, else the action it uses, else the first line of its command: a step with no action has one.
const identityOf = (name: string | undefined, action: string | undefined, command: string | undefined): string =>
  name ?? action ?? command!.split("\n").map((line) => line.trim()).find((line) => line !== "") ?? "";

// The variables a step sets to text: one set to nothing, or to an empty string, is not set.
const environmentOf = (env: unknown): Readonly<Record<string, string>> | undefined =>
  isRecord(env) ? Object.fromEntries(Object.entries(env).filter((entry): entry is [string, string] => text(entry[1]) !== undefined && entry[1] !== "")) : undefined;

// The folder a job's steps run in unless a step names its own.
const jobWorkingDirectoryOf = (definition: Mapping): string | undefined => {
  const defaults = definition["defaults"];
  const run = isRecord(defaults) ? defaults["run"] : undefined;
  return isRecord(run) ? text(run["working-directory"]) : undefined;
};

function ciStepOf(workflow: string, job: string, definition: Mapping, step: Mapping): CiStep {
  const name = nameText(step["name"]);
  const action = text(step["uses"]);
  const command = text(step["run"]);
  return {
    workflow,
    job,
    jobAllowsFailure: failureAllowedOf(definition["continue-on-error"]),
    name,
    action,
    command,
    id: text(step["id"]),
    allowsFailure: failureAllowedOf(step["continue-on-error"]),
    identity: identityOf(name, action, command),
    plumbing: action !== undefined && isPlumbing(action),
    writesStepRecord: writesStepRecord(step),
    workingDirectory: text(step["working-directory"]) ?? jobWorkingDirectoryOf(definition),
    environment: environmentOf(step["env"]),
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
      return ciStepOf(workflow, job, definition, step);
    });
  });
}
