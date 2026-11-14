import { describe, expect, it } from "vitest";
import { scriptsFrom } from "../inputs/manifest.js";
import { shellAnswers } from "../inputs/shell.js";
import { stepRecordFrom } from "../inputs/stepRecord.js";
import shellVariants from "../inputs/shell.variants.json" with { type: "json" };
import workflowsVariants from "../inputs/workflows.variants.json" with { type: "json" };
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
const stepsOf = (step: object) => workflowStepsFrom("ci.yml", JSON.stringify({ jobs: { ci: { steps: [step] } } }));

describe("balance posts only the steps that prove something", () => {
  it.each([
    ["CLM-OBS-004", "running pnpm audit-the-tree", { run: "pnpm audit-the-tree" }, undefined, "candidate", 1],
    ["CLM-OBS-002", "using actions/dependency-review-action", { uses: "actions/dependency-review-action@v4" }, undefined, "candidate", 1],
    ["CLM-OBS-003", "using someone/checkout", { uses: "someone/checkout@v1" }, undefined, "candidate", 1],
    ["CLM-OBS-008", "running pnpm test, with no unit runner", { run: "pnpm test" }, undefined, "candidate", 1],
    ["CLM-OBS-012", "running spec-controller balance", { run: "spec-controller balance --features features" }, undefined, "reconciler", 0],
    ["CLM-OBS-119", "running spec-controller balance | tee report.md", { run: "spec-controller balance | tee report.md" }, undefined, "reconciler", 0],
    ["CLM-OBS-109", "running spec-controller balance, in notChecks", { name: "Reconcile", run: "spec-controller balance" }, "Reconcile", "reconciler", 0],
    ["CLM-OBS-014", "named Install, in notChecks", { name: "Install", run: "pnpm install" }, "Install", "nonCheck", 0],
    ["CLM-OBS-016", "using actions/checkout, in notChecks", { uses: "actions/checkout@v4" }, "actions/checkout@v4", "nonCheck", 0],
  ] as const)("[%s] a step %s will be counted as the step it is, and posts a fitness Evidence Observation only as a fitness function", (_clm, _described, step, notCheck, countedAs, posted) => {
    const steps = stepsOf(step);
    const configuration = configurationNaming(notCheck);

    expect({
      countedAs: stepDispositionOf(steps[0]!, configuration, {}, shellAnswers),
      posted: fitnessObservationsOf(steps, [], configuration, {}, shellAnswers).filter(({ kind }) => kind === "fitness").length,
    }).toEqual({ countedAs, posted });
  });
});

const NO_SETTING: TargetConfiguration = { runners: {}, nonChecks: [], deferralTags: [] };

describe("balance posts a fitness Evidence Observation only for a step that is a fitness function, unless it runs a runner and its id is a claim code the step record holds", () => {
  const installIn = (workflow: string, job: string) => workflowStepsFrom(workflow, JSON.stringify({ jobs: { [job]: { steps: [{ name: "Install", run: "pnpm install" }] } } }));
  const notCheckingCiInstall: TargetConfiguration = { runners: {}, nonChecks: [{ workflow: "ci.yml", job: "ci", step: "Install" }], deferralTags: [] };

  it.each([
    ["CLM-OBS-139", "named Install in job test of ci.yml, whose job ci had a step named Install", () => installIn("ci.yml", "test")],
    ["CLM-OBS-140", "named Install in job ci of nightly.yml, beside ci.yml's step Install in job ci", () => installIn("nightly.yml", "ci")],
  ] as const)("[%s] a step %s, with ci.yml:ci:Install in notChecks, is counted as a fitness function and posted", (_clm, _step, step) => {
    const steps = [...installIn("ci.yml", "ci"), ...step()];
    const counted = steps.slice(1).map((one) => stepDispositionOf(one, notCheckingCiInstall, {}, shellAnswers));

    expect({ counted, posted: fitnessObservationsOf(steps, [], notCheckingCiInstall, {}, shellAnswers).length }).toEqual({ counted: ["candidate"], posted: 1 });
  });

  it("[CLM-OBS-141] a step using actions/dependency-review-action, with vitest as its unit runner, is counted as a fitness function and posted", () => {
    const steps = stepsOf({ uses: "actions/dependency-review-action@v4" });
    const configuration: TargetConfiguration = { runners: { unit: "vitest" }, nonChecks: [], deferralTags: [] };

    expect({ counted: stepDispositionOf(steps[0]!, configuration, {}, shellAnswers), posted: fitnessObservationsOf(steps, [], configuration, {}, shellAnswers).length }).toEqual({
      counted: "candidate",
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

  it.each(["actions/cache/save", "actions/upload-artifact/merge"])("[CLM-OBS-015] a step using %s, an action in a plumbing action's repository, will be counted as plumbing, and nothing will be posted", (action) => {
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
  it.each([
    ["CLM-OBS-053", "CLM-ONE-001", "was skipped", { name: "Lint", run: "pnpm lint" }, "skipped", [ONE_001], "ci.yml:ci:Lint"],
    ["CLM-OBS-054", "CLM-ONE-001", "had a status balance does not know", { name: "Lint", run: "pnpm lint" }, "neutral", [ONE_001], "ci.yml:ci:Lint"],
    ["CLM-OBS-137", "audit", "was skipped", { run: "pnpm audit-the-tree" }, "skipped", [], "ci.yml:ci:pnpm audit-the-tree"],
  ] as const)("[%s] the step record said a fitness function's step with the id %s %s: it is posted as never-ran, citing the code it has and naming that step", (_clm, id, _what, step, outcome, cites, place) => {
    const steps = workflowOf({ ci: { steps: [{ id, ...step }] } });

    expect(
      fitnessObservationsOf(steps, recordOf({ [id]: { outcome, conclusion: outcome } }), NO_SETTING, {}, shellAnswers).map(({ result, cites: cited, place: placed }) => ({ result, cites: cited, place: placed })),
    ).toEqual([{ result: "never-ran", cites, place }]);
  });
});

describe("balance posts a fitness function known only from its workflow as passed, or as passed-on-error when its failure is allowed", () => {
  it.each([
    ["CLM-OBS-056", "not set", undefined, undefined, "passed"],
    ["CLM-OBS-057", "true on its step", true, undefined, "passed-on-error"],
    ["CLM-OBS-058", "true on its job", undefined, true, "passed-on-error"],
  ] as const)("[%s] the only evidence of a fitness function with the id CLM-ONE-001 was its step, with continue-on-error %s: it is posted as its result, citing CLM-ONE-001", (_clm, _set, onStep, onJob, result) => {
    const steps = workflowOf({ ci: { "continue-on-error": onJob, steps: [{ id: "CLM-ONE-001", run: "pnpm lint", "continue-on-error": onStep }] } });

    expect(fitnessObservationsOf(steps, [], NO_SETTING, {}, shellAnswers).map(({ result, cites }) => ({ result, cites }))).toEqual([{ result, cites: [ONE_001] }]);
  });
});

describe("a recorded step no workflow holds, and a step whose id is not a claim code", () => {
  it("[CLM-OBS-096] balance posts a recorded step that no workflow holds at its claim code, as never ran, with the note the record gave", () => {
    const steps = workflowOf({ ci: { steps: [{ id: "CLM-ONE-002", run: "pnpm lint" }] } });
    const observations = fitnessObservationsOf(steps, recordOf({ "CLM-ONE-001": { outcome: "skipped", conclusion: "skipped" } }), NO_SETTING, {}, shellAnswers);

    expect(observations).toEqual([
      { cites: [{ featureCode: "ONE", number: "002" }], result: "passed", kind: "fitness", place: "ci.yml:ci:pnpm lint" },
      { cites: [ONE_001], result: "never-ran", kind: "fitness", place: "CLM-ONE-001", notes: ["skipped"] },
    ]);
  });

  it("[CLM-OBS-148] balance posts nothing for a recorded step that no workflow holds, when its id is not a claim code", () => {
    const steps = workflowOf({ ci: { steps: [{ id: "lint", uses: "actions/checkout@v4" }] } });

    expect(fitnessObservationsOf(steps, recordOf({ audit: { outcome: "skipped", conclusion: "skipped" } }), NO_SETTING, {}, shellAnswers)).toEqual([]);
  });

  it("[CLM-OBS-097] a fitness function whose id is not a claim code will be posted once, citing no claim code", () => {
    const steps = workflowOf({ ci: { steps: [{ id: "audit", run: "pnpm audit-the-tree" }] } });
    const observations = fitnessObservationsOf(steps, recordOf({ audit: { outcome: "success", conclusion: "success" } }), NO_SETTING, {}, shellAnswers);

    expect(observations.map(({ kind, cites }) => ({ kind, cites }))).toEqual([{ kind: "fitness", cites: [] }]);
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
    ["CLM-OBS-081", "the step Lint in job build", { build: { steps: [{ id: "CLM-ONE-001", name: "Lint", run: "pnpm lint" }] } }, "ci.yml:build:Lint"],
    ["CLM-OBS-101", "the step with 3 as its name, running pnpm lint, in job build", { build: { steps: [{ id: "CLM-ONE-001", name: 3, run: "pnpm lint" }] } }, "ci.yml:build:pnpm lint"],
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
    const record = recordOf({ "CLM-ONE-001": { outcome: "success", conclusion: "success" } });

    const citing = fitnessObservationsOf(workflowOf(jobs), record, NO_SETTING, {}, shellAnswers).filter(({ cites }) => cites.length > 0);

    expect(citing.map((observation) => observation.place)).toEqual([place]);
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
    ["CLM-OBS-005", "gradle lint", "gradle test", "candidate"],
    ["CLM-OBS-006", "eslint vitest.config.ts", "vitest", "candidate"],
    ["CLM-OBS-007", "vitest run | tee out.txt", "vitest", "candidate"],
  ] as const)("[%s] a step running %s, with %s as its unit runner, will be counted as a %s", (_clm, run, runner, countedAs) => {
    expect(dispositionOf(run, runner)).toBe(countedAs);
  });

  it.each(shellVariants["CLM-OBS-011"].variants)("[CLM-OBS-011] a step running pnpm lint, then vitest run after %s, will be counted as a runner", (separator) => {
    expect(dispositionOf(`pnpm lint ${separator} vitest run`, "vitest")).toBe("runner");
  });

  it("[CLM-OBS-122] a step defining a shell function, then running vitest run, will be counted as a runner, and nothing will be posted", () => {
    expect(countedAndPosted('retry() { "$@" || "$@"; }\nvitest run', "vitest")).toEqual({ countedAs: "runner", posted: 0 });
  });

  it("[CLM-OBS-124] a step setting start=$SECONDS on one line, then running vitest run, will be counted as a runner, and nothing will be posted", () => {
    expect(countedAndPosted("start=$SECONDS\nvitest run", "vitest")).toEqual({ countedAs: "runner", posted: 0 });
  });

  it("[CLM-OBS-127] a step running an if … fi block, then vitest run, will be counted as a runner, and nothing will be posted", () => {
    expect(countedAndPosted('if [ -n "$CI" ]; then\n  echo in CI\nfi\nvitest run', "vitest")).toEqual({ countedAs: "runner", posted: 0 });
  });

  it.each(shellVariants["CLM-OBS-010"].variants)("[CLM-OBS-010] a step running vitest after a NAME=value setting, through the launcher %s, will be counted as a runner", (launcher) => {
    const handedOn = launcher.includes("<bin>") ? launcher.replace("<bin>", "vitest") : `${launcher} vitest`;

    expect(dispositionOf(`CI=1 ${handedOn} run`, "vitest")).toBe("runner");
  });

  it("[CLM-OBS-116] a step running uv run python -m pytest, a runner behind two launchers, will be counted as a runner, and nothing will be posted", () => {
    expect(countedAndPosted("uv run python -m pytest", "pytest")).toEqual({ countedAs: "runner", posted: 0 });
  });

  it.each(shellVariants["CLM-OBS-009"].variants)("[CLM-OBS-009] a step running a script as %s, whose script runs vitest, will be counted as a runner", (variant) => {
    const script = variant.includes("<script>") ? "check" : variant.split(" ").at(-1)!;

    expect(dispositionOf(variant.replace("<script>", script).replace("<name>", "app"), "vitest", { [script]: "vitest run" })).toBe("runner");
  });

  it("[CLM-OBS-114] a step running pnpm test, whose script runs another script, whose script runs vitest, will be counted as a runner, and nothing will be posted", () => {
    expect(countedAndPosted("pnpm test", "vitest", scriptsFrom({ scripts: { test: "pnpm unit", unit: "vitest run" } }))).toEqual({ countedAs: "runner", posted: 0 });
  });

  it("[CLM-OBS-131] a step running pnpm run //, whose scripts entry is a list, not a string, will be counted as a fitness function, and a fitness Evidence Observation will be posted", () => {
    expect(countedAndPosted("pnpm run //", "vitest", scriptsFrom({ scripts: { "//": ["a comment"] } }))).toEqual({ countedAs: "candidate", posted: 1 });
  });

  it("[CLM-OBS-115] a step running pnpm loop, whose script runs itself, will be counted as a fitness function, and a fitness Evidence Observation will be posted", () => {
    expect(countedAndPosted("pnpm loop", "vitest", { loop: "pnpm loop" })).toEqual({ countedAs: "candidate", posted: 1 });
  });

  it("[CLM-OBS-125] a step running go test ./..., in a target whose test script runs vitest, will be counted as a fitness function, and a fitness Evidence Observation will be posted", () => {
    expect(countedAndPosted("go test ./...", "vitest", { test: "vitest run" })).toEqual({ countedAs: "candidate", posted: 1 });
  });

  // A step running vitest behind each wrapper, past what the wrapper takes.
  const behindTheWrapper: Readonly<Record<string, string>> = {
    "xvfb-run": "xvfb-run -a --server-args=-screen vitest run",
    "timeout <duration>": "timeout --preserve-status 75 vitest run",
  };

  it.each(shellVariants["CLM-OBS-112"].variants)("[CLM-OBS-112] a step running its unit runner behind the wrapper %s, past its options, will be counted as a runner", (wrapper) => {
    expect(dispositionOf(behindTheWrapper[wrapper]!, "vitest")).toBe("runner");
  });

  it.each(["-k 5", "-s KILL"])("[CLM-OBS-112] a step running its unit runner behind timeout %s 75, past an option and that option's value, will be counted as a runner", (option) => {
    expect(dispositionOf(`timeout ${option} 75 vitest run`, "vitest")).toBe("runner");
  });

  it.each(shellVariants["CLM-OBS-117"].variants)("[CLM-OBS-117] a step running xvfb-run %s vitest run, past an option and that option's value, will be counted as a runner, and nothing will be posted", (option) => {
    expect(countedAndPosted(`xvfb-run ${option} vitest run`, "vitest")).toEqual({ countedAs: "runner", posted: 0 });
  });

  it("[CLM-OBS-126] a step running xvfb-run --help, a wrapper given only options, will be counted as a fitness function, and a fitness Evidence Observation will be posted", () => {
    expect(countedAndPosted("xvfb-run --help", "vitest")).toEqual({ countedAs: "candidate", posted: 1 });
  });

  it.each(shellVariants["CLM-OBS-113"].variants)("[CLM-OBS-113] a step running %s, a runner named in several words, will be counted as a runner", (runner) => {
    expect(dispositionOf(`${runner} --verbose`, runner)).toBe("runner");
  });

  it("[CLM-OBS-108] a step running vitest run, with the id CLM-ONE-001, whose outcome the step record holds, posts that outcome as a fitness Evidence Observation", () => {
    const steps = workflowOf({ ci: { steps: [{ id: "CLM-ONE-001", run: "vitest run" }] } });
    const record = recordOf({ "CLM-ONE-001": { outcome: "failure", conclusion: "failure" } });

    expect({
      countedAs: stepDispositionOf(steps[0]!, unitRunner("vitest"), {}, shellAnswers),
      posted: fitnessObservationsOf(steps, record, unitRunner("vitest"), {}, shellAnswers).map(({ kind, result, cites }) => ({ kind, result, cites })),
    }).toEqual({ countedAs: "runner", posted: [{ kind: "fitness", result: "failed", cites: [ONE_001] }] });
  });

  it.each([
    ["CLM-OBS-145", "running vitest run, with the id unit, whose outcome the step record holds", { id: "unit", run: "vitest run" }, [{ unit: { outcome: "success", conclusion: "success" } }], "runner"],
    [
      "CLM-OBS-146",
      "running vitest run, with the id CLM-ONE-001, whose outcome a step record, given, does not hold",
      { id: "CLM-ONE-001", run: "vitest run" },
      [{ build: { outcome: "success", conclusion: "success" } }, undefined],
      "runner",
    ],
    [
      "CLM-OBS-147",
      "using actions/checkout, with the id CLM-ONE-001, whose outcome the step record holds",
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
