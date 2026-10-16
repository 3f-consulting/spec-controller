import { ciWorkflowSteps, type PackageJsonScripts } from "./checkScriptsRunInCI.js";
import type { PipelineStep } from "../domain/pipelineStep.js";
import { isCandidateStep } from "./runningFitnessFunctions.js";
import { isGitHubPlumbingStep } from "./gitHubPlumbing.js";
import type { JobDiscoveryScope } from "../domain/evidenceReconciliation.js";

type Tally = { readonly source?: string; readonly job: string; readonly steps: number; readonly candidates: number };

const keyOf = (step: PipelineStep): string => `${step.sourceIndex}:${step.jobId}`;

export function discoveryScope(
  ciSources: readonly string[],
  ciSourceNames: readonly string[],
  packageJson: PackageJsonScripts,
  runners: Readonly<Record<string, string | null>>,
  isExcludedFromDiscovery: (step: PipelineStep) => boolean
): readonly JobDiscoveryScope[] {
  const isExcludedOrPlumbing = (step: PipelineStep): boolean =>
    isExcludedFromDiscovery(step) || isGitHubPlumbingStep(step);
  const tallies = new Map<string, Tally>();
  for (const step of ciWorkflowSteps(ciSources)) {
    const source = ciSourceNames[step.sourceIndex];
    const tally = tallies.get(keyOf(step)) ?? {
      ...(source !== undefined ? { source } : {}),
      job: step.jobId,
      steps: 0,
      candidates: 0,
    };
    const candidate = isCandidateStep(step, packageJson, runners, isExcludedOrPlumbing) ? 1 : 0;
    tallies.set(keyOf(step), { ...tally, steps: tally.steps + 1, candidates: tally.candidates + candidate });
  }
  return [...tallies.values()].sort(
    (a, b) => (a.source ?? "").localeCompare(b.source ?? "") || a.job.localeCompare(b.job)
  );
}
