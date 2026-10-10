import { ciWorkflowSteps, type CiWorkflowStep, type PackageJsonScripts } from "./checkScriptsRunInCI.js";
import { isCandidateStep } from "./runningFitnessFunctions.js";
import type { JobDiscoveryScope } from "../domain/evidenceReconciliation.js";

type Tally = { source?: string; job: string; steps: number; candidates: number };

const keyOf = (step: CiWorkflowStep): string => `${step.sourceIndex}:${step.jobId}`;

export function discoveryScope(
  ciSources: readonly string[],
  ciSourceNames: readonly string[],
  packageJson: PackageJsonScripts,
  runners: Readonly<Record<string, string | null>>,
  isExcludedFromDiscovery: (step: CiWorkflowStep) => boolean
): readonly JobDiscoveryScope[] {
  const tallies = new Map<string, Tally>();
  for (const step of ciWorkflowSteps(ciSources)) {
    const source = ciSourceNames[step.sourceIndex];
    const tally = tallies.get(keyOf(step)) ?? {
      ...(source !== undefined ? { source } : {}),
      job: step.jobId,
      steps: 0,
      candidates: 0,
    };
    tally.steps += 1;
    if (isCandidateStep(step, packageJson, runners, isExcludedFromDiscovery)) tally.candidates += 1;
    tallies.set(keyOf(step), tally);
  }
  return [...tallies.values()].sort(
    (a, b) => (a.source ?? "").localeCompare(b.source ?? "") || a.job.localeCompare(b.job)
  );
}
