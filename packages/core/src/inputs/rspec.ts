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

const EXAMPLE: Shape = {
  fields: {
    description: "text",
    full_description: "text",
    status: { oneOf: ["passed", "failed", "pending"] },
    file_path: "text",
    exception: { fields: { message: "text" }, optional: ["message"] },
  },
  optional: ["exception"],
};

// Every field the reader reads; its messages, an exception, its message and the count of errors only when written.
const REPORT: Shape = {
  fields: {
    messages: { eachOf: "text" },
    examples: { eachOf: EXAMPLE },
    summary: { fields: { errors_outside_of_examples_count: "count" }, optional: ["errors_outside_of_examples_count"] },
  },
  optional: ["messages"],
};

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
