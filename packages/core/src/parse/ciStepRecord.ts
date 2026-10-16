import { SCN_CODE } from "./scenarios.js";
import type { EvidenceStatus, ObservationNote } from "../domain/journal.js";
import type { StepRecord } from "../domain/stepRecord.js";
import type { FitnessEvidenceObservation } from "../model.js";

const SUCCESS = "success";
const FAILURE = "failure";

type StepReading = { readonly status?: EvidenceStatus } | null;

function readingOf(outcome: string | undefined): StepReading {
  if (outcome === SUCCESS) return { status: "passed" };
  if (outcome === FAILURE) return { status: "failed" };
  return null;
}

function checkDidNotRunNote(code: string, outcome: string | undefined): ObservationNote {
  return { kind: "check-step-did-not-run", code, ...(outcome === undefined ? {} : { outcome }) };
}

function namedOf(citedScn: string) {
  return {
    qualityCheck: "fitness",
    fitnessFunction: citedScn,
    scnId: citedScn,
  } as const;
}

function brokenObservationOf(citedScn: string, note: ObservationNote): FitnessEvidenceObservation {
  return {
    ...namedOf(citedScn),
    exists: false,
    enforcedOverRealSource: false,
    broken: true,
    notes: [note],
  };
}

function observationOf(
  citedScn: string,
  reading: StepReading,
  outcome: string | undefined
): FitnessEvidenceObservation {
  if (reading === null) {
    return brokenObservationOf(citedScn, checkDidNotRunNote(citedScn, outcome));
  }
  return {
    ...namedOf(citedScn),
    exists: true,
    enforcedOverRealSource: true,
    ...reading,
  };
}

export function ciStepRecordObservations(record: StepRecord | undefined): FitnessEvidenceObservation[] {
  if (record === undefined) return [];
  const observations: FitnessEvidenceObservation[] = [];
  for (const [citedScn, step] of Object.entries(record)) {
    if (!SCN_CODE.test(citedScn)) continue;
    observations.push(observationOf(citedScn, readingOf(step.outcome), step.outcome));
  }
  return observations;
}
