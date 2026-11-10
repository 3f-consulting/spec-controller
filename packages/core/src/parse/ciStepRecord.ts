import { claimCodeFrom } from "../domain/claimCodes.js";
import type { RecordedCheckStep, StepReport } from "../domain/postEvidenceObservation.js";

interface StepRecordEntry {
  readonly outcome?: string;
  readonly conclusion?: string;
}

export type StepRecord = Readonly<Record<string, StepRecordEntry>>;

const SUCCESS = "success";
const FAILURE = "failure";

function reportOf(outcome: string | undefined): StepReport {
  if (outcome === SUCCESS) return "succeeded";
  if (outcome === FAILURE) return "failed";
  return "other";
}

export function recordedCheckStepsOf(record: StepRecord | undefined): RecordedCheckStep[] | undefined {
  if (record === undefined) return undefined;
  return Object.entries(record)
    .filter(([citedClaimCode]) => claimCodeFrom(citedClaimCode) !== undefined)
    .map(([citedClaimCode, step]) => ({
      citedClaimCode,
      report: reportOf(step.outcome),
      ...(step.outcome === undefined ? {} : { said: step.outcome }),
    }));
}
