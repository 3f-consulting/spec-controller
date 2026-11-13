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

// A list of features, each a record.
const REPORT: Shape = { listOf: { fields: {} } };

export const whereScenarioResultsBreak = (report: unknown): string | undefined => whereShapeBreaks(report, REPORT);

export function scenarioResultsFrom(report: unknown): ScenarioResultAsWritten[] {
  return (report as readonly CucumberJsonFeature[]).flatMap(({ uri, elements = [] }) =>
    elements
      .filter(({ type }) => type === "scenario")
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
      })),
  );
}
