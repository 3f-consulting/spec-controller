import type { StepRecordEntryAsWritten } from "../domain/postEvidenceObservation.js";
import { whereShapeBreaks } from "./shape.js";

export const whereStepRecordBreaks = (record: unknown): string | undefined =>
  whereShapeBreaks(record, { entriesOf: { fields: {} } });

// The CI run's own record of its steps, keyed by each step's id, as toJSON(steps) writes it.
export function stepRecordFrom(record: unknown): StepRecordEntryAsWritten[] {
  return Object.entries(record as object).map(([key, entry]: [string, { readonly outcome?: unknown }]) => ({
    key,
    outcome: String(entry.outcome),
  }));
}
