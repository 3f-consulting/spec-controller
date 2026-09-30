import { ciWorkflowSteps, type CiWorkflowStep, type PackageJsonScripts } from "./checkScriptsRunInCI.js";
import { isCandidateStep, runsNamedRunner } from "./runningStaticChecks.js";
import type { StepAccounting } from "../domain/evidenceReconciliation.js";

export function stepAccounting(
  ciSources: readonly string[],
  packageJson: PackageJsonScripts,
  runners: Readonly<Record<string, string | null>>,
  isReconciler: (step: CiWorkflowStep) => boolean,
  isNamedANonCheck: (step: CiWorkflowStep) => boolean
): StepAccounting {
  const steps = ciWorkflowSteps(ciSources);
  const isExcludedFromDiscovery = (step: CiWorkflowStep): boolean =>
    isReconciler(step) || isNamedANonCheck(step);
  const count = (holds: (step: CiWorkflowStep) => boolean): number => steps.filter(holds).length;

  const candidates = count((step) =>
    isCandidateStep(step, packageJson, runners, isExcludedFromDiscovery)
  );
  const reconciler = count(isReconciler);
  const excluded = count((step) => !isReconciler(step) && isNamedANonCheck(step));
  const runnerSteps = count(
    (step) => !isExcludedFromDiscovery(step) && runsNamedRunner(step, packageJson, runners)
  );

  return {
    stepsRead: steps.length,
    candidates,
    runners: runnerSteps,
    reconciler,
    excluded,
    accountedFor: candidates + runnerSteps + reconciler + excluded,
  };
}
