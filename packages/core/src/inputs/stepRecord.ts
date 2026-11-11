import type { RecordedCheckStep } from "../domain/postEvidenceObservation.js";

interface StepRecordEntry {
  readonly outcome?: string;
  readonly conclusion?: string;
}

export type StepRecord = Readonly<Record<string, StepRecordEntry>>;

export function recordedCheckStepsOf(record: StepRecord | undefined): RecordedCheckStep[] | undefined {
  if (record === undefined) return undefined;
  return Object.entries(record).map(([key, { outcome, conclusion }]) => ({
    key,
    ...(outcome === undefined ? {} : { outcome }),
    ...(conclusion === undefined ? {} : { conclusion }),
  }));
}
