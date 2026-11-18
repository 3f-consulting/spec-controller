import { describe, expect, it } from "vitest";
import evidenceReconciliationVariants from "./evidenceReconciliation.variants.json" with { type: "json" };
import { featureAsWrittenFrom } from "../inputs/gherkin.js";
import { shellAnswers } from "../inputs/shell.js";
import { workflowStepsFrom } from "../inputs/workflows.js";
import { claimCodeErrorsOf } from "./claimCodes.js";
import { claimReconciliationsOf } from "./claimReconciliation.js";
import { runVerdictOf, stepAccountOf, totalsOf } from "./evidenceReconciliation.js";
import { executableClaimsOf } from "./postEvidenceObligation.js";
import { stepDispositionOf, type EvidenceObservation, type Result, type RecordedStep } from "./postEvidenceObservation.js";

// Evidence as a row gives it: its kind, its result, and the code it cites, such as ONE-001, if any.
type Observed = readonly [EvidenceObservation["kind"], Result, string?];

const observationOf = ([kind, result, code]: Observed): EvidenceObservation => ({
  cites: code === undefined ? [] : [{ featureCode: code.split("-")[0]!, number: code.split("-")[1]! }],
  result,
  kind,
  place: "one.test.ts",
  name: "a test",
});

// one.feature, its feature code ONE, with a scenario under each set of tags given, exactly as given.
const scenariosTagged = (...scenarioTags: readonly string[]): string =>
  `@ONE\nFeature: one\n${scenarioTags.map((tags, at) => `\n  ${tags}\n  Scenario: scenario ${at}\n    Given a step\n`).join("")}`;

// The run verdict of the corpus and evidence given, read and reconciled as balance does. Each entry of the corpus is the
// tags of one.feature's scenario, beside its unit tag, or a whole feature file.
function runVerdictOfRun(corpus: readonly string[], observed: readonly Observed[]): ReturnType<typeof runVerdictOf> {
  const features = corpus.map((entry, at) => featureAsWrittenFrom(`f${at}.feature`, entry.includes("Feature:") ? entry : scenariosTagged(`@unit ${entry}`)));
  const claimReconciliations = claimReconciliationsOf(executableClaimsOf(features, { deferralTags: [], strict: false }), observed.map(observationOf));
  return runVerdictOf(claimReconciliations, claimCodeErrorsOf(features));
}

describe("the run will be balanced or out of balance, as its Claim Reconciliations call for", () => {
  it.each([
    ["CLM-EVR-001", "only balanced Claim Reconciliations", ["@CLM-ONE-001"], [["unit", "passed", "ONE-001"]], "balanced"],
    [
      "CLM-EVR-002",
      "a Claim Reconciliation out of balance, beside a balanced one",
      ["@ONE\nFeature: one\n\n  @unit @CLM-ONE-001\n  Scenario: adds\n    Given a step\n\n  @unit @CLM-ONE-002\n  Scenario: subtracts\n    Given a step\n"],
      [
        ["unit", "failed", "ONE-001"],
        ["unit", "passed", "ONE-002"],
      ],
      "out-of-balance",
    ],
    ["CLM-EVR-003", "no feature corpus, and Evidence Observations citing no claim code", [], [["unit", "passed"]], "out-of-balance"],
  ] as const)("[%s] a run with %s has its run verdict", (_clm, _what, corpus, evidence, verdict) => {
    expect(runVerdictOfRun(corpus, evidence)).toEqual({ verdict });
  });
});

describe("the run will be not reconciled, naming why", () => {
  it.each([
    ["CLM-EVR-004", "an Evidence Observation that never ran", ["@CLM-ONE-001"], [["unit", "never-ran", "ONE-001"]], "unsound"],
    ["CLM-EVR-005", "a claim code error, and only balanced Claim Reconciliations", ["@CLM-TWO-001"], [["unit", "passed", "TWO-001"]], "claim-code-errors"],
    ["CLM-EVR-008", "a feature corpus with no scenario, and no Evidence Observation", ["@ONE\nFeature: one\n"], [], "nothing-to-reconcile"],
  ] as const)("[%s] a run with %s is not reconciled, naming why", (_clm, _what, corpus, evidence, why) => {
    expect(runVerdictOfRun(corpus, evidence)).toEqual({ verdict: "not-reconciled", why });
  });
});

describe("when several reasons apply, the run verdict follows a fixed order among them", () => {
  it.each([
    ["CLM-EVR-009", "evidence that never ran and a claim out of balance", ["@CLM-ONE-001"], [["unit", "never-ran", "ONE-009"]], "unsound"],
    ["CLM-EVR-010", "evidence that never ran and a claim code error", ["@CLM-TWO-001"], [["unit", "never-ran", "TWO-001"]], "unsound"],
    ["CLM-EVR-011", "a claim code error and a claim out of balance", ["@CLM-TWO-001"], [["unit", "failed", "TWO-001"]], "claim-code-errors"],
    ["CLM-EVR-012", "a corpus whose only scenario is tagged with two codes", ["@CLM-ONE-001 @CLM-ONE-002"], [], "claim-code-errors"],
  ] as const)("[%s] a run with %s is not reconciled, naming the first reason", (_clm, _what, corpus, evidence, why) => {
    expect(runVerdictOfRun(corpus, evidence)).toEqual({ verdict: "not-reconciled", why });
  });
});

// The totals of the corpus and evidence given, read and reconciled as balance does.
function totalsOfRun(corpus: readonly string[], observed: readonly Observed[]): ReturnType<typeof totalsOf> {
  const features = corpus.map((source, at) => featureAsWrittenFrom(`f${at}.feature`, source));
  return totalsOf(claimReconciliationsOf(executableClaimsOf(features, { deferralTags: [], strict: false }), observed.map(observationOf)), features);
}

describe("Total of the Claim Reconciliations", () => {
  it.each([
    [
      "CLM-EVR-015",
      "a claim with a passing unit test, and one with a failing unit test",
      [["@unit @CLM-ONE-001", "@unit @CLM-ONE-002"]],
      [["unit", "passed", "ONE-001"], ["unit", "failed", "ONE-002"]],
      { total: 2, balanced: 1, outOfBalance: 1 },
    ],
    ["CLM-EVR-016", "a unit test citing no code", [], [["unit", "passed"]], { total: 1, balanced: 0, outOfBalance: 1 }],
  ] as const)("[%s] a run with %s has its Claim Reconciliations counted", (_clm, _what, corpus, evidence, counted) => {
    expect(totalsOfRun(corpus.map((tags) => scenariosTagged(...tags)), evidence).claimReconciliations).toEqual(counted);
  });
});

describe("Total of the Quality Check Reconciliations, by kind of quality check and outcome", () => {
  it.each([
    ["CLM-EVR-017", "a claim with a unit Evidence Obligation, and a passing unit test", ["@unit @CLM-ONE-001"], [["unit", "passed", "ONE-001"]], "unit", { obligations: 1, observations: 1, outcomes: { satisfied: 1 } }],
    [
      "CLM-EVR-054",
      "a claim with a unit Evidence Obligation, and two passing unit tests",
      ["@unit @CLM-ONE-001"],
      [["unit", "passed", "ONE-001"], ["unit", "passed", "ONE-001"]],
      "unit",
      { obligations: 1, observations: 2, outcomes: { satisfied: 2 } },
    ],
    ["CLM-EVR-055", "a claim with an integration Evidence Obligation, and no integration test", ["@integration @CLM-ONE-001"], [], "integration", { obligations: 1, observations: 0, outcomes: { missing: 1 } }],
    [
      "CLM-EVR-056",
      "a claim with a unit Evidence Obligation, and a unit test that never ran",
      ["@unit @CLM-ONE-001"],
      [["unit", "never-ran", "ONE-001"]],
      "unit",
      { obligations: 1, observations: 1, outcomes: { missing: 1, "never-ran": 1 } },
    ],
    ["CLM-EVR-062", "a passing unit test citing no code", [], [["unit", "passed"]], "unit", { obligations: 0, observations: 1, outcomes: { "cites-no-claim": 1 } }],
    ["CLM-EVR-063", "a scenario with a code and no kind-of-quality-check tag", ["@CLM-ONE-001"], [], "no kind", { obligations: 0, observations: 0, outcomes: { "no-quality-check": 1 } }],
  ] as const)("[%s] a run with %s has its counts for that kind", (_clm, _what, scenarios, observed, kind, counts) => {
    const { byKind, noKind } = totalsOfRun(scenarios.length === 0 ? [] : [scenariosTagged(...scenarios)], observed).qualityCheckReconciliations;
    const row = kind === "no kind" ? noKind : byKind.find((counted) => counted.kind === kind)!;

    expect({
      obligations: row.evidenceObligations,
      observations: row.evidenceObservations,
      outcomes: Object.fromEntries(Object.entries(row.byOutcome).filter(([, count]) => count > 0)),
    }).toEqual(counts);
  });
});

describe("Total of every kind", () => {
  it("[CLM-EVR-065] a run with a claim with a unit Evidence Obligation and its passing test, and a scenario with a code and no kind-of-quality-check tag, has the totals for all kinds", () => {
    const { all } = totalsOfRun([scenariosTagged("@unit @CLM-ONE-001", "@CLM-ONE-002")], [["unit", "passed", "ONE-001"]]).qualityCheckReconciliations;

    expect({
      obligations: all.evidenceObligations,
      observations: all.evidenceObservations,
      outcomes: Object.fromEntries(Object.entries(all.byOutcome).filter(([, count]) => count > 0)),
    }).toEqual({ obligations: 1, observations: 1, outcomes: { satisfied: 1, "no-quality-check": 1 } });
  });
});

describe("Total of the Evidence Observations, by where they were filed", () => {
  const filed = (onExecutableClaim: number, onPhantomClaim: number, onUnnamedClaim: number) => ({ total: onExecutableClaim + onPhantomClaim + onUnnamedClaim, onExecutableClaim, onPhantomClaim, onUnnamedClaim });

  it.each([
    ["CLM-EVR-066", "a claim with a unit Evidence Obligation, and a passing unit test citing it", ["@unit @CLM-ONE-001"], [["unit", "passed", "ONE-001"]], [1, 0, 0]],
    ["CLM-EVR-067", "a passing unit test citing no code", [], [["unit", "passed"]], [0, 0, 1]],
    ["CLM-EVR-068", "a passing unit test citing a code no claim has", [], [["unit", "passed", "TWO-001"]], [0, 1, 0]],
    ["CLM-EVR-069", "a unit test citing a code no claim has, which never ran", [], [["unit", "never-ran", "TWO-001"]], [0, 1, 0]],
    ["CLM-EVR-076", "a claim with a unit Evidence Obligation, and no test citing it", ["@unit @CLM-ONE-001"], [], [0, 0, 0]],
  ] as const)("[%s] a run with %s has its Evidence Observations counted where they were filed", (_clm, _what, scenarios, observed, [executable, phantom, unnamed]) => {
    const totals = totalsOfRun(scenarios.length === 0 ? [] : [scenariosTagged(...scenarios)], observed);

    expect(totals.evidenceObservations).toEqual(filed(executable, phantom, unnamed));
  });
});

describe("Total of the out-of-balance Claim Reconciliations, by feature file", () => {
  it.each([
    [
      "CLM-EVR-023",
      "tagged @CLM-ONE-001, in one.feature tagged @ONE, beside a balanced claim",
      "one.feature",
      "@ONE\nFeature: one\n\n  @unit @CLM-ONE-001\n  Scenario: s\n    Given a step\n\n  @unit @CLM-ONE-002\n  Scenario: t\n    Given a step\n",
      [["unit", "passed", "ONE-002"]],
      [{ file: "one.feature", count: 1 }],
    ],
    ["CLM-EVR-024", "a scenario with no code, in one.feature tagged @ONE", "one.feature", "@ONE\nFeature: one\n\n  @unit\n  Scenario: s\n    Given a step\n", [], [{ file: "one.feature", count: 1 }]],
    ["CLM-EVR-025", "a scenario with no code, in three.feature, which has no feature code", "three.feature", "Feature: three\n\n  @unit\n  Scenario: s\n    Given a step\n", [], [{ file: "three.feature", count: 1 }]],
    ["CLM-EVR-026", "the unnamed claim", "none", "", [["unit", "passed"]], []],
  ] as const)("[%s] a Claim Reconciliation out of balance, for %s, is counted under its feature file", (_clm, _claim, file, source, observed, byFeature) => {
    const features = source === "" ? [] : [featureAsWrittenFrom(file, source)];
    const totals = totalsOf(claimReconciliationsOf(executableClaimsOf(features, { deferralTags: [], strict: false }), observed.map(observationOf)), features);

    expect({ outOfBalance: totals.claimReconciliations.outOfBalance, byFeature: totals.outOfBalanceByFeature }).toEqual({ outOfBalance: 1, byFeature });
  });
});

describe("Total of the excluded claim code occurrences", () => {
  it.each([
    ["CLM-EVR-027", "a scenario's tag", "@ONE\nFeature: one\n\n  @unit @CLM-ONE-001\n  Scenario: adds one\n    Given a step\n", 0],
    ["CLM-EVR-028", "a word in a scenario's title", "@ONE\nFeature: one\n\n  @unit\n  Scenario: adds one, as @CLM-ONE-001 says\n    Given a step\n", 1],
    ["CLM-EVR-029", "a word in a comment", "@ONE\nFeature: one\n\n  # as @CLM-ONE-001 says\n  @unit\n  Scenario: adds one\n    Given a step\n", 1],
    ["CLM-EVR-030", "a scenario's tag, and again in a comment", "@ONE\nFeature: one\n\n  # as @CLM-ONE-001 says\n  @unit @CLM-ONE-001\n  Scenario: adds one\n    Given a step\n", 1],
    [
      "CLM-EVR-031",
      "a cell of a clm column",
      "@ONE\nFeature: one\n\n  @unit\n  Scenario Outline: adds <x>\n    Given <x>\n\n    Examples:\n      | clm         | x   |\n      | CLM-ONE-001 | one |\n",
      0,
    ],
    [
      "CLM-EVR-070",
      "a word with a comma after it, in an Examples cell",
      "@ONE\nFeature: one\n\n  @unit\n  Scenario Outline: adds <x>\n    Given <x>\n\n    Examples:\n      | x                 |\n      | @CLM-ONE-001, one |\n",
      1,
    ],
  ] as const)("[%s] a feature file with the claim code CLM-ONE-001 as %s has its excluded claim code occurrences counted", (_clm, _written, source, excluded) => {
    expect(totalsOf([], [featureAsWrittenFrom("one.feature", source)]).excludedClaimCodeOccurrences).toBe(excluded);
  });
});

describe("a claim code in a scenario's title, with punctuation stuck to its end, is an excluded claim code occurrence", () => {
  it.each(evidenceReconciliationVariants["CLM-EVR-028"].variants)("[CLM-EVR-028] a feature file with the claim code CLM-ONE-001%s as a word in a scenario's title has one excluded claim code occurrence", (punctuation) => {
    const source = `@ONE\nFeature: one\n\n  @unit\n  Scenario: adds one, as @CLM-ONE-001${punctuation} says\n    Given a step\n`;

    expect(totalsOf([], [featureAsWrittenFrom("one.feature", source)]).excludedClaimCodeOccurrences).toBe(1);
  });
});

describe("balance accounts for every step it reads", () => {
  // Steps disposed of under a configuration whose one non-check is the Install step of the job given.
  const disposed = (steps: ReturnType<typeof workflowStepsFrom>, install: { readonly workflow: string; readonly job: string }, runners: Readonly<Record<string, string>> = {}, record: readonly RecordedStep[] = []) =>
    steps.map((step) => ({ step, disposition: stepDispositionOf(step, { runners, nonChecks: [{ ...install, step: "Install" }], deferralTags: [] }, {}, shellAnswers, record) }));
  const BUILD = [{ uses: "actions/checkout@v4" }, { run: "pnpm lint" }, { run: "spec-controller balance" }];
  const INSTALL = [{ name: "Install", run: "pnpm install" }, { run: "pnpm audit-the-tree" }];
  const twoJobs = () => disposed(workflowStepsFrom("ci.yml", JSON.stringify({ jobs: { build: { steps: BUILD }, test: { steps: INSTALL } } })), { workflow: "ci.yml", job: "test" });

  // A Vitest step whose id is a claim code the step record does not hold, which runs a runner and is counted as one.
  const UNIT = { id: "CLM-ONE-001", run: "vitest run" };

  it.each([
    ["in one workflow, with no step record", ["ci.yml", "ci.yml"], ["build", "test"], []],
    ["of one name, in two workflows, with a step record of another step", ["ci.yml", "nightly.yml"], ["build", "build"], [{ key: "lint", result: "passed" }]],
  ] as const)("[CLM-EVR-032] two jobs %s will each have counts that add up to the steps read in it", (_jobs, [first, second], [build, test], record) => {
    const steps = [...workflowStepsFrom(first, JSON.stringify({ jobs: { [build]: { steps: [...BUILD, UNIT] } } })), ...workflowStepsFrom(second, JSON.stringify({ jobs: { [test]: { steps: INSTALL } } }))];
    const { jobs } = stepAccountOf(disposed(steps, { workflow: second, job: test }, { unit: "vitest" }, record));

    expect(jobs.map(({ workflow: _workflow, job: _job, ...counts }) => counts)).toEqual([
      { stepsRead: 4, runners: 1, reconcilerSteps: 1, nonChecks: 0, plumbing: 1, fitnessFunctions: 1 },
      { stepsRead: 2, runners: 0, reconcilerSteps: 0, nonChecks: 1, plumbing: 0, fitnessFunctions: 1 },
    ]);
  });

  it("[CLM-EVR-033] the total will be the sum of the jobs", () => {
    const { total } = stepAccountOf(twoJobs());

    expect(total).toEqual({ stepsRead: 5, runners: 0, reconcilerSteps: 1, nonChecks: 1, plumbing: 1, fitnessFunctions: 2 });
  });

  it("[CLM-EVR-072] a workflow with a job that calls a reusable workflow, and a job with one step, has the one step counted", () => {
    const steps = workflowStepsFrom("ci.yml", JSON.stringify({ jobs: { call: { uses: "./.github/workflows/other.yml" }, build: { steps: [{ run: "pnpm lint" }] } } }));
    const { jobs } = stepAccountOf(steps.map((step) => ({ step, disposition: stepDispositionOf(step, { runners: {}, nonChecks: [], deferralTags: [] }, {}, shellAnswers) })));

    expect(jobs.map(({ job, stepsRead }) => ({ job, stepsRead }))).toEqual([{ job: "build", stepsRead: 1 }]);
  });

  it("[CLM-EVR-073] a workflow whose every line is commented out has no steps counted", () => {
    const steps = workflowStepsFrom("ci.yml", "# on: push\n# jobs:\n#   build:\n#     steps:\n#       - run: pnpm lint\n");
    const { jobs, total } = stepAccountOf(steps.map((step) => ({ step, disposition: stepDispositionOf(step, { runners: {}, nonChecks: [], deferralTags: [] }, {}, shellAnswers) })));

    expect({ jobs, stepsRead: total.stepsRead }).toEqual({ jobs: [], stepsRead: 0 });
  });
});
