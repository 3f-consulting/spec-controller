import type { EvidenceObservation, ExamplesAsWritten } from "../domain/postEvidenceObservation.js";
import { exampleObservationsOf } from "../domain/postEvidenceObservation.js";

export interface RspecJsonReport {
  readonly examples?: ReadonlyArray<{
    readonly description?: string;
    readonly full_description?: string;
    readonly status?: string;
    readonly file_path?: string;
  }>;
  readonly summary?: { readonly errors_outside_of_examples_count?: number };
  readonly messages?: readonly string[];
}

// The report as RSpec wrote it: each example's description, full description, status and file, how many errors it met
// outside any example, and its messages.
function examplesOf(report: RspecJsonReport): ExamplesAsWritten {
  return {
    examples: (report.examples ?? []).map((example) => ({
      title: example.description,
      fullTitle: example.full_description,
      status: example.status,
      path: example.file_path,
    })),
    errorsOutsideExamples: report.summary?.errors_outside_of_examples_count,
    messages: report.messages ?? [],
  };
}

export function parseRspecEvidenceObservations(report: RspecJsonReport, root: string): EvidenceObservation[] {
  return exampleObservationsOf(examplesOf(report), root);
}
