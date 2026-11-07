import { CLAIM_CODE } from "../domain/featureCode.js";
import {
  recordedObservationOf,
  type RecordedCheckStep,
  type StepReport,
} from "../domain/fitnessReconciliation.js";
import type { FitnessEvidenceObservation } from "../model.js";

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
    .filter(([citedClaimCode]) => CLAIM_CODE.test(citedClaimCode))
    .map(([citedClaimCode, step]) => ({
      citedClaimCode,
      report: reportOf(step.outcome),
      ...(step.outcome === undefined ? {} : { said: step.outcome }),
    }));
}

export function ciStepRecordObservations(record: StepRecord | undefined): FitnessEvidenceObservation[] {
  return (recordedCheckStepsOf(record) ?? []).map((step) => recordedObservationOf(step));
}
