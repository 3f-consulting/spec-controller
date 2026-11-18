import type { TestResult } from "../domain/postEvidenceObservation.js";
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

// Every other status is an example that did not run its assertions, and is posted as nothing.
const RESULT_BY_STATUS: Readonly<Record<string, TestResult["result"]>> = { passed: "passed", failed: "failed" };

// An error outside any example kept the examples after it from running: it is placed at the spec file it names, or at none.
export function resultsByExampleFrom(report: unknown): TestResult[] {
  const { messages, examples, summary } = report as RspecJsonReport;
  // The errors outside any example are the last of its messages, one each. RSpec writes messages only when it has some.
  const errors = summary.errors_outside_of_examples_count ?? 0;
  const ran = examples.flatMap(({ description, full_description, status, file_path, exception }): TestResult[] => {
    const result = RESULT_BY_STATUS[status];
    if (result === undefined) return [];
    const message = exception?.message;
    // Its own description cites first; failing that, its groups' do, in its full description.
    return [{ place: { file: file_path }, name: description, result, ...(message !== undefined && { message }), cites: { titles: [full_description, description] } }];
  });
  const neverRan = (messages?.slice(messages.length - errors) ?? []).map((message): TestResult => {
    const file = LOADING.exec(message)?.[1];
    return { place: file === undefined ? { named: "" } : { file }, result: "never-ran", message, cites: { codes: [] } };
  });
  return [...ran, ...neverRan];
}
