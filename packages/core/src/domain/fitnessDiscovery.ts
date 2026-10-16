import type { PipelineStep } from "./pipelineStep.js";
import type { ReconcilerStep } from "./evidenceReconciliation.js";

type StepTest = (step: PipelineStep) => boolean;
type StepName = (step: PipelineStep) => string | undefined;

const PLUMBING_OWNER = "actions";
const PLUMBING_REPOSITORIES: ReadonlySet<string> = new Set(["checkout", "cache", "upload-artifact", "download-artifact"]);
const PLUMBING_REPOSITORY_PREFIX = "setup-";

export function isGitHubPlumbingStep(step: PipelineStep): boolean {
  if (!("action" in step)) return false;
  return step.action.owner === PLUMBING_OWNER && isPlumbingRepository(step.action.repository);
}

function isPlumbingRepository(repository: string): boolean {
  return PLUMBING_REPOSITORIES.has(repository) || repository.startsWith(PLUMBING_REPOSITORY_PREFIX);
}

export interface ReconcilerSteps {
  readonly steps: readonly ReconcilerStep[];
  readonly isReconciler: StepTest;
}

function reconcilerRoleOf(
  step: PipelineStep,
  runsTheReconciler: (command: string) => boolean
): ReconcilerStep["role"] | undefined {
  if ("command" in step && runsTheReconciler(step.command)) return "reconciles";
  return step.writesStepRecord ? "records" : undefined;
}

export function reconcilerSteps(
  steps: readonly PipelineStep[],
  nameOf: StepName,
  runsTheReconciler: (command: string) => boolean
): ReconcilerSteps {
  return {
    steps: steps.flatMap((step) => {
      const role = reconcilerRoleOf(step, runsTheReconciler);
      return role === undefined ? [] : [{ step: nameOf(step) ?? step.identity, role }];
    }),
    isReconciler: (step) => reconcilerRoleOf(step, runsTheReconciler) !== undefined,
  };
}

export interface StepExclusions {
  readonly excluded: readonly string[];
  readonly unmatchedEntries: readonly string[];
  readonly isExcluded: StepTest;
}

export function notChecksApplied(
  steps: readonly PipelineStep[],
  nameOf: StepName,
  notChecks: readonly string[]
): StepExclusions {
  const named = new Set(steps.map(nameOf));
  const excluded = notChecks.filter((entry) => named.has(entry));
  return {
    excluded,
    unmatchedEntries: notChecks.filter((entry) => !named.has(entry)),
    isExcluded: (step) => {
      const name = nameOf(step);
      return excluded.some((entry) => entry === name);
    },
  };
}

export function isExcludedFromDiscovery(
  step: PipelineStep,
  reconciler: Pick<ReconcilerSteps, "isReconciler">,
  notChecks: Pick<StepExclusions, "isExcluded">
): boolean {
  return reconciler.isReconciler(step) || notChecks.isExcluded(step) || isGitHubPlumbingStep(step);
}

export function isCandidateStep(
  step: PipelineStep,
  isExcluded: StepTest,
  runsADeclaredRunner: StepTest
): boolean {
  return !isExcluded(step) && !runsADeclaredRunner(step);
}
