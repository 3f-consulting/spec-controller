import { describe, expect, it } from "vitest";
import { scriptsFrom } from "../inputs/manifest.js";
import { shellAnswers } from "../inputs/shell.js";
import { stepRecordFrom } from "../inputs/stepRecord.js";
import shellVariants from "../inputs/shell.variants.json" with { type: "json" };
import workflowsVariants from "../inputs/workflows.variants.json" with { type: "json" };
import { workflowStepsFrom } from "../inputs/workflows.js";
import type { TargetConfiguration } from "./configuration.js";
import { disposedStepsOf, fitnessObservationsOf, stepDispositionOf } from "./postEvidenceObservation.js";
import postEvidenceObservationVariants from "./postEvidenceObservation.variants.json" with { type: "json" };

// A step named in notChecks, if any; a unit layer that has no runner is set to null.
const configurationNaming = (notCheck: string | undefined): TargetConfiguration => ({
  runners: { unit: null },
  nonChecks: notCheck === undefined ? [] : [{ workflow: "ci.yml", job: "ci", step: notCheck }],
  deferralTags: [],
});
const stepsOf = (step: object) => workflowStepsFrom("ci.yml", JSON.stringify({ jobs: { ci: { steps: [step] } } }));

describe("balance identifies each result's kind of quality check", () => {
  it.each([
    ["CLM-OBS-004", "running pnpm audit-the-tree will be", { run: "pnpm audit-the-tree" }, undefined, 1],
    ["CLM-OBS-002", "using actions/dependency-review-action will be", { uses: "actions/dependency-review-action@v4" }, undefined, 1],
    ["CLM-OBS-003", "using someone/checkout will be", { uses: "someone/checkout@v1" }, undefined, 1],
    ["CLM-OBS-008", "running pnpm test, with no unit runner, will be", { run: "pnpm test" }, undefined, 1],
    ["CLM-OBS-012", "running spec-controller balance will not be", { run: "spec-controller balance --features features" }, undefined, 0],
    ["CLM-OBS-119", "running spec-controller balance | tee report.md will not be", { run: "spec-controller balance | tee report.md" }, undefined, 0],
    ["CLM-OBS-109", "running spec-controller balance, in notChecks, will not be", { name: "Reconcile", run: "spec-controller balance" }, "Reconcile", 0],
    ["CLM-OBS-014", "named Install, in notChecks, will not be", { name: "Install", run: "pnpm install" }, "Install", 0],
    ["CLM-OBS-016", "using actions/checkout, in notChecks, will not be", { uses: "actions/checkout@v4" }, "actions/checkout@v4", 0],
  ] as const)("[%s] a step %s a fitness function", (_clm, _described, step, notCheck, posted) => {
    expect(fitnessObservationsOf(disposedStepsOf(stepsOf(step), configurationNaming(notCheck), {}, shellAnswers, []), []).filter(({ kind }) => kind === "fitness").length).toBe(posted);
  });
});

const NO_SETTING: TargetConfiguration = { runners: {}, nonChecks: [], deferralTags: [] };

describe("balance identifies whether a CI step is a fitness function", () => {
  const installIn = (workflow: string, job: string) => workflowStepsFrom(workflow, JSON.stringify({ jobs: { [job]: { steps: [{ name: "Install", run: "pnpm install" }] } } }));
  const notCheckingCiInstall: TargetConfiguration = { runners: {}, nonChecks: [{ workflow: "ci.yml", job: "ci", step: "Install" }], deferralTags: [] };

  it.each([
    ["CLM-OBS-139", "named Install in job test of ci.yml, whose job ci had a step named Install", () => installIn("ci.yml", "test")],
    ["CLM-OBS-140", "named Install in job ci of nightly.yml, beside ci.yml's step Install in job ci", () => installIn("nightly.yml", "ci")],
  ] as const)("[%s] a step %s, with ci.yml:ci:Install in notChecks, will be a fitness function", (_clm, _step, step) => {
    const steps = [...installIn("ci.yml", "ci"), ...step()];
    const counted = steps.slice(1).map((one) => stepDispositionOf(one, notCheckingCiInstall, {}, shellAnswers));

    expect({ counted, posted: fitnessObservationsOf(disposedStepsOf(steps, notCheckingCiInstall, {}, shellAnswers, []), []).length }).toEqual({ counted: ["fitnessFunction"], posted: 1 });
  });

  it("[CLM-OBS-141] a step using actions/dependency-review-action, with vitest as its unit runner, will be a fitness function", () => {
    const steps = stepsOf({ uses: "actions/dependency-review-action@v4" });
    const configuration: TargetConfiguration = { runners: { unit: "vitest" }, nonChecks: [], deferralTags: [] };

    expect({ counted: stepDispositionOf(steps[0]!, configuration, {}, shellAnswers), posted: fitnessObservationsOf(disposedStepsOf(steps, configuration, {}, shellAnswers, []), []).length }).toEqual({
      counted: "fitnessFunction",
      posted: 1,
    });
  });
});
const ONE_001 = { featureCode: "ONE", number: "001" };
const workflowOf = (jobs: object) => workflowStepsFrom("ci.yml", JSON.stringify({ jobs }));

// A step writing out the step record, in each place a step can hold the expression.
const writingTheStepRecord: Readonly<Record<string, object>> = {
  "run:": { run: "echo '${{ toJSON(steps) }}' > steps.json" },
  "env:": { env: { STEPS_JSON: "${{ toJSON(steps) }}" }, run: 'printf \'%s\' "$STEPS_JSON" > steps.json' },
};

describe("a step writing out the step record is the reconciler's", () => {
  it.each(workflowsVariants["step-record-writers"].variants)("[CLM-OBS-013] a step writing out the step record through %s will not be a fitness function", (variant) => {
    expect(fitnessObservationsOf(disposedStepsOf(stepsOf(writingTheStepRecord[variant]!), NO_SETTING, {}, shellAnswers, []), [])).toEqual([]);
  });
});

describe("a step using a plumbing action is plumbing", () => {
  it.each(workflowsVariants["plumbing-actions"].variants)("[CLM-OBS-015] a step using %s will not be a fitness function", (action) => {
    expect(fitnessObservationsOf(disposedStepsOf(stepsOf({ uses: `${action.replace("*", "node")}@v4` }), NO_SETTING, {}, shellAnswers, []), [])).toEqual([]);
  });

  it.each(["actions/cache/save", "actions/upload-artifact/merge"])("[CLM-OBS-015] a step using %s, an action in a plumbing action's repository, will not be a fitness function", (action) => {
    const steps = stepsOf({ uses: `${action}@v4` });

    expect({
      countedAs: stepDispositionOf(steps[0]!, NO_SETTING, {}, shellAnswers),
      posted: fitnessObservationsOf(disposedStepsOf(steps, NO_SETTING, {}, shellAnswers, []), []).length,
    }).toEqual({ countedAs: "plumbing", posted: 0 });
  });
});

describe("balance reads a result as passed or failed, citing the code it names", () => {
  it.each([
    ["CLM-OBS-034", "CLM-ONE-001", "pnpm lint", "it failed", { outcome: "failure", conclusion: "failure" }, undefined, "failed", [ONE_001]],
    ["CLM-OBS-035", "CLM-ONE-001", "pnpm lint", "it failed, and continue-on-error hid it", { outcome: "failure", conclusion: "success" }, true, "failed", [ONE_001]],
    ["CLM-OBS-136", "audit", "pnpm audit-the-tree", "it succeeded", { outcome: "success", conclusion: "success" }, undefined, "passed", []],
    ["CLM-OBS-123", "audit", "pnpm audit-the-tree", "it failed", { outcome: "failure", conclusion: "failure" }, undefined, "failed", []],
  ] as const)("[%s] the step record had a result with the id %s, on a step running %s, and %s: it is read as its result, citing the code it has", (_clm, id, run, _how, entry, continueOnError, result, cites) => {
    const steps = workflowOf({ ci: { steps: [{ id, run, "continue-on-error": continueOnError }] } });

    expect(fitnessObservationsOf(disposedStepsOf(steps, NO_SETTING, {}, shellAnswers, stepRecordFrom({ [id]: entry })), stepRecordFrom({ [id]: entry })).map(({ result: posted, cites: cited }) => ({ result: posted, cites: cited }))).toEqual([
      { result, cites },
    ]);
  });

  it("[CLM-OBS-143] the step record had results with the ids CLM-ONE-001 and CLM-ONE-002, on two steps in ci.yml, each succeeded: each is read as passed, citing its own code", () => {
    const steps = workflowOf({ ci: { steps: [{ id: "CLM-ONE-001", run: "pnpm lint" }, { id: "CLM-ONE-002", run: "pnpm audit-the-tree" }] } });
    const record = stepRecordFrom({ "CLM-ONE-001": { outcome: "success", conclusion: "success" }, "CLM-ONE-002": { outcome: "success", conclusion: "success" } });

    expect(fitnessObservationsOf(disposedStepsOf(steps, NO_SETTING, {}, shellAnswers, record), record).map(({ result, cites }) => ({ result, cites }))).toEqual([
      { result: "passed", cites: [ONE_001] },
      { result: "passed", cites: [{ featureCode: "ONE", number: "002" }] },
    ]);
  });
});

describe("balance posts what could not run as never ran", () => {
  it.each([
    ["CLM-OBS-053", "CLM-ONE-001", "in ci.yml, was skipped", { name: "Lint", run: "pnpm lint" }, "skipped", [ONE_001], "ci.yml:ci:Lint"],
    ["CLM-OBS-054", "CLM-ONE-001", "in ci.yml, had a status balance does not know", { name: "Lint", run: "pnpm lint" }, "neutral", [ONE_001], "ci.yml:ci:Lint"],
    ["CLM-OBS-137", "audit", "in ci.yml running pnpm audit-the-tree, was skipped", { run: "pnpm audit-the-tree" }, "skipped", [], "ci.yml:ci:pnpm audit-the-tree"],
  ] as const)("[%s] the step record said a fitness function's step with the id %s, %s: it is posted as never-ran, citing the code it has and naming that step", (_clm, id, _what, step, outcome, cites, place) => {
    const steps = workflowOf({ ci: { steps: [{ id, ...step }] } });

    expect(
      fitnessObservationsOf(disposedStepsOf(steps, NO_SETTING, {}, shellAnswers, stepRecordFrom({ [id]: { outcome, conclusion: outcome } })), stepRecordFrom({ [id]: { outcome, conclusion: outcome } })).map(({ result, cites: cited, place: placed }) => ({ result, cites: cited, place: placed })),
    ).toEqual([{ result: "never-ran", cites, place }]);
  });
});

describe("balance posts a fitness function's step the step record does not name as not recorded", () => {
  const plumbing = [{ id: "checkout", uses: "actions/checkout@v4" }, { id: "node", uses: "actions/setup-node@v4" }];
  const succeeded = { outcome: "success", conclusion: "success" };

  it.each([
    ["CLM-OBS-056", "with the id CLM-ONE-001", "was not set", "no step record was given", { id: "CLM-ONE-001", run: "pnpm lint" }, {}],
    ["CLM-OBS-157", "with the id CLM-ONE-001", "was not set", "the step record had entries for other steps and none for that step", { id: "CLM-ONE-001", run: "pnpm lint" }, { checkout: succeeded, node: succeeded }],
    ["CLM-OBS-158", "with the id CLM-ONE-001", "was true on it", "no step record was given", { id: "CLM-ONE-001", run: "pnpm lint", "continue-on-error": true }, {}],
    ["CLM-OBS-159", "with no id", "was not set", "a step record was given", { run: "pnpm lint" }, { checkout: succeeded }],
  ] as const)("[%s] a workflow had a fitness function's step %s, and continue-on-error %s, and %s: it is posted as not recorded", (_clm, _identity, _set, _record, step, record) => {
    const steps = workflowOf({ ci: { steps: [...plumbing, step] } });

    expect(fitnessObservationsOf(disposedStepsOf(steps, NO_SETTING, {}, shellAnswers, stepRecordFrom(record)), stepRecordFrom(record)).map(({ result }) => result)).toEqual(["not-recorded"]);
  });

  // Posting reads no claim, so the executable claim needs no input here.
  it("[CLM-OBS-161] a workflow had a fitness function's step with the id CLM-ONE-001, an executable claim carried CLM-ONE-001, and the step record had entries for other steps and none for that step: it is posted citing no claim code", () => {
    const steps = workflowOf({ ci: { steps: [...plumbing, { id: "CLM-ONE-001", run: "pnpm lint" }] } });

    expect(fitnessObservationsOf(disposedStepsOf(steps, NO_SETTING, {}, shellAnswers, stepRecordFrom({ checkout: succeeded, node: succeeded })), stepRecordFrom({ checkout: succeeded, node: succeeded })).map(({ cites }) => cites)).toEqual([[]]);
  });
});

describe("balance posts a fitness function's step from each step record that names it", () => {
  const succeeded = { outcome: "success", conclusion: "success" };
  const failed = { outcome: "failure", conclusion: "failure" };

  it.each([
    ["CLM-OBS-166", "one with no entry for CLM-ONE-001, and one in which it succeeded", { checkout: succeeded }, { "CLM-ONE-001": succeeded }, ["passed"]],
    ["CLM-OBS-167", "one in which CLM-ONE-001 succeeded, and one in which it failed", { "CLM-ONE-001": succeeded }, { "CLM-ONE-001": failed }, ["passed", "failed"]],
  ] as const)("[%s] a workflow had a fitness function's step with the id CLM-ONE-001, and the run read two step records, %s: a fitness Evidence Observation is posted for each entry naming it, citing CLM-ONE-001", (_clm, _records, first, second, results) => {
    const steps = workflowOf({ ci: { steps: [{ id: "checkout", uses: "actions/checkout@v4" }, { id: "CLM-ONE-001", run: "pnpm lint" }] } });
    const record = [...stepRecordFrom(first), ...stepRecordFrom(second)];

    expect(fitnessObservationsOf(disposedStepsOf(steps, NO_SETTING, {}, shellAnswers, record), record).map(({ kind, result, cites }) => ({ kind, result, cites }))).toEqual(
      results.map((result) => ({ kind: "fitness", result, cites: [ONE_001] })),
    );
  });
});

describe("balance posts a recorded success in a workflow as passed-on-error only when its step or its job sets continue-on-error to anything but false", () => {
  const postedWith = (onStep: unknown, onJob: unknown) => {
    const steps = workflowOf({ ci: { "continue-on-error": onJob, steps: [{ id: "CLM-ONE-001", run: "pnpm lint", "continue-on-error": onStep }] } });
    const record = stepRecordFrom({ "CLM-ONE-001": { outcome: "success", conclusion: "success" } });
    return fitnessObservationsOf(disposedStepsOf(steps, NO_SETTING, {}, shellAnswers, record), record).map(({ result, cites }) => ({ result, cites }));
  };

  it.each(postEvidenceObservationVariants["failure-allowed-on-a-step"].variants)("[CLM-OBS-057] the step record had a result with the id CLM-ONE-001, on a fitness function's step in ci.yml, and it succeeded, and ci.yml set continue-on-error on that step to %s: it is posted as passed-on-error, citing CLM-ONE-001", (value) => {
    expect(postedWith(value, undefined)).toEqual([{ result: "passed-on-error", cites: [ONE_001] }]);
  });

  it.each(postEvidenceObservationVariants["failure-allowed-on-a-job"].variants)("[CLM-OBS-058] the step record had a result with the id CLM-ONE-001, on a fitness function's step in ci.yml, and it succeeded, and ci.yml set continue-on-error on that step's job to %s: it is posted as passed-on-error, citing CLM-ONE-001", (value) => {
    expect(postedWith(undefined, value)).toEqual([{ result: "passed-on-error", cites: [ONE_001] }]);
  });

  it("[CLM-OBS-160] the step record had a result with the id CLM-ONE-001, on a fitness function's step in ci.yml, and it succeeded, and ci.yml set continue-on-error on that step to false: it is posted as passed, citing CLM-ONE-001", () => {
    expect(postedWith(false, undefined)).toEqual([{ result: "passed", cites: [ONE_001] }]);
  });
});

describe("a recorded step no workflow has, and a step whose id is not a claim code", () => {
  it.each([
    ["CLM-OBS-096", "CLM-ONE-001", "was skipped", "skipped", "never-ran", [ONE_001]],
    ["CLM-OBS-162", "CLM-ONE-001", "succeeded", "success", "passed-on-error", [ONE_001]],
    ["CLM-OBS-163", "CLM-ONE-001", "failed", "failure", "failed", [ONE_001]],
    ["CLM-OBS-148", "audit", "succeeded", "success", "passed-on-error", []],
  ] as const)("[%s] the step record had an entry for %s that %s, and no workflow had a step with that id: a fitness Evidence Observation is posted, as its result, citing the code it has, placed at its id", (_clm, id, _how, outcome, result, cites) => {
    const steps = workflowOf({ ci: { steps: [{ id: "checkout", uses: "actions/checkout@v4" }] } });

    expect(fitnessObservationsOf(disposedStepsOf(steps, NO_SETTING, {}, shellAnswers, stepRecordFrom({ [id]: { outcome, conclusion: outcome } })), stepRecordFrom({ [id]: { outcome, conclusion: outcome } }))).toEqual([{ kind: "fitness", result, cites, place: id }]);
  });

  it("[CLM-OBS-097] balance posts a fitness function whose id is not a claim code once, citing no claim code", () => {
    const steps = workflowOf({ ci: { steps: [{ id: "audit", run: "pnpm audit-the-tree" }] } });
    const observations = fitnessObservationsOf(disposedStepsOf(steps, NO_SETTING, {}, shellAnswers, stepRecordFrom({ audit: { outcome: "success", conclusion: "success" } })), stepRecordFrom({ audit: { outcome: "success", conclusion: "success" } }));

    expect(observations.map(({ kind, cites }) => ({ kind, cites }))).toEqual([{ kind: "fitness", cites: [] }]);
  });
});

describe("an Evidence Observation says where to look", () => {
  it.each([
    ["CLM-OBS-081", "the step Lint in job build", { build: { steps: [{ id: "CLM-ONE-001", name: "Lint", run: "pnpm lint" }] } }, "ci.yml:build:Lint"],
    ["CLM-OBS-101", "the step with 3 as its name, running pnpm lint, in job build", { build: { steps: [{ id: "CLM-ONE-001", name: 3, run: "pnpm lint" }] } }, "ci.yml:build:3"],
    ["CLM-OBS-102", "the step with no name and an empty command, in job build", { build: { steps: [{ id: "CLM-ONE-001", run: "" }] } }, "ci.yml:build:"],
    ["CLM-OBS-103", "the step with no name, running a blank line then pnpm lint, in job build", { build: { steps: [{ id: "CLM-ONE-001", run: "  \n  pnpm lint" }] } }, "ci.yml:build:pnpm lint"],
    ["CLM-OBS-104", "the step Lint in jobs build and test", { build: { steps: [{ id: "CLM-ONE-001", name: "Lint", run: "pnpm lint" }] }, test: { steps: [{ id: "CLM-ONE-001", name: "Lint", run: "pnpm lint" }] } }, "CLM-ONE-001"],
    [
      "CLM-OBS-142",
      "the step Lint in job build, while job test had the fitness function pnpm audit-the-tree,",
      { build: { steps: [{ id: "CLM-ONE-001", name: "Lint", run: "pnpm lint" }] }, test: { steps: [{ run: "pnpm audit-the-tree" }] } },
      "ci.yml:build:Lint",
    ],
  ] as const)("[%s] the step record had a passing fitness result, %s of ci.yml, citing CLM-ONE-001: it says where to look", (_clm, _step, jobs, place) => {
    const record = stepRecordFrom({ "CLM-ONE-001": { outcome: "success", conclusion: "success" } });

    const citing = fitnessObservationsOf(disposedStepsOf(workflowOf(jobs), NO_SETTING, {}, shellAnswers, record), record).filter(({ cites }) => cites.length > 0);

    expect(citing.map((observation) => observation.place)).toEqual([place]);
  });
});

const unitRunner = (runner: string): TargetConfiguration => ({ runners: { unit: runner }, nonChecks: [], deferralTags: [] });
const isFitnessFunction = (run: string, runner: string, scripts: Readonly<Record<string, string>> = {}) =>
  fitnessObservationsOf(disposedStepsOf(stepsOf({ run }), unitRunner(runner), scripts, shellAnswers, []), []).length > 0;

describe("a runner is recognised only as the command a step runs", () => {
  it.each([
    ["CLM-OBS-005", "gradle lint", "gradle test", true],
    ["CLM-OBS-006", "eslint vitest.config.ts", "vitest", true],
  ] as const)("[%s] a step running %s, with %s as its unit runner, will be a fitness function", (_clm, run, runner, fitnessFunction) => {
    expect(isFitnessFunction(run, runner)).toBe(fitnessFunction);
  });

  it.each(shellVariants["pipes-onward"].variants)("[CLM-OBS-007] a step running %s, with vitest as its unit runner, will be a fitness function", (run) => {
    expect(isFitnessFunction(run, "vitest")).toBe(true);
  });

  it.each(shellVariants["command-lists"].variants)("[CLM-OBS-011] a step running pnpm lint, then vitest run after %s, will not be a fitness function", (separator) => {
    expect(isFitnessFunction(`pnpm lint ${separator} vitest run`, "vitest")).toBe(false);
  });

  it("[CLM-OBS-122] a step defining a shell function, then running vitest run, will not be a fitness function", () => {
    expect(isFitnessFunction('retry() { "$@" || "$@"; }\nvitest run', "vitest")).toBe(false);
  });

  it("[CLM-OBS-124] a step setting start=$SECONDS on one line, then running vitest run, will not be a fitness function", () => {
    expect(isFitnessFunction("start=$SECONDS\nvitest run", "vitest")).toBe(false);
  });

  it("[CLM-OBS-127] a step running an if … fi block, then vitest run, will not be a fitness function", () => {
    expect(isFitnessFunction('if [ -n "$CI" ]; then\n  echo in CI\nfi\nvitest run', "vitest")).toBe(false);
  });

  it.each(shellVariants["launchers"].variants)("[CLM-OBS-010] a step running vitest after a NAME=value setting, through the launcher %s, will not be a fitness function", (launcher) => {
    const handedOn = launcher.includes("<bin>") ? launcher.replace("<bin>", "vitest") : `${launcher} vitest`;

    expect(isFitnessFunction(`CI=1 ${handedOn} run`, "vitest")).toBe(false);
  });

  it("[CLM-OBS-116] a step running uv run python -m pytest, a runner behind two launchers, will not be a fitness function", () => {
    expect(isFitnessFunction("uv run python -m pytest", "pytest")).toBe(false);
  });

  it.each(shellVariants["script-runs"].variants)("[CLM-OBS-009] a step running a script as %s, whose script runs vitest, will not be a fitness function", (variant) => {
    const script = variant.includes("<script>") ? "check" : variant.split(" ").at(-1)!;

    expect(isFitnessFunction(variant.replace("<script>", script).replace("<name>", "app"), "vitest", { [script]: "vitest run" })).toBe(false);
  });

  it("[CLM-OBS-114] a step running pnpm test, whose script runs another script, whose script runs vitest, will not be a fitness function", () => {
    expect(isFitnessFunction("pnpm test", "vitest", scriptsFrom({ scripts: { test: "pnpm unit", unit: "vitest run" } }))).toBe(false);
  });

  it("[CLM-OBS-131] a step running pnpm run //, whose scripts entry is a list, not a string, will be a fitness function", () => {
    expect(isFitnessFunction("pnpm run //", "vitest", scriptsFrom({ scripts: { "//": ["a comment"] } }))).toBe(true);
  });

  it("[CLM-OBS-115] a step running pnpm loop, whose script runs itself, will be a fitness function", () => {
    expect(isFitnessFunction("pnpm loop", "vitest", { loop: "pnpm loop" })).toBe(true);
  });

  it("[CLM-OBS-125] a step running go test ./..., in a target whose test script runs vitest, will be a fitness function", () => {
    expect(isFitnessFunction("go test ./...", "vitest", { test: "vitest run" })).toBe(true);
  });

  // A step running vitest behind each wrapper.
  const behindTheWrapper: Readonly<Record<string, string>> = {
    "xvfb-run": "xvfb-run vitest run",
    "timeout <duration>": "timeout 75 vitest run",
  };

  it.each(shellVariants["wrappers"].variants)("[CLM-OBS-112] a step running its unit runner behind the wrapper %s will not be a fitness function", (wrapper) => {
    expect(isFitnessFunction(behindTheWrapper[wrapper]!, "vitest")).toBe(false);
  });

  it.each(["-k 5", "-s KILL"])("[CLM-OBS-112] a step running its unit runner behind timeout %s 75, past an option and that option's value, will not be a fitness function", (option) => {
    expect(isFitnessFunction(`timeout ${option} 75 vitest run`, "vitest")).toBe(false);
  });

  it.each(shellVariants["xvfb-run-options"].variants)("[CLM-OBS-117] a step running xvfb-run %s vitest run, past an option and that option's value, will not be a fitness function", (option) => {
    expect(isFitnessFunction(`xvfb-run ${option} vitest run`, "vitest")).toBe(false);
  });

  it("[CLM-OBS-126] a step running xvfb-run --help, a wrapper given only options, will be a fitness function", () => {
    expect(isFitnessFunction("xvfb-run --help", "vitest")).toBe(true);
  });

  it.each(shellVariants["runners-in-several-words"].variants)("[CLM-OBS-113] a step running %s, a runner named in several words, will not be a fitness function", (runner) => {
    expect(isFitnessFunction(`${runner} --verbose`, runner)).toBe(false);
  });

  it("[CLM-OBS-108] a step running vitest run, with the id CLM-ONE-001, whose outcome the step record has, will be a fitness function", () => {
    const steps = workflowOf({ ci: { steps: [{ id: "CLM-ONE-001", run: "vitest run" }] } });
    const record = stepRecordFrom({ "CLM-ONE-001": { outcome: "failure", conclusion: "failure" } });

    expect(fitnessObservationsOf(disposedStepsOf(steps, unitRunner("vitest"), {}, shellAnswers, record), record).map(({ kind }) => kind)).toEqual(["fitness"]);
  });

  it.each([
    ["CLM-OBS-145", "running vitest run, with the id unit, whose outcome the step record has", { id: "unit", run: "vitest run" }, [{ unit: { outcome: "success", conclusion: "success" } }], "runner"],
    [
      "CLM-OBS-146",
      "running vitest run, with the id CLM-ONE-001, whose outcome a step record, given, does not have",
      { id: "CLM-ONE-001", run: "vitest run" },
      [{ build: { outcome: "success", conclusion: "success" } }],
      "runner",
    ],
    [
      "CLM-OBS-147",
      "using actions/checkout, with the id CLM-ONE-001, whose outcome the step record has",
      { id: "CLM-ONE-001", uses: "actions/checkout@v4" },
      [{ "CLM-ONE-001": { outcome: "success", conclusion: "success" } }],
      "plumbing",
    ],
  ] as const)("[%s] a step %s will not be a fitness function", (_clm, _described, step, records, countedAs) => {
    const steps = workflowOf({ ci: { steps: [step, { id: "build", uses: "actions/setup-node@v4" }] } });
    const configuration = countedAs === "plumbing" ? NO_SETTING : unitRunner("vitest");

    for (const record of records) {
      expect(fitnessObservationsOf(disposedStepsOf(steps, configuration, {}, shellAnswers, stepRecordFrom(record)), stepRecordFrom(record))).toEqual([]);
    }
  });
});
