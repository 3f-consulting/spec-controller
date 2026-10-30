import type { PipelineStep } from "./pipelineStep.js";
import type {
  BehaviouralRunner,
  JobStepAccount,
  ReconcilerStep,
  StepAccountTotal,
  StepAccounting,
  StepsBehindCounts,
} from "./evidenceReconciliation.js";

export type StepTest = (step: PipelineStep) => boolean;
type StepName = (step: PipelineStep) => string;

export type ReconcilerRole = (step: PipelineStep) => ReconcilerStep["role"] | undefined;

export interface ReconcilerSteps {
  readonly steps: readonly ReconcilerStep[];
  readonly isReconciler: StepTest;
  readonly roleOf: ReconcilerRole;
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
    roleOf: (step) => reconcilerRoleOf(step, runsTheReconciler),
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

export function nonChecksMatchingNoStep(
  { unmatchedEntries }: Pick<StepExclusions, "unmatchedEntries">,
  workflowsRead: readonly string[]
): string[] {
  return unmatchedEntries.filter(
    (entry) => !entry.includes(":") || workflowsRead.includes(entry.slice(0, entry.indexOf(":")))
  );
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

const jobKeyOf = (step: PipelineStep): string => `${step.workflow}:${step.job}`;

type WorkflowAndJob = Pick<PipelineStep, "workflow" | "job">;

const byWorkflowThenJob = (a: WorkflowAndJob, b: WorkflowAndJob): number =>
  a.workflow.localeCompare(b.workflow) || a.job.localeCompare(b.job);

type DispositionCount = "candidates" | "runners" | "reconciler" | "excluded" | "plumbing";

const COUNTED_AS: Readonly<Record<StepDisposition, DispositionCount>> = {
  candidate: "candidates",
  runner: "runners",
  reconciler: "reconciler",
  nonCheck: "excluded",
  plumbing: "plumbing",
};

const noStepsOf = ({ workflow, job }: PipelineStep): JobStepAccount => ({
  workflow,
  job,
  stepsRead: 0,
  candidates: 0,
  runners: 0,
  reconciler: 0,
  excluded: 0,
  plumbing: 0,
});

export function accountedForOf({
  candidates,
  runners,
  reconciler,
  excluded,
  plumbing,
}: Pick<JobStepAccount, DispositionCount>): number {
  return candidates + runners + reconciler + excluded + plumbing;
}

function totalOf(rows: readonly JobStepAccount[]): StepAccountTotal {
  const summed = (count: DispositionCount | "stepsRead"): number => rows.reduce((sum, row) => sum + row[count], 0);
  return {
    stepsRead: summed("stepsRead"),
    candidates: summed("candidates"),
    runners: summed("runners"),
    reconciler: summed("reconciler"),
    excluded: summed("excluded"),
    plumbing: summed("plumbing"),
  };
}

function stepsBehindCounts(
  steps: readonly PipelineStep[],
  dispositionOf: (step: PipelineStep) => StepDisposition,
  nameOf: StepName,
  roleOf: ReconcilerRole
): StepsBehindCounts {
  const reconciler = steps
    .filter((step) => dispositionOf(step) === "reconciler")
    .flatMap((step) => {
      const role = roleOf(step);
      return role === undefined ? [] : [{ step: nameOf(step), role }];
    });
  const namesOf = (disposition: StepDisposition): string[] =>
    steps.filter((step) => dispositionOf(step) === disposition).map(nameOf);
  const runners = namesOf("runner");
  const excluded = namesOf("nonCheck");
  const plumbing = namesOf("plumbing");
  return {
    ...(runners.length > 0 ? { runners } : {}),
    ...(reconciler.length > 0 ? { reconciler } : {}),
    ...(excluded.length > 0 ? { excluded } : {}),
    ...(plumbing.length > 0 ? { plumbing } : {}),
  };
}

export function stepAccountOf(
  steps: readonly PipelineStep[],
  dispositionOf: (step: PipelineStep) => StepDisposition,
  nameOf: StepName,
  roleOf: ReconcilerRole
): StepAccounting {
  const rows = new Map<string, JobStepAccount>();
  for (const step of steps) {
    const row = rows.get(jobKeyOf(step)) ?? noStepsOf(step);
    const count = COUNTED_AS[dispositionOf(step)];
    rows.set(jobKeyOf(step), { ...row, stepsRead: row.stepsRead + 1, [count]: row[count] + 1 });
  }
  const byJob = [...rows.values()].sort(byWorkflowThenJob);
  return {
    byJob,
    total: totalOf(byJob),
    steps: stepsBehindCounts([...steps].sort(byWorkflowThenJob), dispositionOf, nameOf, roleOf),
  };
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
  readonly runsAsCommand: (commandText: string, invocation: string, scripts: Scripts) => boolean;
}

type RunnersRunBy = (step: PipelineStep) => readonly (readonly [string, string])[];

function declaredRunnersRunBy(scripts: Scripts, runners: RunnerTiers, shell: ShellReading): RunnersRunBy {
  return (step) => {
    if (!("command" in step)) return [];
    return Object.entries(runners).filter(
      (entry): entry is [string, string] =>
        entry[1] !== null && shell.runsAsCommand(step.command, entry[1], scripts)
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
