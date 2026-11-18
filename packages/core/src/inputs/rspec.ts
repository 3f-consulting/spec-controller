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

// A record of its examples, each a record with a status, and its summary, a record.
const REPORT: Shape = { fields: { examples: { eachOf: { fields: { status: "text" } } }, summary: { fields: {} } } };

export const whereResultsByExampleBreak = (report: unknown): string | undefined => whereShapeBreaks(report, REPORT);

const LOADING = /while loading (\S+?)\.?\s/i;

export function resultsByExampleFrom(report: unknown): ResultsByExampleAsWritten {
  const { messages, examples, summary } = report as RspecJsonReport;
  // The errors outside any example are the last of its messages, one each. RSpec writes messages only when it has some.
  const errors = summary.errors_outside_of_examples_count ?? 0;
  return {
    examples: examples.map(({ description, full_description, status, file_path, exception }) => ({
      file: file_path,
      fullDescription: full_description,
      description,
      status,
      message: exception?.message,
    })),
    loadErrors: (messages?.slice(messages.length - errors) ?? []).map((message) => ({ file: LOADING.exec(message)?.[1], message })),
  };
}
