import type { TestResult } from "../domain/postEvidenceObservation.js";
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

// Every other status is a test that did not run its assertions, and is posted as nothing.
const RESULT_BY_STATUS: Readonly<Record<string, TestResult["result"]>> = { passed: "passed", failed: "failed" };

// A file with no results is one that could not run: each writes such a file as failed.
export function resultsByFileFrom(report: unknown): TestResult[] {
  return (report as JestJsonReport).testResults.flatMap(({ name: file, message, assertionResults }): TestResult[] => {
    if (assertionResults.length === 0) {
      return [{ place: { file }, result: "never-ran", ...(message !== undefined && { message }), cites: { titles: [] } }];
    }
    return assertionResults.flatMap(({ ancestorTitles, title, status, failureMessages }): TestResult[] => {
      const result = RESULT_BY_STATUS[status];
      if (result === undefined) return [];
      const failure = failureMessages.join("\n");
      return [{ place: { file }, name: title, result, ...(failure && { message: failure }), cites: { titles: [...ancestorTitles, title] } }];
    });
  });
}
