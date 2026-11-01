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

export interface NonChecksNotApplied {
  readonly matchingNoStep: readonly string[];
  readonly notAStepName: readonly string[];
  readonly namingAWorkflowNotRead: readonly string[];
}

type NotApplied = keyof NonChecksNotApplied;

const WORKFLOW_FILE_THEN_COLON = /\.ya?ml:/;

function workflowReadNamedBy(entry: string, workflowsRead: readonly string[]): string | undefined {
  return workflowsRead
    .filter((workflow) => entry.startsWith(`${workflow}:`))
    .sort((a, b) => b.length - a.length)[0];
}

function workflowFileNamedBy(entry: string): string | undefined {
  const end = WORKFLOW_FILE_THEN_COLON.exec(entry);
  return end === null ? undefined : entry.slice(0, end.index + end[0].length - 1);
}

function namesAJobAndAStep(remainder: string): boolean {
  const jobEnd = remainder.indexOf(":");
  return jobEnd > 0 && jobEnd < remainder.length - 1;
}

function notAppliedAs(entry: string, workflowsRead: readonly string[]): NotApplied {
  const read = workflowReadNamedBy(entry, workflowsRead);
  const workflow = read ?? workflowFileNamedBy(entry);
  if (workflow === undefined || !namesAJobAndAStep(entry.slice(workflow.length + 1))) return "notAStepName";
  return read === undefined ? "namingAWorkflowNotRead" : "matchingNoStep";
}

export function nonChecksNotApplied(
  unmatchedEntries: readonly string[],
  workflowsRead: readonly string[]
): NonChecksNotApplied {
  const as = (reason: NotApplied): string[] =>
    unmatchedEntries.filter((entry) => notAppliedAs(entry, workflowsRead) === reason);
  return {
    matchingNoStep: as("matchingNoStep"),
    notAStepName: as("notAStepName"),
    namingAWorkflowNotRead: as("namingAWorkflowNotRead"),
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

const jobKeyOf = (step: PipelineStep): string => `${step.workflow}:${step.job}`;

type WorkflowAndJob = Pick<PipelineStep, "workflow" | "job">;

const byCodeUnit = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

const byWorkflowThenJob = (a: WorkflowAndJob, b: WorkflowAndJob): number =>
  byCodeUnit(a.workflow, b.workflow) || byCodeUnit(a.job, b.job);

export const stepsInAccountingOrder = (steps: readonly PipelineStep[]): PipelineStep[] =>
  [...steps].sort(byWorkflowThenJob);

export const workflowsReadInOrder = (files: readonly string[]): string[] => [...files].sort(byCodeUnit);

type DispositionCount = "candidates" | "runners" | "reconciler" | "nonChecks" | "plumbing";

const COUNTED_AS: Readonly<Record<StepDisposition, DispositionCount>> = {
  candidate: "candidates",
  runner: "runners",
  reconciler: "reconciler",
  nonCheck: "nonChecks",
  plumbing: "plumbing",
};

const noStepsOf = ({ workflow, job }: PipelineStep): JobStepAccount => ({
  workflow,
  job,
  stepsRead: 0,
  candidates: 0,
  runners: 0,
  reconciler: 0,
  nonChecks: 0,
  plumbing: 0,
});

export function accountedForOf({
  candidates,
  runners,
  reconciler,
  nonChecks,
  plumbing,
}: Pick<JobStepAccount, DispositionCount>): number {
  return candidates + runners + reconciler + nonChecks + plumbing;
}

function totalOf(rows: readonly JobStepAccount[]): StepAccountTotal {
  const summed = (count: DispositionCount | "stepsRead"): number => rows.reduce((sum, row) => sum + row[count], 0);
  return {
    stepsRead: summed("stepsRead"),
    candidates: summed("candidates"),
    runners: summed("runners"),
    reconciler: summed("reconciler"),
    nonChecks: summed("nonChecks"),
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
  const nonChecks = namesOf("nonCheck");
  const plumbing = namesOf("plumbing");
  return {
    ...(runners.length > 0 ? { runners } : {}),
    ...(reconciler.length > 0 ? { reconciler } : {}),
    ...(nonChecks.length > 0 ? { nonChecks } : {}),
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
    steps: stepsBehindCounts(stepsInAccountingOrder(steps), dispositionOf, nameOf, roleOf),
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
export type RunnerLayers = Readonly<Record<string, string | null>>;

export interface ShellReading {
  readonly runsAsCommand: (commandText: string, invocation: string, scripts: Scripts) => boolean;
}

type RunnersRunBy = (step: PipelineStep) => readonly (readonly [string, string])[];

function declaredRunnersRunBy(scripts: Scripts, runners: RunnerLayers, shell: ShellReading): RunnersRunBy {
  return (step) => {
    if (!("command" in step)) return [];
    return Object.entries(runners).filter(
      (entry): entry is [string, string] =>
        entry[1] !== null && shell.runsAsCommand(step.command, entry[1], scripts)
    );
  };
}

export function declaredRunnerTest(scripts: Scripts, runners: RunnerLayers, shell: ShellReading): StepTest {
  const runnersRunBy = declaredRunnersRunBy(scripts, runners, shell);
  return (step) => runnersRunBy(step).length > 0;
}

export function runsADeclaredRunner(
  step: PipelineStep,
  scripts: Scripts,
  runners: RunnerLayers,
  shell: ShellReading
): boolean {
  return declaredRunnerTest(scripts, runners, shell)(step);
}

export function recognisedRunners(
  steps: readonly PipelineStep[],
  nameOf: StepName,
  scripts: Scripts,
  runners: RunnerLayers,
  shell: ShellReading
): BehaviouralRunner[] {
  const runnersRunBy = declaredRunnersRunBy(scripts, runners, shell);
  return steps.flatMap((step) =>
    runnersRunBy(step).map(([layer, runner]) => ({
      layer,
      runner,
      step: nameOf(step),
    }))
  );
}

export function countedRunners(
  steps: readonly PipelineStep[],
  dispositionOf: (step: PipelineStep) => StepDisposition,
  nameOf: StepName,
  scripts: Scripts,
  runners: RunnerLayers,
  shell: ShellReading
): BehaviouralRunner[] {
  const counted = stepsInAccountingOrder(steps).filter((step) => dispositionOf(step) === "runner");
  return recognisedRunners(counted, nameOf, scripts, runners, shell);
}
