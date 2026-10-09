import { SCN_CODE } from "./scenarios.js";
import type { EvidenceStatus } from "../domain/journal.js";
import { CORE_MESSAGES, CoreMessage } from "../domain/messages.js";
import type { FitnessEvidenceObservation } from "../model.js";

interface CiStepRecordEntry {
  readonly outcome?: string;
  readonly conclusion?: string;
}

export type CiStepRecord = Readonly<Record<string, CiStepRecordEntry>>;

const SUCCESS = "success";
const FAILURE = "failure";
const SKIPPED = "skipped";

type StepReading = { readonly status?: EvidenceStatus } | null;

function readingOf(outcome: string | undefined): StepReading {
  if (outcome === SUCCESS) return { status: "passed" };
  if (outcome === FAILURE) return { status: "failed" };
  return null;
}

function checkDidNotRunMessage(scnId: string, outcome: string | undefined): string {
  if (outcome === undefined) return CORE_MESSAGES[CoreMessage.CheckStepNoOutcome](scnId);
  if (outcome === SKIPPED) return CORE_MESSAGES[CoreMessage.CheckStepSkipped](scnId);
  return CORE_MESSAGES[CoreMessage.CheckStepEnded](scnId, outcome);
}

function namedOf(citedScn: string) {
  return {
    qualityCheck: "fitness",
    staticCheck: citedScn,
    scnId: citedScn,
  } as const;
}

function brokenCreditOf(citedScn: string, message: string): FitnessEvidenceObservation {
  return {
    ...namedOf(citedScn),
    exists: false,
    enforcedOverRealSource: false,
    broken: true,
    message,
  };
}

function creditOf(
  citedScn: string,
  reading: StepReading,
  outcome: string | undefined
): FitnessEvidenceObservation {
  if (reading === null) {
    return brokenCreditOf(citedScn, checkDidNotRunMessage(citedScn, outcome));
  }
  return {
    ...namedOf(citedScn),
    exists: true,
    enforcedOverRealSource: true,
    ...reading,
  };
}

export function ciStepRecordCredits(record: CiStepRecord | undefined): FitnessEvidenceObservation[] {
  if (record === undefined) return [];
  const credits: FitnessEvidenceObservation[] = [];
  for (const [citedScn, step] of Object.entries(record)) {
    if (!SCN_CODE.test(citedScn)) continue;
    credits.push(creditOf(citedScn, readingOf(step.outcome), step.outcome));
  }
  return credits;
}
