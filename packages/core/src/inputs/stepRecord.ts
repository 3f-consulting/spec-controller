import type { StepRecordEntryAsWritten } from "../domain/postEvidenceObservation.js";

// The CI run's own record of its steps, keyed by each step's id, as toJSON(steps) writes it.
export function stepRecordFrom(record: unknown): StepRecordEntryAsWritten[] {
  if (typeof record !== "object" || record === null) return [];
  return Object.entries(record).map(([key, entry]: [string, { readonly outcome?: unknown; readonly conclusion?: unknown }]) => ({
    key,
    outcome: String(entry?.outcome),
    conclusion: String(entry?.conclusion),
  }));
}
