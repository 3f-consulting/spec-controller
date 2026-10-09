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

const ALIASED_CI = `
jobs:
  ci:
    steps:
      - name: Dump this run's step record
        env:
          STEPS_JSON: \${{ toJSON(steps) }}
        run: pnpm lint:dump
      - name: Self-reconciliation balance
        run: pnpm lint:reconcile
      - name: Sweep check
        run: pnpm lint:sweep
`;

const ALIASES = {
  scripts: {
    "lint:dump": `printf '%s' "$STEPS_JSON" > ci-steps.json`,
    "lint:reconcile": "spec-controller balance --features features",
    "lint:sweep": "madge --circular",
  },
};

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

describe("[SCN-USG-014] reconcilerSteps — through the manifest scripts a step invokes", () => {
  it("recognises the reconciler at a step that invokes it through a script alias", () => {
    const { steps } = reconcilerSteps([ALIASED_CI], NAMES, INVOCATION, ALIASES);
    expect(steps).toEqual([
      { step: "ci.yml:ci:Dump this run's step record", role: "records" },
      { step: "ci.yml:ci:Self-reconciliation balance", role: "reconciles" },
    ]);
  });

  it("follows a script that invokes a script", () => {
    const ci = `
jobs:
  ci:
    steps:
      - name: Verify
        run: pnpm verify
`;
    const scripts = { scripts: { verify: "pnpm reconcile", reconcile: "spec-controller balance" } };
    expect(reconcilerSteps([ci], NAMES, INVOCATION, scripts).steps).toEqual([
      { step: "ci.yml:ci:Verify", role: "reconciles" },
    ]);
  });
});

describe("[SCN-USG-014] reconcilerSteps — what it does not recognise", () => {
  const recognised = (ci: string, scripts: Record<string, string> = {}): unknown[] => [
    ...reconcilerSteps([ci], NAMES, INVOCATION, { scripts }).steps,
  ];

  it("leaves a step running this tool's OTHER command a candidate", () => {
    expect(recognised(`jobs:\n  ci:\n    steps:\n      - run: pnpm spec-controller help`)).toEqual(
      []
    );
  });

  it("leaves a step naming the package rather than running it a candidate", () => {
    expect(
      recognised(`jobs:\n  ci:\n    steps:\n      - run: pnpm --filter spec-controller build`)
    ).toEqual([]);
  });

  it("leaves a step carrying the words inside another token a candidate", () => {
    expect(
      recognised(`jobs:\n  ci:\n    steps:\n      - run: node scripts/spec-controller-balance.js`)
    ).toEqual([]);
    expect(recognised(`jobs:\n  ci:\n    steps:\n      - run: pnpm lint:balance`)).toEqual([]);
  });

  it("leaves a dump-shaped step carrying no step-record expression a candidate", () => {
    expect(
      recognised(
        `jobs:\n  ci:\n    steps:\n      - name: Dump this run's step record\n        run: pnpm lint:dump`
      )
    ).toEqual([]);
  });

  it("leaves an action step with no env a candidate", () => {
    const ci = `jobs:\n  ci:\n    steps:\n      - name: Check out\n        uses: actions/checkout@v4`;
    expect(recognised(ci)).toEqual([]);
    expect(reconcilerSteps([ci], NAMES, INVOCATION, {}).isReconciler(stepNamed(ci, "Check out"))).toBe(
      false
    );
  });

  it("does not read the expression off the job", () => {
    const ci = `
jobs:
  ci:
    env:
      STEPS_JSON: \${{ toJSON(steps) }}
    steps:
      - name: Sweep check
        run: pnpm lint:sweep
`;
    expect(recognised(ci)).toEqual([]);
  });

  it("recognises no reconciling step when it has been given no invocation", () => {
    expect(reconcilerSteps([DIRECT_CI], NAMES, "", {}).steps).toEqual([
      { step: "ci.yml:ci:Dump this run's step record", role: "records" },
    ]);
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

  it("reads a different expression as nothing of ours", () => {
    expect(dumpWith("${{ toJSON(github) }}")).toEqual([]);
    expect(dumpWith("steps")).toEqual([]);
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
  it("names each step by the workflow it was read from", () => {
    const other = `jobs:\n  release:\n    steps:\n      - name: Balance\n        run: spec-controller balance`;
    const { steps } = reconcilerSteps(
      [`jobs:\n  ci:\n    steps:\n      - run: pnpm lint:sweep`, other],
      ["ci.yml", "release.yml"],
      INVOCATION,
      {}
    );
    expect(steps).toEqual([{ step: "release.yml:release:Balance", role: "reconciles" }]);
  });

  it("still names a step whose source this run was given no name for", () => {
    const { steps, isReconciler } = reconcilerSteps([DIRECT_CI], [], INVOCATION, {});
    expect(steps).toEqual([
      { step: "Dump this run's step record", role: "records" },
      { step: "Self-reconciliation balance", role: "reconciles" },
    ]);
    expect(isReconciler(stepNamed(DIRECT_CI, "Self-reconciliation balance"))).toBe(true);
  });
});
