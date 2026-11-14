import { describe, expect, it } from "vitest";
import { scriptsFrom } from "../inputs/manifest.js";
import { shellAnswers } from "../inputs/shell.js";
import { stepRecordFrom } from "../inputs/stepRecord.js";
import shellVariants from "../inputs/shell.variants.json" with { type: "json" };
import workflowsVariants from "../inputs/workflows.variants.json" with { type: "json" };
import postEvidenceObservationVariants from "./postEvidenceObservation.variants.json" with { type: "json" };
import { workflowStepsFrom } from "../inputs/workflows.js";
import { claimReconciliationsOf } from "./claimReconciliation.js";
import type { TargetConfiguration } from "./configuration.js";
import { fitnessObservationsOf, stepDispositionOf } from "./postEvidenceObservation.js";

// A step named in notChecks, if any; a unit layer that has no runner is set to null.
const configurationNaming = (notCheck: string | undefined): TargetConfiguration => ({
  runners: { unit: null },
  nonChecks: notCheck === undefined ? [] : [{ workflow: "ci.yml", job: "ci", step: notCheck }],
  deferralTags: [],
});
const NO_SETTING: TargetConfiguration = { runners: {}, nonChecks: [], deferralTags: [] };
const stepsOf = (step: object) => workflowStepsFrom("ci.yml", JSON.stringify({ jobs: { ci: { steps: [step] } } }));

describe("balance counts each step as what it does, and posts only a fitness function", () => {
  it.each([
    ["CLM-OBS-004", "running pnpm audit-the-tree", { run: "pnpm audit-the-tree" }, undefined, "a fitness function", "fitnessFunction", 1],
    ["CLM-OBS-002", "using actions/dependency-review-action", { uses: "actions/dependency-review-action@v4" }, undefined, "a fitness function", "fitnessFunction", 1],
    ["CLM-OBS-003", "using someone/checkout", { uses: "someone/checkout@v1" }, undefined, "a fitness function", "fitnessFunction", 1],
    ["CLM-OBS-008", "running pnpm test, with no unit runner", { run: "pnpm test" }, undefined, "a fitness function", "fitnessFunction", 1],
    ["CLM-OBS-109", "running spec-controller balance, that step in notChecks", { name: "Reconcile", run: "spec-controller balance" }, "Reconcile", "the reconciler", "reconciler", 0],
    ["CLM-OBS-014", "named Install, that step in notChecks", { name: "Install", run: "pnpm install" }, "Install", "a non-check", "nonCheck", 0],
    ["CLM-OBS-016", "using actions/checkout, that step in notChecks", { uses: "actions/checkout@v4" }, "actions/checkout@v4", "a non-check", "nonCheck", 0],
  ] as const)("[%s] a step %s will be counted as %s, and a fitness Evidence Observation will be posted only for a fitness function", (_clm, _described, step, notCheck, _counted, countedAs, posted) => {
    const steps = stepsOf(step);
    const configuration = configurationNaming(notCheck);

    expect({
      countedAs: stepDispositionOf(steps[0]!, configuration, {}, shellAnswers),
      posted: fitnessObservationsOf(steps, [], configuration, {}, shellAnswers).filter(({ kind }) => kind === "fitness").length,
    }).toEqual({ countedAs, posted });
  });

  // The step running each spelling of the reconciler.
  const runningTheReconciler: Readonly<Record<string, string>> = {
    "spec-controller balance": "spec-controller balance --features features",
    "spec-controller balance | tee report.md": "spec-controller balance --features features | tee report.md",
  };

  it.each(shellVariants["CLM-OBS-012"].variants)("[CLM-OBS-012] a step running %s will be counted as the reconciler, and nothing will be posted", (variant) => {
    const steps = stepsOf({ run: runningTheReconciler[variant]! });

    expect({
      countedAs: stepDispositionOf(steps[0]!, NO_SETTING, {}, shellAnswers),
      posted: fitnessObservationsOf(steps, [], NO_SETTING, {}, shellAnswers).length,
    }).toEqual({ countedAs: "reconciler", posted: 0 });
  });

  it("[CLM-OBS-002] a step using actions/dependency-review-action, with vitest as its unit runner, will be counted as a fitness function, and a fitness Evidence Observation will be posted", () => {
    const steps = stepsOf({ uses: "actions/dependency-review-action@v4" });
    const configuration: TargetConfiguration = { runners: { unit: "vitest" }, nonChecks: [], deferralTags: [] };

    expect({ counted: stepDispositionOf(steps[0]!, configuration, {}, shellAnswers), posted: fitnessObservationsOf(steps, [], configuration, {}, shellAnswers).length }).toEqual({
      counted: "fitnessFunction",
      posted: 1,
    });
  });
});

const ONE_001 = { featureCode: "ONE", number: "001" };
const workflowOf = (jobs: object) => workflowStepsFrom("ci.yml", JSON.stringify({ jobs }));
const recordOf = (record: object) => stepRecordFrom(record);

// A step writing out the step record, in each place a step can hold the expression.
const writingTheStepRecord: Readonly<Record<string, object>> = {
  "run:": { run: "echo '${{ toJSON(steps) }}' > steps.json" },
  "env:": { env: { STEPS_JSON: "${{ toJSON(steps) }}" }, run: 'printf \'%s\' "$STEPS_JSON" > steps.json' },
};

describe("a step writing out the step record is the reconciler's", () => {
  it.each(workflowsVariants["CLM-OBS-013"].variants)("[CLM-OBS-013] a step writing out the step record through %s will be counted as the reconciler, and nothing will be posted", (variant) => {
    const steps = stepsOf(writingTheStepRecord[variant]!);

    expect({
      countedAs: stepDispositionOf(steps[0]!, NO_SETTING, {}, shellAnswers),
      posted: fitnessObservationsOf(steps, [], NO_SETTING, {}, shellAnswers).length,
    }).toEqual({ countedAs: "reconciler", posted: 0 });
  });
});

describe("a step using a plumbing action is plumbing", () => {
  it.each(workflowsVariants["CLM-OBS-015"].variants)("[CLM-OBS-015] a step using %s will be counted as plumbing, and nothing will be posted", (action) => {
    const steps = stepsOf({ uses: `${action.replace("*", "node")}@v4` });

    expect({
      countedAs: stepDispositionOf(steps[0]!, NO_SETTING, {}, shellAnswers),
      posted: fitnessObservationsOf(steps, [], NO_SETTING, {}, shellAnswers).length,
    }).toEqual({ countedAs: "plumbing", posted: 0 });
  });

  it.each(["actions/cache/save", "actions/upload-artifact/merge"])("[CLM-OBS-015] a step using %s, a plumbing action's sub-action, will be counted as plumbing, and nothing will be posted", (action) => {
    const steps = stepsOf({ uses: `${action}@v4` });

    expect({
      countedAs: stepDispositionOf(steps[0]!, NO_SETTING, {}, shellAnswers),
      posted: fitnessObservationsOf(steps, [], NO_SETTING, {}, shellAnswers).length,
    }).toEqual({ countedAs: "plumbing", posted: 0 });
  });
});

describe("balance posts a result as passed or failed", () => {
  it.each([
    ["CLM-OBS-033", "CLM-ONE-001", "pnpm lint", "it succeeded", { outcome: "success", conclusion: "success" }, false, "passed", [ONE_001]],
    ["CLM-OBS-034", "CLM-ONE-001", "pnpm lint", "it failed", { outcome: "failure", conclusion: "failure" }, false, "failed", [ONE_001]],
    ["CLM-OBS-035", "CLM-ONE-001", "pnpm lint", "it failed, and continue-on-error hid it", { outcome: "failure", conclusion: "success" }, true, "failed", [ONE_001]],
    ["CLM-OBS-136", "audit", "pnpm audit-the-tree", "it succeeded", { outcome: "success", conclusion: "success" }, false, "passed", []],
    ["CLM-OBS-123", "audit", "pnpm audit-the-tree", "it failed", { outcome: "failure", conclusion: "failure" }, false, "failed", []],
  ] as const)("[%s] the step record had a result with the id %s, on a step running %s, and %s: it is posted as its result, citing the code it has", (_clm, id, run, _how, entry, continueOnError, result, cites) => {
    const steps = workflowOf({ ci: { steps: [{ id, run, "continue-on-error": continueOnError }] } });

    expect(fitnessObservationsOf(steps, recordOf({ [id]: entry }), NO_SETTING, {}, shellAnswers).map(({ result: posted, cites: cited }) => ({ result: posted, cites: cited }))).toEqual([
      { result, cites },
    ]);
  });

  it("[CLM-OBS-143] the step record had results with the ids CLM-ONE-001 and CLM-ONE-002, on two steps in ci.yml, each succeeded: each is posted as passed, citing its own code", () => {
    const steps = workflowOf({ ci: { steps: [{ id: "CLM-ONE-001", run: "pnpm lint" }, { id: "CLM-ONE-002", run: "pnpm audit-the-tree" }] } });
    const record = recordOf({ "CLM-ONE-001": { outcome: "success", conclusion: "success" }, "CLM-ONE-002": { outcome: "success", conclusion: "success" } });

    expect(fitnessObservationsOf(steps, record, NO_SETTING, {}, shellAnswers).map(({ result, cites }) => ({ result, cites }))).toEqual([
      { result: "passed", cites: [ONE_001] },
      { result: "passed", cites: [{ featureCode: "ONE", number: "002" }] },
    ]);
  });
});

describe("balance posts what could not run as never ran", () => {
  const neverRan = (id: string, step: object, outcome: string) =>
    fitnessObservationsOf(workflowOf({ ci: { steps: [{ id, ...step }] } }), recordOf({ [id]: { outcome, conclusion: outcome } }), NO_SETTING, {}, shellAnswers).map(({ result, cites, place }) => ({
      result,
      cites,
      place,
    }));

  // The step record's outcome for each recorded step that neither succeeded nor failed.
  const outcomeOf: Readonly<Record<string, string>> = { "one skipped": "skipped", "one with a status balance does not know": "neutral" };

  it.each(postEvidenceObservationVariants["CLM-OBS-053"].variants)("[CLM-OBS-053] the step record said a fitness function's step with the id CLM-ONE-001 neither succeeded nor failed, %s: it is posted as never-ran, citing CLM-ONE-001 and naming that step", (variant) => {
    expect(neverRan("CLM-ONE-001", { name: "Lint", run: "pnpm lint" }, outcomeOf[variant]!)).toEqual([{ result: "never-ran", cites: [ONE_001], place: "ci.yml:ci:Lint" }]);
  });

  it("[CLM-OBS-137] the step record said a fitness function's step with the id audit, in ci.yml running pnpm audit-the-tree, was skipped: it is posted as never-ran, citing no claim code and naming that step", () => {
    expect(neverRan("audit", { run: "pnpm audit-the-tree" }, "skipped")).toEqual([{ result: "never-ran", cites: [], place: "ci.yml:ci:pnpm audit-the-tree" }]);
  });
});

describe("balance posts a fitness function known only from its workflow as passed, or as passed-on-error when its failure is allowed", () => {
  const postedFromWorkflow = (onStep: boolean | undefined, onJob: boolean | undefined) =>
    fitnessObservationsOf(workflowOf({ ci: { "continue-on-error": onJob, steps: [{ id: "CLM-ONE-001", run: "pnpm lint", "continue-on-error": onStep }] } }), [], NO_SETTING, {}, shellAnswers).map(
      ({ result, cites }) => ({ result, cites }),
    );

  it("[CLM-OBS-056] the only evidence of a fitness function with the id CLM-ONE-001 was its step, with continue-on-error not set: it is posted as passed, citing CLM-ONE-001", () => {
    expect(postedFromWorkflow(undefined, undefined)).toEqual([{ result: "passed", cites: [ONE_001] }]);
  });

  // Where each variant sets continue-on-error: true.
  const settingOf: Readonly<Record<string, readonly [onStep: boolean | undefined, onJob: boolean | undefined]>> = { "on the step": [true, undefined], "on its job": [undefined, true] };

  it.each(postEvidenceObservationVariants["CLM-OBS-057"].variants)("[CLM-OBS-057] the only evidence of a fitness function with the id CLM-ONE-001 was its step, with continue-on-error true %s: it is posted as passed-on-error, citing CLM-ONE-001", (variant) => {
    const [onStep, onJob] = settingOf[variant]!;

    expect(postedFromWorkflow(onStep, onJob)).toEqual([{ result: "passed-on-error", cites: [ONE_001] }]);
  });
});

describe("balance posts a recorded step with no workflow step only when its id is a claim code", () => {
  it("[CLM-OBS-096] the step record had an entry for CLM-ONE-001 that was skipped, and no workflow balance read had a step with the id CLM-ONE-001: one never-ran fitness Evidence Observation will be posted, citing CLM-ONE-001, saying where to look: CLM-ONE-001, with the note skipped", () => {
    const steps = workflowOf({ ci: { steps: [{ id: "CLM-ONE-002", run: "pnpm lint" }] } });
    const observations = fitnessObservationsOf(steps, recordOf({ "CLM-ONE-001": { outcome: "skipped", conclusion: "skipped" } }), NO_SETTING, {}, shellAnswers);

    expect(observations).toEqual([
      { cites: [{ featureCode: "ONE", number: "002" }], result: "passed", kind: "fitness", place: "ci.yml:ci:pnpm lint" },
      { cites: [ONE_001], result: "never-ran", kind: "fitness", place: "CLM-ONE-001", notes: ["skipped"] },
    ]);
  });

  it("[CLM-OBS-148] the step record had an entry for audit that was skipped, and no workflow balance read had a step with the id audit: nothing will be posted", () => {
    const steps = workflowOf({ ci: { steps: [{ id: "lint", uses: "actions/checkout@v4" }] } });

    expect(fitnessObservationsOf(steps, recordOf({ audit: { outcome: "skipped", conclusion: "skipped" } }), NO_SETTING, {}, shellAnswers)).toEqual([]);
  });

  it("[CLM-OBS-087] the step record had a passing fitness function with no id: it is posted to the unnamed claim, naming no claim code", () => {
    const steps = workflowOf({ ci: { steps: [{ run: "pnpm lint" }] } });

    const reconciliations = claimReconciliationsOf([], fitnessObservationsOf(steps, [], NO_SETTING, {}, shellAnswers));

    expect(reconciliations.map(({ claim, qualityCheckReconciliations }) => ({ claim, cites: qualityCheckReconciliations.map(({ observation }) => observation?.cites) }))).toEqual([
      { claim: {}, cites: [[]] },
    ]);
  });
});

describe("an Evidence Observation says where to look", () => {
  it.each([
    ["CLM-OBS-102", "the step with no name and an empty command, in job build", { build: { steps: [{ id: "CLM-ONE-001", run: "" }] } }, "ci.yml:build:"],
    ["CLM-OBS-104", "the step Lint in jobs build and test", { build: { steps: [{ id: "CLM-ONE-001", name: "Lint", run: "pnpm lint" }] }, test: { steps: [{ id: "CLM-ONE-001", name: "Lint", run: "pnpm lint" }] } }, "CLM-ONE-001"],
    [
      "CLM-OBS-142",
      "the step Lint in job build, while job test had the fitness function pnpm audit-the-tree,",
      { build: { steps: [{ id: "CLM-ONE-001", name: "Lint", run: "pnpm lint" }] }, test: { steps: [{ run: "pnpm audit-the-tree" }] } },
      "ci.yml:build:Lint",
    ],
  ] as const)("[%s] the step record had a passing fitness result, %s of ci.yml, citing CLM-ONE-001: it says where to look", (_clm, _step, jobs, place) => {
    const record = recordOf({ "CLM-ONE-001": { outcome: "success", conclusion: "success" } });

    const citing = fitnessObservationsOf(workflowOf(jobs), record, NO_SETTING, {}, shellAnswers).filter(({ cites }) => cites.length > 0);

    expect(citing.map((observation) => observation.place)).toEqual([place]);
  });

  // The name each variant gives the step, as the workflow writes it.
  const NAMED: Readonly<Record<string, string>> = { "in words": "Lint", "a number": "1.10" };

  it.each(workflowsVariants["CLM-OBS-081"].variants)("[CLM-OBS-081] the step record had a passing fitness result, the step named %s in job build of ci.yml, citing CLM-ONE-001: it says where to look by that name", (variant) => {
    const name = NAMED[variant];
    if (name === undefined) throw new Error(`no name for the variant ${variant}`);
    const record = recordOf({ "CLM-ONE-001": { outcome: "success", conclusion: "success" } });
    const steps = workflowStepsFrom("ci.yml", `jobs:\n  build:\n    steps:\n      - id: CLM-ONE-001\n        name: ${name}\n        run: pnpm lint\n`);

    const citing = fitnessObservationsOf(steps, record, NO_SETTING, {}, shellAnswers);

    expect(citing.map((observation) => observation.place)).toEqual([`ci.yml:build:${name}`]);
  });

  // The command each variant's step runs.
  const commandOf: Readonly<Record<string, string>> = { "skipping blank lines": "  \n  pnpm lint" };

  it.each(postEvidenceObservationVariants["CLM-OBS-103"].variants)("[CLM-OBS-103] the step record had a passing fitness result, the step with no name, running a blank line then pnpm lint, in job build of ci.yml, citing CLM-ONE-001, %s: it says where to look: ci.yml:build:pnpm lint", (variant) => {
    const steps = workflowOf({ build: { steps: [{ id: "CLM-ONE-001", run: commandOf[variant]! }] } });
    const record = recordOf({ "CLM-ONE-001": { outcome: "success", conclusion: "success" } });

    expect(fitnessObservationsOf(steps, record, NO_SETTING, {}, shellAnswers).map(({ place }) => place)).toEqual(["ci.yml:build:pnpm lint"]);
  });
});

const unitRunner = (runner: string): TargetConfiguration => ({ runners: { unit: runner }, nonChecks: [], deferralTags: [] });
const dispositionOf = (run: string, runner: string, scripts: Readonly<Record<string, string>> = {}) =>
  stepDispositionOf(stepsOf({ run })[0]!, unitRunner(runner), scripts, shellAnswers);
const countedAndPosted = (run: string, runner: string, scripts: Readonly<Record<string, string>> = {}) => {
  const steps = stepsOf({ run });
  return {
    countedAs: stepDispositionOf(steps[0]!, unitRunner(runner), scripts, shellAnswers),
    posted: fitnessObservationsOf(steps, [], unitRunner(runner), scripts, shellAnswers).filter(({ kind }) => kind === "fitness").length,
  };
};

describe("a runner is recognised only as the command a step runs", () => {
  it.each([
    ["CLM-OBS-005", "gradle lint", "gradle test", "fitnessFunction"],
    ["CLM-OBS-006", "eslint vitest.config.ts", "vitest", "fitnessFunction"],
    ["CLM-OBS-007", "vitest run | tee out.txt", "vitest", "fitnessFunction"],
    ["CLM-OBS-007", 'vitest run | while read -r line; do echo "$line"; done', "vitest", "fitnessFunction"],
    ["CLM-OBS-007", "vitest run | if true; then cat; fi", "vitest", "fitnessFunction"],
    ["CLM-OBS-007", "vitest run | (cat)", "vitest", "fitnessFunction"],
  ] as const)("[%s] a step running %s, with %s as its unit runner, will be counted as a %s", (_clm, run, runner, countedAs) => {
    expect(dispositionOf(run, runner)).toBe(countedAs);
  });

  it.each(shellVariants["CLM-OBS-011"].variants)("[CLM-OBS-011] a step running pnpm lint, then vitest run after %s, will be counted as a runner", (separator) => {
    expect(dispositionOf(`pnpm lint ${separator} vitest run`, "vitest")).toBe("runner");
  });

  // Each kind of line a step runs before vitest run.
  const linesBefore: Readonly<Record<string, string>> = {
    "a shell function": 'retry() { "$@" || "$@"; }',
    "an assignment such as start=$SECONDS": "start=$SECONDS",
    "an if … fi block": 'if [ -n "$CI" ]; then\n  echo in CI\nfi',
  };

  it.each(shellVariants["CLM-OBS-122"].variants)("[CLM-OBS-122] a step running other lines first, %s, then vitest run, will be counted as a runner, and nothing will be posted", (variant) => {
    expect(countedAndPosted(`${linesBefore[variant]!}\nvitest run`, "vitest")).toEqual({ countedAs: "runner", posted: 0 });
  });

  // The launchers chained, each handing on to the next, then to vitest.
  const launched = (launcher: string): string =>
    launcher === "launchers chained" ? "uv run python -m vitest" : launcher.includes("<bin>") ? launcher.replace("<bin>", "vitest") : `${launcher} vitest`;

  it.each(shellVariants["CLM-OBS-010"].variants)("[CLM-OBS-010] a step running CI=1, then vitest through %s, will be counted as a runner, and nothing will be posted", (launcher) => {
    expect(countedAndPosted(`CI=1 ${launched(launcher)} run`, "vitest")).toEqual({ countedAs: "runner", posted: 0 });
  });

  // The command each variant runs, and the target's scripts, the one it names running vitest, followed however deep.
  const scriptRunning = (variant: string): readonly [string, Readonly<Record<string, string>>] => {
    if (variant === "a script that runs another script, followed however deep") return ["pnpm test", scriptsFrom({ scripts: { test: "pnpm unit", unit: "pnpm fast", fast: "vitest run" } })];
    const script = variant.includes("<script>") ? "check" : variant.split(" ").at(-1)!;
    return [variant.replace("<script>", script).replace("<name>", "app"), { [script]: "vitest run" }];
  };

  it.each(shellVariants["CLM-OBS-009"].variants)("[CLM-OBS-009] a step running %s, whose script runs vitest, will be counted as a runner, and nothing will be posted", (variant) => {
    const [run, scripts] = scriptRunning(variant);

    expect(countedAndPosted(run, "vitest", scripts)).toEqual({ countedAs: "runner", posted: 0 });
  });

  // A step running a script that leads to no command, and the target's scripts.
  const leadingNowhere: Readonly<Record<string, readonly [string, object]>> = {
    "one that runs itself": ["pnpm loop", { loop: "pnpm loop" }],
    "a scripts entry that is not text": ["pnpm run //", { "//": ["a comment"] }],
  };

  it.each(shellVariants["CLM-OBS-115"].variants)("[CLM-OBS-115] a step running a package script, %s, will be counted as a fitness function, and a fitness Evidence Observation will be posted", (variant) => {
    const [run, scripts] = leadingNowhere[variant]!;

    expect(countedAndPosted(run, "vitest", scriptsFrom({ scripts }))).toEqual({ countedAs: "fitnessFunction", posted: 1 });
  });

  it("[CLM-OBS-125] a step running go test ./..., in a target whose test script runs vitest, will be counted as a fitness function, and a fitness Evidence Observation will be posted", () => {
    expect(countedAndPosted("go test ./...", "vitest", { test: "vitest run" })).toEqual({ countedAs: "fitnessFunction", posted: 1 });
  });

  // A step running vitest behind each wrapper form, past what it takes; xvfb-run's options are given with their values.
  const behindTheWrapper = (variant: string): string => {
    if (variant.startsWith("-")) return `xvfb-run ${variant} vitest run`;
    if (variant === "xvfb-run") return "xvfb-run -a --server-args=-screen vitest run";
    return `${variant.replace("<duration> <duration>", "5 75").replace("<signal>", "KILL").replace("<duration>", "--preserve-status 75")} vitest run`;
  };

  it.each(shellVariants["CLM-OBS-112"].variants)("[CLM-OBS-112] a step running its unit runner behind the wrapper %s, which runs the command after it, will be counted as a runner, and nothing will be posted", (variant) => {
    expect(countedAndPosted(behindTheWrapper(variant), "vitest")).toEqual({ countedAs: "runner", posted: 0 });
  });

  it("[CLM-OBS-126] a step running xvfb-run --help, a wrapper given only options, will be counted as a fitness function, and a fitness Evidence Observation will be posted", () => {
    expect(countedAndPosted("xvfb-run --help", "vitest")).toEqual({ countedAs: "fitnessFunction", posted: 1 });
  });

  it.each(shellVariants["CLM-OBS-113"].variants)("[CLM-OBS-113] a step running %s, a runner named in several words, will be counted as a runner", (runner) => {
    expect(dispositionOf(`${runner} --verbose`, runner)).toBe("runner");
  });

  it("[CLM-OBS-108] a step running vitest run, with the id CLM-ONE-001, whose outcome the step record has, posts that outcome as a fitness Evidence Observation", () => {
    const steps = workflowOf({ ci: { steps: [{ id: "CLM-ONE-001", run: "vitest run" }] } });
    const record = recordOf({ "CLM-ONE-001": { outcome: "failure", conclusion: "failure" } });

    expect({
      countedAs: stepDispositionOf(steps[0]!, unitRunner("vitest"), {}, shellAnswers),
      posted: fitnessObservationsOf(steps, record, unitRunner("vitest"), {}, shellAnswers).map(({ kind, result, cites }) => ({ kind, result, cites })),
    }).toEqual({ countedAs: "runner", posted: [{ kind: "fitness", result: "failed", cites: [ONE_001] }] });
  });

  it.each([
    ["CLM-OBS-145", "running vitest run, with the id unit, whose outcome the step record has", { id: "unit", run: "vitest run" }, [{ unit: { outcome: "success", conclusion: "success" } }], "runner"],
    [
      "CLM-OBS-146",
      "running vitest run, with the id CLM-ONE-001, whose outcome a step record, given, does not have",
      { id: "CLM-ONE-001", run: "vitest run" },
      [{ build: { outcome: "success", conclusion: "success" } }, undefined],
      "runner",
    ],
    [
      "CLM-OBS-147",
      "using actions/checkout, with the id CLM-ONE-001, whose outcome the step record has",
      { id: "CLM-ONE-001", uses: "actions/checkout@v4" },
      [{ "CLM-ONE-001": { outcome: "success", conclusion: "success" } }],
      "plumbing",
    ],
  ] as const)("[%s] a step %s will be counted as the step it is, and nothing will be posted", (_clm, _described, step, records, countedAs) => {
    const steps = workflowOf({ ci: { steps: [step, { id: "build", uses: "actions/setup-node@v4" }] } });
    const configuration = countedAs === "plumbing" ? NO_SETTING : unitRunner("vitest");

    for (const record of records) {
      expect({
        countedAs: stepDispositionOf(steps[0]!, configuration, {}, shellAnswers),
        posted: fitnessObservationsOf(steps, record === undefined ? [] : recordOf(record), configuration, {}, shellAnswers),
      }).toEqual({ countedAs, posted: [] });
    }
  });
});
