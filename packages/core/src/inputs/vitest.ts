import type { ResultsByFileAsWritten } from "../domain/postEvidenceObservation.js";

// Vitest's JSON evidence report, as far as its reader reads it.
interface VitestReport {
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

export function resultsByFileFrom(report: unknown): ResultsByFileAsWritten[] {
  return (report as VitestReport).testResults.map(({ name, status, message, assertionResults }) => ({
    report: "vitest",
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
