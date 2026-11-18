import type { ResultsByFileAsWritten } from "../domain/postEvidenceObservation.js";
import { whereShapeBreaks, type Shape } from "./shape.js";

// Jest's JSON evidence report, which Vitest also writes, as far as its reader reads it.
interface JestJsonReport {
  readonly testResults: readonly {
    readonly name: string;
    readonly message?: string;
    readonly assertionResults: readonly {
      readonly ancestorTitles: readonly string[];
      readonly title: string;
      readonly status: string;
      readonly failureMessages: readonly string[];
    }[];
  }[];
}

// The statuses Jest writes, of which Vitest writes all but focused; one reader reads both.
const STATUSES = ["passed", "failed", "skipped", "pending", "todo", "disabled", "focused"];

const ASSERTION_RESULT: Shape = { fields: { ancestorTitles: { eachOf: "text" }, title: "text", status: { oneOf: STATUSES }, failureMessages: { eachOf: "text" } } };

// Every field the reader reads; a file's message only when written.
const REPORT: Shape = {
  fields: { testResults: { eachOf: { fields: { name: "text", message: "text", assertionResults: { eachOf: ASSERTION_RESULT } }, optional: ["message"] } } },
};

export const whereResultsByFileBreak = (report: unknown): string | undefined => whereShapeBreaks(report, REPORT);

export function resultsByFileFrom(report: unknown): ResultsByFileAsWritten[] {
  return (report as JestJsonReport).testResults.map(({ name, message, assertionResults }) => ({
    file: name,
    message,
    results: assertionResults.map(({ ancestorTitles, title, status: resultStatus, failureMessages }) => ({
      ancestorTitles,
      title,
      status: resultStatus,
      failureMessages,
    })),
  }));
}
