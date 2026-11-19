import type { RecordedStep } from "../domain/postEvidenceObservation.js";
import { whereShapeBreaks } from "./shape.js";

export const whereStepRecordBreaks = (record: unknown): string | undefined =>
  whereShapeBreaks(record, { entriesOf: { fields: {} } });

const resultFrom = (outcome: unknown): RecordedStep["result"] => (outcome === "success" ? "passed" : outcome === "failure" ? "failed" : "never-ran");

// One CI job's record of its steps, keyed by each step's id, as toJSON(steps) writes it.
export function stepRecordFrom(record: unknown): RecordedStep[] {
  return Object.entries(record as object).map(([key, entry]: [string, { readonly outcome?: unknown }]) => ({
    key,
    result: resultFrom(entry.outcome),
  }));
}
