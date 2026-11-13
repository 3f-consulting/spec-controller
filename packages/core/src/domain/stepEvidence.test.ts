import { describe, expect, it } from "vitest";
import { shellAnswers } from "../inputs/shell.js";
import { stepRecordFrom } from "../inputs/stepRecord.js";
import shellVariants from "../inputs/shell.variants.json" with { type: "json" };
import workflowsVariants from "../inputs/workflows.variants.json" with { type: "json" };
import { workflowStepsFrom } from "../inputs/workflows.js";
import type { TargetConfiguration } from "./configuration.js";
import { fitnessObservationsOf, stepDispositionOf } from "./postEvidenceObservation.js";

const configurationNaming = (notCheck: string | undefined): TargetConfiguration => ({
  runners: {},
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
    ["CLM-OBS-013", "writing out the step record", { run: "echo '${{ toJSON(steps) }}' > steps.json" }, undefined, "reconciler", 0],
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
const ONE_001 = { featureCode: "ONE", number: "001" };
const workflowOf = (jobs: object) => workflowStepsFrom("ci.yml", JSON.stringify({ jobs }));
const recordOf = (record: object) => stepRecordFrom(record);

describe("a step using a plumbing action is plumbing", () => {
  it.each(workflowsVariants["CLM-OBS-015"].variants)("[CLM-OBS-015] a step using %s will be counted as plumbing, and nothing will be posted", (action) => {
    const steps = stepsOf({ uses: `${action.replace("*", "node")}@v4` });

    expect({
      countedAs: stepDispositionOf(steps[0]!, NO_SETTING, {}, shellAnswers),
      posted: fitnessObservationsOf(steps, [], NO_SETTING, {}, shellAnswers).length,
    }).toEqual({ countedAs: "plumbing", posted: 0 });
  });
});

describe("balance posts each result with how it went", () => {
  it.each([
    ["CLM-OBS-033", "it succeeded", { outcome: "success", conclusion: "success" }, false, "passed"],
    ["CLM-OBS-034", "it failed", { outcome: "failure", conclusion: "failure" }, false, "failed"],
    ["CLM-OBS-035", "it failed, and continue-on-error hid it", { outcome: "failure", conclusion: "success" }, true, "failed"],
  ] as const)("[%s] the step record had a result with the id CLM-ONE-001, and %s: it is posted, as its result, citing CLM-ONE-001", (_clm, _how, entry, continueOnError, result) => {
    const steps = workflowOf({ ci: { steps: [{ id: "CLM-ONE-001", run: "pnpm lint", "continue-on-error": continueOnError }] } });

    expect(fitnessObservationsOf(steps, recordOf({ "CLM-ONE-001": entry }), NO_SETTING, {}, shellAnswers).map(({ result, cites }) => ({ result, cites }))).toEqual([
      { result, cites: [ONE_001] },
    ]);
  });
});

describe("balance posts what could not run as never ran", () => {
  it.each([
    ["CLM-OBS-053", "was skipped", "skipped"],
    ["CLM-OBS-054", "had a status balance does not know", "neutral"],
  ] as const)("[%s] the step record said a fitness function's step with the id CLM-ONE-001 %s: it is posted as never-ran, citing CLM-ONE-001 and naming that step", (_clm, _what, outcome) => {
    const steps = workflowOf({ ci: { steps: [{ id: "CLM-ONE-001", name: "Lint", run: "pnpm lint" }] } });

    expect(
      fitnessObservationsOf(steps, recordOf({ "CLM-ONE-001": { outcome, conclusion: outcome } }), NO_SETTING, {}, shellAnswers).map(({ result, cites, place }) => ({ result, cites, place })),
    ).toEqual([{ result: "never-ran", cites: [ONE_001], place: "ci.yml:ci:Lint" }]);
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
    const observations = fitnessObservationsOf([], recordOf({ "CLM-ONE-001": { outcome: "skipped", conclusion: "skipped" } }), NO_SETTING, {}, shellAnswers);

    expect(observations).toEqual([{ cites: [ONE_001], result: "never-ran", kind: "fitness", place: "CLM-ONE-001", notes: ["skipped"] }]);
  });

  it("[CLM-OBS-097] a fitness function whose id is not a claim code will be posted once, citing no claim code", () => {
    const steps = workflowOf({ ci: { steps: [{ id: "audit", run: "pnpm audit-the-tree" }] } });
    const observations = fitnessObservationsOf(steps, recordOf({ audit: { outcome: "success", conclusion: "success" } }), NO_SETTING, {}, shellAnswers);

    expect(observations.map(({ kind, cites }) => ({ kind, cites }))).toEqual([{ kind: "fitness", cites: [] }]);
  });

  it("[CLM-OBS-087] the step record had a passing fitness function with no id: it is posted to the unnamed claim, naming no claim code", () => {
    const steps = workflowOf({ ci: { steps: [{ run: "pnpm lint" }] } });

    expect(fitnessObservationsOf(steps, [], NO_SETTING, {}, shellAnswers).map(({ cites }) => cites)).toEqual([[]]);
  });
});

describe("an Evidence Observation says where to look", () => {
  it.each([
    ["CLM-OBS-081", "the step Lint in job build", { build: { steps: [{ id: "CLM-ONE-001", name: "Lint", run: "pnpm lint" }] } }, "ci.yml:build:Lint"],
    ["CLM-OBS-101", "the step with 3 as its name, running pnpm lint, in job build", { build: { steps: [{ id: "CLM-ONE-001", name: 3, run: "pnpm lint" }] } }, "ci.yml:build:pnpm lint"],
    ["CLM-OBS-102", "the step with no name and an empty command, in job build", { build: { steps: [{ id: "CLM-ONE-001", run: "" }] } }, "ci.yml:build:"],
    ["CLM-OBS-103", "the step with no name, running a blank line then pnpm lint, in job build", { build: { steps: [{ id: "CLM-ONE-001", run: "\npnpm lint" }] } }, "ci.yml:build:pnpm lint"],
    ["CLM-OBS-104", "the step Lint in jobs build and test", { build: { steps: [{ id: "CLM-ONE-001", name: "Lint", run: "pnpm lint" }] }, test: { steps: [{ id: "CLM-ONE-001", name: "Lint", run: "pnpm lint" }] } }, "CLM-ONE-001"],
  ] as const)("[%s] the step record had a passing fitness result, %s of ci.yml, citing CLM-ONE-001: it says where to look", (_clm, _step, jobs, place) => {
    const record = recordOf({ "CLM-ONE-001": { outcome: "success", conclusion: "success" } });

    expect(fitnessObservationsOf(workflowOf(jobs), record, NO_SETTING, {}, shellAnswers).map((observation) => observation.place)).toEqual([place]);
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

  it.each(shellVariants["CLM-OBS-010"].variants)("[CLM-OBS-010] a step running vitest after a NAME=value setting, through the launcher %s, will be counted as a runner", (launcher) => {
    const handedOn = launcher.includes("<bin>") ? launcher.replace("<bin>", "vitest") : `${launcher} vitest`;

    expect(dispositionOf(`CI=1 ${handedOn} run`, "vitest")).toBe("runner");
  });

  it("[CLM-OBS-010] launchers chain, so a runner behind two launchers will be counted as a runner", () => {
    expect(dispositionOf("uv run python -m pytest -q", "pytest")).toBe("runner");
  });

  it.each(shellVariants["CLM-OBS-009"].variants)("[CLM-OBS-009] a step running a script as %s, whose script runs vitest, will be counted as a runner", (variant) => {
    const script = variant.includes("<script>") ? "check" : variant.split(" ").at(-1)!;

    expect(dispositionOf(variant.replace("<script>", script).replace("<name>", "app"), "vitest", { [script]: "vitest run" })).toBe("runner");
  });

  it("[CLM-OBS-114] a step running pnpm test, whose script runs another script, whose script runs vitest, will be counted as a runner, and nothing will be posted", () => {
    expect(countedAndPosted("pnpm test", "vitest", { test: "pnpm unit", unit: "vitest run" })).toEqual({ countedAs: "runner", posted: 0 });
  });

  it.each(shellVariants["CLM-OBS-112"].variants)("[CLM-OBS-112] a step running its unit runner behind the wrapper %s, past its options, will be counted as a runner", (wrapper) => {
    expect(dispositionOf(`${wrapper} -a --server-args=-screen vitest run`, "vitest")).toBe("runner");
  });

  it.each(["-n", "-s", "-e", "-f", "-p", "-w"])("[CLM-OBS-112] a step running its unit runner behind xvfb-run, past its option %s and that option's value, will be counted as a runner", (option) => {
    expect(dispositionOf(`xvfb-run ${option} 99 vitest run`, "vitest")).toBe("runner");
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
});
