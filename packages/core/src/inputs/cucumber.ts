import type { ScenarioResultAsWritten } from "../domain/postEvidenceObservation.js";
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

// A feature with no elements written has no scenarios.
export function scenarioResultsFrom(report: unknown): ScenarioResultAsWritten[] {
  return (report as readonly CucumberJsonFeature[]).flatMap(
    ({ uri, elements }) =>
      elements
        ?.filter(({ type }) => type === "scenario")
        .map(({ name, line, tags = [], steps = [] }) => ({
          file: uri,
          line,
          title: name,
          tags: tags.map(({ name: tag }) => tag.slice(1)),
          steps: steps.map(({ keyword, name: text, result: { status, error_message } }) => ({
            keyword,
            text,
            status,
            message: error_message,
          })),
        })) ?? [],
  );
}
