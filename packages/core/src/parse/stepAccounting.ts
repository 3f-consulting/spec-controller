import { ciWorkflowSteps, type CiWorkflowStep, type PackageJsonScripts } from "./checkScriptsRunInCI.js";
import { isGitHubPlumbingStep } from "./gitHubPlumbing.js";
import { isCandidateStep, runsNamedRunner } from "./runningFitnessFunctions.js";
import type { StepAccounting } from "../domain/evidenceReconciliation.js";

export function stepAccounting(
  ciSources: readonly string[],
  packageJson: PackageJsonScripts,
  runners: Readonly<Record<string, string | null>>,
  isReconciler: (step: CiWorkflowStep) => boolean,
  isNamedANonCheck: (step: CiWorkflowStep) => boolean,
  isExcludedFromDiscovery: (step: CiWorkflowStep) => boolean
): StepAccounting {
  const steps = ciWorkflowSteps(ciSources);
  const count = (holds: (step: CiWorkflowStep) => boolean): number => steps.filter(holds).length;

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
