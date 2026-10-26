import { describe, it, expect } from "vitest";
import { reconcilerSteps } from "./uncitedFitnessFunctions.js";
import type { PipelineStep } from "./pipelineStep.js";
import { namedInItsWorkflow } from "./stepNaming.test-utils.js";
import { commandRuns } from "../parse/commandRuns.js";

const INVOCATION = "spec-controller balance";

const IN_THE_CI_JOB = { workflow: "ci.yml", job: "ci", abortsJob: true, plumbing: false } as const;

const DUMP: PipelineStep = {
  ...IN_THE_CI_JOB,
  identity: "Dump this run's step record",
  writesStepRecord: true,
  command: `printf '%s' "$STEPS_JSON" > ci-steps.json`,
};
const BALANCE: PipelineStep = {
  ...IN_THE_CI_JOB,
  identity: "Reconciliation",
  writesStepRecord: false,
  command: "pnpm exec spec-controller balance --features features",
};
const SWEEP: PipelineStep = {
  ...IN_THE_CI_JOB,
  identity: "Sweep check",
  writesStepRecord: false,
  command: "pnpm lint:sweep",
};
const CHECKOUT: PipelineStep = {
  ...IN_THE_CI_JOB,
  identity: "Check out",
  writesStepRecord: false,
  plumbing: true,
  action: { name: "actions/checkout@v4" },
};
const LINTS: PipelineStep = {
  ...IN_THE_CI_JOB,
  identity: "Lint",
  writesStepRecord: false,
  command: "pnpm lint:sweep\npnpm lint\n",
};
const STEPS = [CHECKOUT, DUMP, BALANCE, SWEEP];

const runsTheReconciler = (command: string): boolean => command.includes(INVOCATION);
const noInvocationKnown = (command: string): boolean => commandRuns(command, "", {});

describe("[SCN-USG-014] the balance step and its step-record dump are not candidates, and no configuration says so", () => {
  it("gives the step that runs the reconciler's invocation the role reconciles, and the step that writes the step record the role records", () => {
    expect(reconcilerSteps(STEPS, namedInItsWorkflow, runsTheReconciler).steps).toStrictEqual([
      { step: "ci.yml:ci:Dump this run's step record", role: "records" },
      { step: "ci.yml:ci:Reconciliation", role: "reconciles" },
    ]);
  });

  it("answers that each of them is the reconciler, and that the ordinary steps beside them are not", () => {
    const { isReconciler } = reconcilerSteps(STEPS, namedInItsWorkflow, runsTheReconciler);
    expect(isReconciler(BALANCE)).toBe(true);
    expect(isReconciler(DUMP)).toBe(true);
    expect(isReconciler(SWEEP)).toBe(false);
    expect(isReconciler(CHECKOUT)).toBe(false);
  });

  it("finds no reconciler in a pipeline that does not run it", () => {
    const { steps, isReconciler } = reconcilerSteps([SWEEP], namedInItsWorkflow, runsTheReconciler);
    expect(steps).toStrictEqual([]);
    expect(isReconciler(SWEEP)).toBe(false);
  });

  it("reads the reconciler's invocation on any line of a step's command, never across two lines", () => {
    expect(commandRuns("pnpm build\nspec-controller balance", INVOCATION, {})).toBe(true);
    expect(commandRuns("spec-controller\nbalance", INVOCATION, {})).toBe(false);
  });

  it("finds no reconciler when no reconciler invocation is known, even a step whose command holds a blank line", () => {
    const { steps, isReconciler } = reconcilerSteps([BALANCE, LINTS], namedInItsWorkflow, noInvocationKnown);
    expect(steps).toStrictEqual([]);
    expect(isReconciler(BALANCE)).toBe(false);
    expect(isReconciler(LINTS)).toBe(false);
  });
});
