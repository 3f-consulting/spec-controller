import type { FitnessEvidenceObservation, ObservationNote } from "./journal.js";
import type { PipelineStep } from "./pipelineStep.js";
import type { StepTest } from "./uncitedFitnessFunctions.js";

export type StepReport = "succeeded" | "failed" | "other";

export interface RecordedCheckStep {
  readonly citedScn: string;
  readonly report: StepReport;
  /** What the record said the step did, repeated verbatim in the note of a step that did not run. */
  readonly said?: string;
}

interface Citation {
  readonly scnId: string;
}

type HandleOf = (step: PipelineStep) => string;
type CitationOf = (handle: string, citedByStep?: string) => Citation | null;

function namedOf(citedScn: string) {
  return {
    qualityCheck: "fitness",
    fitnessFunction: citedScn,
    scnId: citedScn,
  } as const;
}

function checkDidNotRunNote(step: RecordedCheckStep): ObservationNote {
  return {
    kind: "check-step-did-not-run",
    code: step.citedScn,
    ...(step.said === undefined ? {} : { outcome: step.said }),
  };
}

export function recordedObservationOf(step: RecordedCheckStep): FitnessEvidenceObservation {
  if (step.report === "other") {
    return {
      ...namedOf(step.citedScn),
      exists: false,
      enforcedOverRealSource: false,
      broken: true,
      notes: [checkDidNotRunNote(step)],
    };
  }
  return {
    ...namedOf(step.citedScn),
    exists: true,
    enforcedOverRealSource: true,
    status: step.report === "succeeded" ? "passed" : "failed",
  };
}

export function workflowObservationsOf(
  steps: readonly PipelineStep[],
  isCandidate: StepTest,
  handleOf: HandleOf,
  citationOf: CitationOf
): FitnessEvidenceObservation[] {
  return steps
    .filter(isCandidate)
    .map((step) => {
      const fitnessFunction = handleOf(step);
      const citation = citationOf(fitnessFunction, step.id);
      return {
        qualityCheck: "fitness" as const,
        fitnessFunction,
        exists: true,
        enforcedOverRealSource: step.abortsJob,
        ...(citation !== null ? { scnId: step.id ?? citation.scnId } : {}),
      };
    })
    .sort((a, b) => a.fitnessFunction.localeCompare(b.fitnessFunction));
}

/** An absent record leaves the workflow to answer every step; a record, even an empty one, answers every citing step. */
export function fitnessObservationsOf(
  workflow: readonly FitnessEvidenceObservation[],
  recorded: readonly RecordedCheckStep[] | undefined
): FitnessEvidenceObservation[] {
  if (recorded === undefined) return [...workflow];
  return [
    ...workflow.filter((observation) => observation.scnId === undefined),
    ...recorded.map((step) => recordedObservationOf(step)),
  ];
}
