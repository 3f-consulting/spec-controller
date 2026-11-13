import type { ResultsByExampleAsWritten } from "../domain/postEvidenceObservation.js";
import { whereShapeBreaks, type Shape } from "./shape.js";

// RSpec's JSON evidence report, as far as its reader reads it.
interface RspecJsonReport {
  readonly messages?: readonly string[];
  readonly examples: readonly {
    readonly description: string;
    readonly full_description: string;
    readonly status: string;
    readonly file_path: string;
    readonly exception?: { readonly message?: string };
  }[];
  readonly summary: { readonly errors_outside_of_examples_count?: number };
}

// A record of its messages, if any, its examples, each a record, and its summary.
const REPORT: Shape = {
  fields: { messages: { listOf: "string" }, examples: { listOf: { fields: {} } }, summary: { fields: {} } },
  optional: ["messages"],
};

export const whereResultsByExampleBreak = (report: unknown): string | undefined => whereShapeBreaks(report, REPORT);

const LOADING = /while loading (\S+?)\.?\s/i;

// An example's groups are written only as the start of its full description, before a space and its own description.
const groupsOf = (description: string, fullDescription: string): string[] => [fullDescription.slice(0, -description.length - 1)];

export function resultsByExampleFrom(report: unknown): ResultsByExampleAsWritten {
  const { messages = [], examples, summary } = report as RspecJsonReport;
  // The errors outside any example are the last of its messages, one each.
  const errors = summary.errors_outside_of_examples_count ?? 0;
  return {
    report: "rspec",
    examples: examples.map(({ description, full_description, status, file_path, exception }) => ({
      file: file_path,
      groupDescriptions: groupsOf(description, full_description),
      description,
      status,
      message: exception?.message,
    })),
    loadErrors: (errors === 0 ? [] : messages.slice(-errors)).map((message) => ({ file: LOADING.exec(message)?.[1], message })),
  };
}
