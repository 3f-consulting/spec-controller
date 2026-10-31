import { isCandidateStep, isExcludedFromDiscovery, runsADeclaredRunner, type ShellReading } from "./uncitedFitnessFunctions.js";
import type { PipelineStep } from "./pipelineStep.js";
import { runsAsCommand } from "./shellReading.test-utils.js";

export const IN_THE_CI_JOB = { workflow: "ci.yml", job: "ci", abortsJob: true, writesStepRecord: false, plumbing: false } as const;

const SHELL: ShellReading = { runsAsCommand };

export const candidatesAmong = (
  pipeline: readonly PipelineStep[],
  scripts: Readonly<Record<string, string>>,
  runners: Readonly<Record<string, string>>
): string[] =>
  pipeline.filter((step) =>
    isCandidateStep(
      step,
      (s) => isExcludedFromDiscovery(s, { isReconciler: () => false }, { isExcluded: () => false }),
      (s) => runsADeclaredRunner(s, scripts, runners, SHELL)
    )
  ).map((step) => step.identity);
