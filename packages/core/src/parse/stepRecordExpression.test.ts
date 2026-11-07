import { describe, it, expect } from "vitest";
import { commandRuns } from "./commandRuns.js";
import { qualifiedStepName } from "./stepNames.js";
import { reconcilerSteps } from "../domain/uncitedFitnessFunctions.js";
import type { PipelineStep } from "../domain/pipelineStep.js";
import { workflowSteps } from "./parsedWorkflows.test-utils.js";

const INVOCATION = "spec-controller balance";

const NAMES = ["ci.yml"];

const nameOf = (step: PipelineStep) => qualifiedStepName(step);

const runsTheReconciler = (command: string) => commandRuns(command, INVOCATION, {});

function stepNamed(ci: string, identity: string) {
  const step = workflowSteps([ci], NAMES).find((s) => s.identity === identity);
  if (step === undefined) throw new Error(`no step named "${identity}" in the fixture`);
  return step;
}

describe("[CLM-WFS-013] reconcilerSteps — how the step-record expression is read", () => {
  const dumpWith = (env: string): unknown[] => [
    ...reconcilerSteps(
      workflowSteps([`jobs:\n  ci:\n    steps:\n      - name: Dump\n        env:\n          J: ${env}\n        run: echo done`], NAMES),
      nameOf,
      runsTheReconciler
    ).steps,
  ];

  it("reads the expression however GitHub lets it be spelled", () => {
    const named = [{ step: "ci.yml:ci:Dump", role: "records" }];
    expect(dumpWith("${{ toJSON(steps) }}")).toEqual(named);
    expect(dumpWith("${{tojson(steps)}}")).toEqual(named);
    expect(dumpWith("${{ toJSON( steps ) }}")).toEqual(named);
  });

  it("reads the expression beside env values that are not text", () => {
    const ci = `
jobs:
  ci:
    steps:
      - name: Dump
        env:
          RETRIES: 3
          STRICT: true
          STEPS_JSON: \${{ toJSON(steps) }}
        run: echo done
`;
    const { steps, isReconciler } = reconcilerSteps(workflowSteps([ci], NAMES), nameOf, runsTheReconciler);
    expect(steps).toEqual([{ step: "ci.yml:ci:Dump", role: "records" }]);
    expect(isReconciler(stepNamed(ci, "Dump"))).toBe(true);
  });

  it("reads the expression where a consumer wrote it into the command", () => {
    expect(
      [
        ...reconcilerSteps(
          workflowSteps([`jobs:\n  ci:\n    steps:\n      - name: Dump\n        run: echo '\${{ toJSON(steps) }}' > r.json`], NAMES),
          nameOf,
          runsTheReconciler
        ).steps,
      ]
    ).toEqual([{ step: "ci.yml:ci:Dump", role: "records" }]);
  });
});
