import type { RecordedCheckStep } from "../domain/postEvidenceObservation.js";

interface StepRecordEntry {
  readonly outcome?: string;
}

export type StepRecord = Readonly<Record<string, StepRecordEntry>>;

export function recordedCheckStepsOf(record: StepRecord | undefined): RecordedCheckStep[] | undefined {
  if (record === undefined) return undefined;
  return Object.entries(record).map(([key, { outcome }]) => ({ key, outcome }));
}
