import { describe, it, expect } from "vitest";
import { ciWorkflowSteps } from "./checkScriptsRunInCI.js";
import { reconcilerSteps } from "./reconcilerSteps.js";

const INVOCATION = "spec-controller balance";

const NAMES = ["ci.yml"];

const DIRECT_CI = `
jobs:
  ci:
    steps:
      - name: Dump this run's step record
        env:
          STEPS_JSON: \${{ toJSON(steps) }}
        run: printf '%s' "$STEPS_JSON" > ci-steps.json
      - name: Self-reconciliation balance
        run: pnpm exec spec-controller balance --features features --ci .github/workflows
      - name: Sweep check
        run: pnpm lint:sweep
`;

function stepNamed(ci: string, identity: string) {
  const step = ciWorkflowSteps([ci]).find((s) => s.identity === identity);
  if (step === undefined) throw new Error(`no step named "${identity}" in the fixture`);
  return step;
}

describe("[SCN-USG-014] reconcilerSteps — by construction, over a manifest that says nothing", () => {
  it("recognises the reconciling step and its step-record dump with nothing configured", () => {
    const { steps } = reconcilerSteps([DIRECT_CI], NAMES, INVOCATION, {});
    expect(steps).toEqual([
      { step: "ci.yml:ci:Dump this run's step record", role: "records" },
      { step: "ci.yml:ci:Self-reconciliation balance", role: "reconciles" },
    ]);
  });

  it("answers the discovery seam for each of them, and for the ordinary check beside them", () => {
    const { isReconciler } = reconcilerSteps([DIRECT_CI], NAMES, INVOCATION, {});
    expect(isReconciler(stepNamed(DIRECT_CI, "Self-reconciliation balance"))).toBe(true);
    expect(isReconciler(stepNamed(DIRECT_CI, "Dump this run's step record"))).toBe(true);
    expect(isReconciler(stepNamed(DIRECT_CI, "Sweep check"))).toBe(false);
  });
});

describe("[SCN-USG-014] reconcilerSteps — how the step-record expression is read", () => {
  const dumpWith = (env: string): unknown[] => [
    ...reconcilerSteps(
      [`jobs:\n  ci:\n    steps:\n      - name: Dump\n        env:\n          J: ${env}\n        run: echo done`],
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
    const { steps, isReconciler } = reconcilerSteps([ci], NAMES, INVOCATION, {});
    expect(steps).toEqual([{ step: "ci.yml:ci:Dump", role: "records" }]);
    expect(isReconciler(stepNamed(ci, "Dump"))).toBe(true);
  });

  it("reads the expression where a consumer wrote it into the command", () => {
    expect(
      [
        ...reconcilerSteps(
          [`jobs:\n  ci:\n    steps:\n      - name: Dump\n        run: echo '\${{ toJSON(steps) }}' > r.json`],
          NAMES,
          INVOCATION,
          {}
        ).steps,
      ]
    ).toEqual([{ step: "ci.yml:ci:Dump", role: "records" }]);
  });
});

describe("[SCN-USG-014] reconcilerSteps — the account the report is written from", () => {

  it("still names a step whose source this run was given no name for", () => {
    const { steps, isReconciler } = reconcilerSteps([DIRECT_CI], [], INVOCATION, {});
    expect(steps).toEqual([
      { step: "Dump this run's step record", role: "records" },
      { step: "Self-reconciliation balance", role: "reconciles" },
    ]);
    expect(isReconciler(stepNamed(DIRECT_CI, "Self-reconciliation balance"))).toBe(true);
  });
});
