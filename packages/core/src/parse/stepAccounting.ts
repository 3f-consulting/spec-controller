import type { PackageJsonScripts } from "./checkScriptsRunInCI.js";
import type { PipelineStep } from "../domain/pipelineStep.js";
import { runsNamedRunner } from "./runningFitnessFunctions.js";
import { isCandidateStep, isGitHubPlumbingStep } from "../domain/fitnessDiscovery.js";
import type { StepAccounting } from "../domain/evidenceReconciliation.js";

export function stepAccounting(
  steps: readonly PipelineStep[],
  packageJson: PackageJsonScripts,
  runners: Readonly<Record<string, string | null>>,
  isReconciler: (step: PipelineStep) => boolean,
  isNamedANonCheck: (step: PipelineStep) => boolean,
  isExcludedFromDiscovery: (step: PipelineStep) => boolean
): StepAccounting {
  const count = (holds: (step: PipelineStep) => boolean): number => steps.filter(holds).length;

  const reconciler = count(isReconciler);
  const excluded = count((step) => !isReconciler(step) && isNamedANonCheck(step));
  const plumbing = count(
    (step) => !isReconciler(step) && !isNamedANonCheck(step) && isGitHubPlumbingStep(step)
  );
  const runsADeclaredRunner = (step: PipelineStep): boolean =>
    runsNamedRunner(step, packageJson, runners);
  const runnerSteps = count(
    (step) => !isExcludedFromDiscovery(step) && runsADeclaredRunner(step)
  );
  const candidates = count((step) =>
    isCandidateStep(step, isExcludedFromDiscovery, runsADeclaredRunner)
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
