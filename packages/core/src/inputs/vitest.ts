import type { ResultsByFileAsWritten } from "../domain/postEvidenceObservation.js";
import { whereShapeBreaks, type Shape } from "./shape.js";

// Jest's JSON evidence report, which Vitest also writes, as far as its reader reads it.
interface JestJsonReport {
  readonly testResults: readonly {
    readonly name: string;
    readonly status: string;
    readonly message?: string;
    readonly assertionResults: readonly {
      readonly ancestorTitles: readonly string[];
      readonly title: string;
      readonly status: string;
      readonly failureMessages: readonly string[];
    }[];
  }[];
}

// A record whose testResults is a list of records.
const REPORT: Shape = { fields: { testResults: { listOf: { fields: {} } } } };

export const whereResultsByFileBreak = (report: unknown): string | undefined => whereShapeBreaks(report, REPORT);

export function resultsByFileFrom(report: unknown, from: "vitest" | "jest"): ResultsByFileAsWritten[] {
  return (report as JestJsonReport).testResults.map(({ name, status, message, assertionResults }) => ({
    report: from,
    file: name,
    status,
    ...(message === undefined ? {} : { message }),
    results: assertionResults.map(({ ancestorTitles, title, status: resultStatus, failureMessages }) => ({
      ancestorTitles,
      title,
      status: resultStatus,
      failureMessages,
    })),
  }));
}
