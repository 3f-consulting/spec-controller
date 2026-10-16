import { ciWorkflowSteps } from "./checkScriptsRunInCI.js";
import type { PipelineStep } from "../domain/pipelineStep.js";
import { qualifiedStepName } from "./stepNames.js";

export interface StepExclusions {
  readonly excluded: readonly string[];
  readonly unmatchedEntries: readonly string[];
  readonly isExcluded: (step: PipelineStep) => boolean;
}

export function stepExclusions(
  ciSources: readonly string[],
  ciSourceNames: readonly string[],
  notChecks: readonly string[]
): StepExclusions {
  const named = new Set(
    ciWorkflowSteps(ciSources).map((step) => qualifiedStepName(step, ciSourceNames))
  );
  const excluded = notChecks.filter((entry) => named.has(entry));
  return {
    excluded,
    unmatchedEntries: notChecks.filter((entry) => !named.has(entry)),
    isExcluded: (step) => {
      const name = qualifiedStepName(step, ciSourceNames);
      return excluded.some((entry) => entry === name);
    },
  };
}
