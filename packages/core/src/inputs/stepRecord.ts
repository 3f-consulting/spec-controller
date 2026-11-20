import type { RecordedStep } from "../domain/postEvidenceObservation.js";
import { isRecord, whereShapeBreaks } from "./shape.js";

type SavedWithItsJob = { readonly job: Readonly<Record<string, unknown>>; readonly steps?: unknown };

// Every entry of toJSON(steps) carries an outcome and toJSON(job) never does, so a step whose id is job leaves the record steps alone.
const savesItsJob = (record: unknown): record is SavedWithItsJob => isRecord(record) && isRecord(record.job) && !("outcome" in record.job);

const stepsOf = (record: unknown): unknown => (savesItsJob(record) ? record.steps : record);

export const whereStepRecordBreaks = (record: unknown): string | undefined => whereShapeBreaks(stepsOf(record), { entriesOf: { fields: {} } });

const resultFrom = (outcome: unknown): RecordedStep["result"] =>
  outcome === "success" ? "passed" : outcome === "failure" ? "failed" : outcome === "skipped" ? "skipped" : "never-ran";

// One CI job's record of its steps, keyed by each step's id, as toJSON(steps) writes it, alone or beside toJSON(job).
export function stepRecordFrom(record: unknown): RecordedStep[] {
  const jobSucceeded = savesItsJob(record) && record.job.status === "success";
  const results = Object.entries(stepsOf(record) as object).map(([key, entry]: [string, { readonly outcome?: unknown }]) => ({ key, result: resultFrom(entry.outcome) }));
  const recordHadAFailedStep = results.some(({ result }) => result === "failed");
  return results.map((entry) => ({ ...entry, jobSucceeded, recordHadAFailedStep }));
}
