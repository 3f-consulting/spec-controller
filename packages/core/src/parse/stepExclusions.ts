import { ciWorkflowSteps, type CiWorkflowStep } from "./checkScriptsRunInCI.js";
import { qualifiedStepName } from "./stepNames.js";

export interface StepExclusions {
  readonly excluded: readonly string[];
  readonly unmatchedEntries: readonly string[];
  readonly isExcluded: (step: CiWorkflowStep) => boolean;
}

export function stepExclusions(
  ciSources: readonly string[],
  ciSourceNames: readonly string[],
  notChecks: readonly string[]
): StepExclusions {
  const named = new Set(
    ciWorkflowSteps(ciSources).flatMap((step) => {
      const name = qualifiedStepName(step, ciSourceNames);
      return name === undefined ? [] : [name];
    })
  );
  const excluded = notChecks.filter((entry) => named.has(entry));
  return {
    excluded,
    unmatchedEntries: notChecks.filter((entry) => !named.has(entry)),
    isExcluded: (step) => {
      const name = qualifiedStepName(step, ciSourceNames);
      return name !== undefined && excluded.includes(name);
    },
  };
}
