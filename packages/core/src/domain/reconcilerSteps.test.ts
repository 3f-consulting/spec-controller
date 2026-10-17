import { describe, it, expect } from "vitest";
import { reconcilerSteps } from "./uncitedFitnessFunctions.js";
import type { PipelineStep } from "./pipelineStep.js";

const INVOCATION = "spec-controller balance";

const IN_THE_CI_JOB = { sourceIndex: 0, job: "ci", abortsJob: true } as const;

const DUMP: PipelineStep = {
  ...IN_THE_CI_JOB,
  identity: "Dump this run's step record",
  writesStepRecord: true,
  command: `printf '%s' "$STEPS_JSON" > ci-steps.json`,
};
const BALANCE: PipelineStep = {
  ...IN_THE_CI_JOB,
  identity: "Self-reconciliation balance",
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
  action: { name: "actions/checkout@v4", owner: "actions", repository: "checkout" },
};
const STEPS = [CHECKOUT, DUMP, BALANCE, SWEEP];

const runsTheReconciler = (command: string): boolean => command.includes(INVOCATION);
const namedInItsWorkflow = (step: PipelineStep): string => `ci.yml:${step.job}:${step.identity}`;
const givenNoName = (): undefined => undefined;

describe("[SCN-USG-014] the balance step and its step-record dump are not candidates, and no configuration says so", () => {
  it("gives the step that runs the reconciler's invocation the role reconciles, and the step that writes the step record the role records", () => {
    expect(reconcilerSteps(STEPS, namedInItsWorkflow, runsTheReconciler).steps).toStrictEqual([
      { step: "ci.yml:ci:Dump this run's step record", role: "records" },
      { step: "ci.yml:ci:Self-reconciliation balance", role: "reconciles" },
    ]);
  });

  it("answers that each of them is the reconciler, and that the ordinary steps beside them are not", () => {
    const { isReconciler } = reconcilerSteps(STEPS, namedInItsWorkflow, runsTheReconciler);
    expect(isReconciler(BALANCE)).toBe(true);
    expect(isReconciler(DUMP)).toBe(true);
    expect(isReconciler(SWEEP)).toBe(false);
    expect(isReconciler(CHECKOUT)).toBe(false);
  });

  it("names a step by its identity when its source has no name", () => {
    expect(reconcilerSteps(STEPS, givenNoName, runsTheReconciler).steps).toStrictEqual([
      { step: "Dump this run's step record", role: "records" },
      { step: "Self-reconciliation balance", role: "reconciles" },
    ]);
  });

  it("finds no reconciler in a pipeline that does not run it", () => {
    const { steps, isReconciler } = reconcilerSteps([SWEEP], namedInItsWorkflow, runsTheReconciler);
    expect(steps).toStrictEqual([]);
    expect(isReconciler(SWEEP)).toBe(false);
  });
});
