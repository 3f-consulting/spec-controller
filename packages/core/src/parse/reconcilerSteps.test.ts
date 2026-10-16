import { describe, it, expect } from "vitest";
import { ciWorkflowSteps } from "./checkScriptsRunInCI.js";
import { commandRuns } from "./commandRuns.js";
import { qualifiedStepName } from "./stepNames.js";
import { reconcilerSteps as reconcilerStepsOf } from "../domain/fitnessDiscovery.js";
import type { PipelineStep } from "../domain/pipelineStep.js";

const INVOCATION = "spec-controller balance";

const NAMES = ["ci.yml"];

const reconcilerSteps = (
  steps: readonly PipelineStep[],
  names: readonly string[],
  invocation: string,
  packageJson: { scripts?: Record<string, string> }
) =>
  reconcilerStepsOf(
    steps,
    (step) => qualifiedStepName(step, names),
    (command) => commandRuns(command, invocation, packageJson.scripts ?? {})
  );

function stepNamed(ci: string, identity: string) {
  const step = ciWorkflowSteps([ci]).find((s) => s.identity === identity);
  if (step === undefined) throw new Error(`no step named "${identity}" in the fixture`);
  return step;
}

describe("[SCN-USG-014] reconcilerSteps — how the step-record expression is read", () => {
  const dumpWith = (env: string): unknown[] => [
    ...reconcilerSteps(
      ciWorkflowSteps([`jobs:\n  ci:\n    steps:\n      - name: Dump\n        env:\n          J: ${env}\n        run: echo done`]),
      NAMES,
      INVOCATION,
      {}
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
    const { steps, isReconciler } = reconcilerSteps(ciWorkflowSteps([ci]), NAMES, INVOCATION, {});
    expect(steps).toEqual([{ step: "ci.yml:ci:Dump", role: "records" }]);
    expect(isReconciler(stepNamed(ci, "Dump"))).toBe(true);
  });

  it("reads the expression where a consumer wrote it into the command", () => {
    expect(
      [
        ...reconcilerSteps(
          ciWorkflowSteps([`jobs:\n  ci:\n    steps:\n      - name: Dump\n        run: echo '\${{ toJSON(steps) }}' > r.json`]),
          NAMES,
          INVOCATION,
          {}
        ).steps,
      ]
    ).toEqual([{ step: "ci.yml:ci:Dump", role: "records" }]);
  });
});
