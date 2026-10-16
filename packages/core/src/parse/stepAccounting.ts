import type { PackageJsonScripts } from "./checkScriptsRunInCI.js";
import type { PipelineStep } from "../domain/pipelineStep.js";
import { shellReading } from "./commandRuns.js";
import { isCandidateStep, isGitHubPlumbingStep, runsADeclaredRunner } from "../domain/fitnessDiscovery.js";
import type { StepAccounting } from "../domain/evidenceReconciliation.js";

export function stepAccounting(
  steps: readonly PipelineStep[],
  packageJson: PackageJsonScripts,
  runners: Readonly<Record<string, string | null>>,
  isReconciler: (step: PipelineStep) => boolean,
  isNamedANonCheck: (step: PipelineStep) => boolean,
  isExcluded: (step: PipelineStep) => boolean
): StepAccounting {
  const count = (holds: (step: PipelineStep) => boolean): number => steps.filter(holds).length;

  const reconciler = count(isReconciler);
  const excluded = count((step) => !isReconciler(step) && isNamedANonCheck(step));
  const plumbing = count(
    (step) => !isReconciler(step) && !isNamedANonCheck(step) && isGitHubPlumbingStep(step)
  );
  const scripts = packageJson.scripts ?? {};
  const runsARunner = (step: PipelineStep): boolean =>
    runsADeclaredRunner(step, scripts, runners, shellReading);
  const runnerSteps = count(
    (step) => !isExcluded(step) && runsARunner(step)
  );
  const candidates = count((step) =>
    isCandidateStep(step, isExcluded, runsARunner)
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
