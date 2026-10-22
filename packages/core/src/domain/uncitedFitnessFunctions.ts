import type { PipelineStep } from "./pipelineStep.js";
import type { BehaviouralRunner, JobDiscoveryScope, ReconcilerStep, StepAccounting } from "./evidenceReconciliation.js";

export type StepTest = (step: PipelineStep) => boolean;
type StepName = (step: PipelineStep) => string;

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
      return role === undefined ? [] : [{ step: nameOf(step), role }];
    }),
    isReconciler: (step) => reconcilerRoleOf(step, runsTheReconciler) !== undefined,
  };
}

export interface StepExclusions {
  readonly excluded: readonly string[];
  readonly unmatchedEntries: readonly string[];
  readonly isExcluded: StepTest;
}

export function nonChecksApplied(
  steps: readonly PipelineStep[],
  nameOf: StepName,
  nonChecks: readonly string[]
): StepExclusions {
  const named = new Set(steps.map(nameOf));
  const excluded = nonChecks.filter((entry) => named.has(entry));
  return {
    excluded,
    unmatchedEntries: nonChecks.filter((entry) => !named.has(entry)),
    isExcluded: (step) => {
      const name = nameOf(step);
      return excluded.some((entry) => entry === name);
    },
  };
}

export type StepDisposition = "reconciler" | "nonCheck" | "plumbing" | "runner" | "candidate";

type Exclusion = Extract<StepDisposition, "reconciler" | "nonCheck" | "plumbing">;

function exclusionOf(step: PipelineStep, isReconciler: StepTest, isNamedANonCheck: StepTest): Exclusion | undefined {
  if (isReconciler(step)) return "reconciler";
  if (isNamedANonCheck(step)) return "nonCheck";
  return step.plumbing ? "plumbing" : undefined;
}

function dispositionOfIncluded(step: PipelineStep, runsARunner: StepTest): Extract<StepDisposition, "runner" | "candidate"> {
  return runsARunner(step) ? "runner" : "candidate";
}

export interface DispositionTests {
  readonly isReconciler: StepTest;
  readonly isNamedANonCheck: StepTest;
  readonly runsARunner: StepTest;
}

export function stepDispositions({
  isReconciler,
  isNamedANonCheck,
  runsARunner,
}: DispositionTests): (step: PipelineStep) => StepDisposition {
  return (step) => exclusionOf(step, isReconciler, isNamedANonCheck) ?? dispositionOfIncluded(step, runsARunner);
}

export function stepAccounting(
  steps: readonly PipelineStep[],
  dispositionOf: (step: PipelineStep) => StepDisposition
): StepAccounting {
  const count = (disposition: StepDisposition): number =>
    steps.filter((step) => dispositionOf(step) === disposition).length;
  const candidates = count("candidate");
  const runners = count("runner");
  const reconciler = count("reconciler");
  const excluded = count("nonCheck");
  const plumbing = count("plumbing");
  return {
    stepsRead: steps.length,
    candidates,
    runners,
    reconciler,
    excluded,
    plumbing,
    accountedFor: reconciler + excluded + plumbing + runners + candidates,
  };
}

export function everyStepAccountedFor({ stepsRead, accountedFor }: StepAccounting): boolean {
  return accountedFor === stepsRead;
}

const jobKeyOf = (step: PipelineStep): string => `${step.workflow}:${step.job}`;

export function discoveryScope(
  steps: readonly PipelineStep[],
  dispositionOf: (step: PipelineStep) => StepDisposition
): readonly JobDiscoveryScope[] {
  const tallies = new Map<string, JobDiscoveryScope>();
  for (const step of steps) {
    const tally = tallies.get(jobKeyOf(step)) ?? { source: step.workflow, job: step.job, steps: 0, candidates: 0 };
    const candidate = dispositionOf(step) === "candidate" ? 1 : 0;
    tallies.set(jobKeyOf(step), { ...tally, steps: tally.steps + 1, candidates: tally.candidates + candidate });
  }
  return [...tallies.values()].sort((a, b) => a.source.localeCompare(b.source) || a.job.localeCompare(b.job));
}

export function isExcludedFromDiscovery(
  step: PipelineStep,
  reconciler: Pick<ReconcilerSteps, "isReconciler">,
  nonChecks: Pick<StepExclusions, "isExcluded">
): boolean {
  return exclusionOf(step, reconciler.isReconciler, nonChecks.isExcluded) !== undefined;
}

export function isCandidateStep(
  step: PipelineStep,
  isExcluded: StepTest,
  runsARunner: StepTest
): boolean {
  return !isExcluded(step) && dispositionOfIncluded(step, runsARunner) === "candidate";
}

type Scripts = Readonly<Record<string, string>>;
export type RunnerTiers = Readonly<Record<string, string | null>>;

export interface ShellReading {
  readonly lastStagesOf: (commandText: string) => string;
  readonly runsAsCommand: (commandText: string, invocation: string, scripts: Scripts) => boolean;
}

type RunnersRunBy = (step: PipelineStep) => readonly (readonly [string, string])[];

function declaredRunnersRunBy(scripts: Scripts, runners: RunnerTiers, shell: ShellReading): RunnersRunBy {
  const lastStages = Object.fromEntries(
    Object.entries(scripts).map(([name, body]) => [name, shell.lastStagesOf(body)])
  );
  return (step) => {
    if (!("command" in step)) return [];
    const command = shell.lastStagesOf(step.command);
    return Object.entries(runners).filter(
      (entry): entry is [string, string] =>
        entry[1] !== null && shell.runsAsCommand(command, entry[1], lastStages)
    );
  };
}

export function declaredRunnerTest(scripts: Scripts, runners: RunnerTiers, shell: ShellReading): StepTest {
  const runnersRunBy = declaredRunnersRunBy(scripts, runners, shell);
  return (step) => runnersRunBy(step).length > 0;
}

export function runsADeclaredRunner(
  step: PipelineStep,
  scripts: Scripts,
  runners: RunnerTiers,
  shell: ShellReading
): boolean {
  return declaredRunnerTest(scripts, runners, shell)(step);
}

export function recognisedRunners(
  steps: readonly PipelineStep[],
  scripts: Scripts,
  runners: RunnerTiers,
  shell: ShellReading
): BehaviouralRunner[] {
  const runnersRunBy = declaredRunnersRunBy(scripts, runners, shell);
  return steps.flatMap((step) =>
    runnersRunBy(step).map(([tier, runner]) => ({
      tier,
      runner,
      step: step.identity,
    }))
  );
}
