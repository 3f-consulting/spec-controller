import type { TestResult } from "../domain/postEvidenceObservation.js";
import { whereShapeBreaks, type Shape } from "./shape.js";

// A feature of Cucumber's JSON evidence report, as far as its reader reads it. A hook is written as a step with no name.
interface CucumberJsonFeature {
  readonly uri: string;
  readonly elements?: readonly {
    readonly type: string;
    readonly name: string;
    readonly line: number;
    readonly tags?: readonly { readonly name: string }[];
    readonly steps?: readonly {
      readonly keyword: string;
      readonly name?: string;
      readonly result: { readonly status: string; readonly error_message?: string };
    }[];
  }[];
}

// The statuses Cucumber writes for a step's result.
const STATUSES = ["passed", "failed", "skipped", "pending", "undefined", "ambiguous", "unknown"];

const STEP: Shape = {
  fields: { keyword: "text", name: "text", result: { fields: { status: { oneOf: STATUSES }, error_message: "text" }, optional: ["error_message"] } },
  optional: ["name"],
};

const ELEMENT: Shape = {
  fields: { type: "text", name: "text", line: "count", tags: { eachOf: { fields: { name: "text" } } }, steps: { eachOf: STEP } },
  optional: ["tags", "steps"],
};

// Every field the reader reads; the lists Cucumber leaves out when empty, a hook step's name and an error message only when
// written.
const REPORT: Shape = { eachOf: { fields: { uri: "text", elements: { eachOf: ELEMENT } }, optional: ["elements"] } };

export const whereScenarioResultsBreak = (report: unknown): string | undefined => whereShapeBreaks(report, REPORT);

type StepAsWritten = NonNullable<NonNullable<CucumberJsonFeature["elements"]>[number]["steps"]>[number];

const asWritten = ({ keyword, name }: StepAsWritten): string => `${keyword.trim()} ${name}`;

// A step that matched no definition, or more than one, kept the scenario from running, whatever else its steps did. A
// scenario passed when every step passed, its hooks among them, and it had a step of its own. Anything else is left out.
function resultOfSteps(steps: readonly StepAsWritten[]): Pick<TestResult, "result" | "message"> | undefined {
  const unmatched = steps.find(({ result: { status } }) => status === "undefined" || status === "ambiguous");
  if (unmatched) return { result: "never-ran", message: asWritten(unmatched) };
  const failed = steps.find(({ result: { status } }) => status === "failed");
  if (failed) return { result: "failed", ...(failed.result.error_message !== undefined && { message: failed.result.error_message }) };
  return steps.some(({ name }) => name !== undefined) && steps.every(({ result: { status } }) => status === "passed") ? { result: "passed" } : undefined;
}

// A feature with no elements written has no scenarios. A scenario is placed at its file, named by its title, and cites
// its tags, or failing those the row at its line.
export function scenarioResultsFrom(report: unknown): TestResult[] {
  return (report as readonly CucumberJsonFeature[]).flatMap(({ uri, elements = [] }) =>
    elements
      .filter(({ type }) => type === "scenario")
      .flatMap(({ name, line, tags = [], steps = [] }): TestResult[] => {
        const outcome = resultOfSteps(steps);
        const scenarioTags = tags.map(({ name: tag }) => tag.slice(1));
        return outcome === undefined ? [] : [{ place: { file: uri }, name, ...outcome, cites: { scenarioTags, file: uri, line } }];
      }),
  );
}
