import { ciWorkflowSteps, type PackageJsonScripts } from "./checkScriptsRunInCI.js";
import type { PipelineStep } from "../domain/pipelineStep.js";
import { isGitHubPlumbingStep } from "./gitHubPlumbing.js";
import { isCandidateStep, runsNamedRunner } from "./runningFitnessFunctions.js";
import type { StepAccounting } from "../domain/evidenceReconciliation.js";

export function stepAccounting(
  ciSources: readonly string[],
  packageJson: PackageJsonScripts,
  runners: Readonly<Record<string, string | null>>,
  isReconciler: (step: PipelineStep) => boolean,
  isNamedANonCheck: (step: PipelineStep) => boolean,
  isExcludedFromDiscovery: (step: PipelineStep) => boolean
): StepAccounting {
  const steps = ciWorkflowSteps(ciSources);
  const count = (holds: (step: PipelineStep) => boolean): number => steps.filter(holds).length;

  const reconciler = count(isReconciler);
  const excluded = count((step) => !isReconciler(step) && isNamedANonCheck(step));
  const plumbing = count(
    (step) => !isReconciler(step) && !isNamedANonCheck(step) && isGitHubPlumbingStep(step)
  );
  const runnerSteps = count(
    (step) => !isExcludedFromDiscovery(step) && runsNamedRunner(step, packageJson, runners)
  );
  const candidates = count((step) =>
    isCandidateStep(step, packageJson, runners, isExcludedFromDiscovery)
  );

  return {
    stepsRead: steps.length,
    candidates,
    runners: runnerSteps,
    reconciler,
    excluded,
    plumbing,
    accountedFor: reconciler + excluded + plumbing + runnerSteps + candidates,
  };
}
