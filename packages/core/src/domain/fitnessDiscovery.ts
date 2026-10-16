import type { PipelineStep } from "./pipelineStep.js";
import type { BehaviouralRunner, ReconcilerStep } from "./evidenceReconciliation.js";

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
  runsARunner: StepTest
): boolean {
  return !isExcluded(step) && !runsARunner(step);
}

type Scripts = Readonly<Record<string, string>>;
type RunnerTiers = Readonly<Record<string, string | null>>;

export interface ShellReading {
  readonly lastStagesOf: (commandText: string) => string;
  readonly runsAsCommand: (commandText: string, invocation: string, scripts: Scripts) => boolean;
}

function declaredRunnersRunBy(
  step: PipelineStep,
  scripts: Scripts,
  runners: RunnerTiers,
  shell: ShellReading
): readonly (readonly [string, string])[] {
  if (!("command" in step)) return [];
  const command = shell.lastStagesOf(step.command);
  const lastStages = Object.fromEntries(
    Object.entries(scripts).map(([name, body]) => [name, shell.lastStagesOf(body)])
  );
  return Object.entries(runners).filter(
    (entry): entry is [string, string] =>
      entry[1] !== null && shell.runsAsCommand(command, entry[1], lastStages)
  );
}

export function runsADeclaredRunner(
  step: PipelineStep,
  scripts: Scripts,
  runners: RunnerTiers,
  shell: ShellReading
): boolean {
  return declaredRunnersRunBy(step, scripts, runners, shell).length > 0;
}

export function recognisedRunners(
  steps: readonly PipelineStep[],
  scripts: Scripts,
  runners: RunnerTiers,
  shell: ShellReading
): BehaviouralRunner[] {
  return steps.flatMap((step) =>
    declaredRunnersRunBy(step, scripts, runners, shell).map(([tier, runner]) => ({
      tier,
      runner,
      step: step.identity,
    }))
  );
}
