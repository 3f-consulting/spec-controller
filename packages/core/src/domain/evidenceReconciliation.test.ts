import { describe, expect, it } from "vitest";
import evidenceReconciliationVariants from "./evidenceReconciliation.variants.json" with { type: "json" };
import { featureAsWrittenFrom } from "../inputs/gherkin.js";
import { shellAnswers } from "../inputs/shell.js";
import { workflowStepsFrom } from "../inputs/workflows.js";
import { claimCodeErrorsOf } from "./claimCodes.js";
import { claimReconciliationsOf } from "./claimReconciliation.js";
import { runVerdictOf, stepAccountOf, totalsOf } from "./evidenceReconciliation.js";
import { executableClaimsOf } from "./postEvidenceObligation.js";
import { stepDispositionOf, type EvidenceObservation, type Result } from "./postEvidenceObservation.js";

// Evidence as a row gives it: its kind, its result, and the code it cites, such as ONE-001, if any.
type Observed = readonly [EvidenceObservation["kind"], Result, string?];

const observationOf = ([kind, result, code]: Observed): EvidenceObservation => ({
  cites: code === undefined ? [] : [{ featureCode: code.split("-")[0]!, number: code.split("-")[1]! }],
  result,
  kind,
  place: "one.test.ts",
  name: "a test",
  notes: [],
});

// one.feature, its feature code ONE, with one scenario asking for a unit test under the tags given.
const oneFeature = (tags: string): string => `@ONE\nFeature: one\n\n  @unit ${tags}\n  Scenario: a scenario\n    Given a step\n`;

// The run verdict of the corpus and evidence given, read and reconciled as balance does. Each entry of the corpus is the
// tags of one.feature's scenario, or a whole feature file.
function runVerdictOfRun(corpus: readonly string[], observed: readonly Observed[]): ReturnType<typeof runVerdictOf> {
  const features = corpus.map((entry, at) => featureAsWrittenFrom(`f${at}.feature`, entry.includes("Feature:") ? entry : oneFeature(entry)));
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
  ] as const)("[%s] a run that had %s will have its run verdict", (_clm, _what, corpus, evidence, verdict) => {
    expect(runVerdictOfRun(corpus, evidence)).toEqual({ verdict });
  });
});

describe("the run will be not reconciled, naming why", () => {
  it.each([
    ["CLM-EVR-004", "an Evidence Observation that never ran", ["@CLM-ONE-001"], [["unit", "never-ran", "ONE-001"]], "unsound"],
    ["CLM-EVR-005", "a claim code error, and only balanced Claim Reconciliations", ["@CLM-TWO-001"], [["unit", "passed", "TWO-001"]], "claim-code-errors"],
  ] as const)("[%s] a run that had %s will be not reconciled, naming why", (_clm, _what, corpus, evidence, why) => {
    expect(runVerdictOfRun(corpus, evidence)).toEqual({ verdict: "not-reconciled", why });
  });

  // The corpus each variant stands for, as balance reads it: a folder that is missing or empty gives no feature file.
  const NOTHING: Readonly<Record<string, readonly string[]>> = {
    "no corpus folder": [],
    "an empty corpus folder": [],
    "a corpus with no scenario": ["@ONE\nFeature: one\n"],
  };

  it.each(evidenceReconciliationVariants["CLM-EVR-006"].variants)("[CLM-EVR-006] a run that had %s, and no Evidence Observation, will be not reconciled, because nothing to reconcile", (variant) => {
    const corpus = NOTHING[variant];
    if (corpus === undefined) throw new Error(`no corpus for the variant ${variant}`);

    expect(runVerdictOfRun(corpus, [])).toEqual({ verdict: "not-reconciled", why: "nothing-to-reconcile" });
  });
});

describe("unsound comes before claim code errors, then nothing to reconcile, all before out of balance", () => {
  it.each([
    ["CLM-EVR-009", "an Evidence Observation that never ran and a Claim Reconciliation out of balance", ["@CLM-ONE-001"], [["unit", "never-ran", "ONE-009"]], "unsound"],
    ["CLM-EVR-010", "an Evidence Observation that never ran and a claim code error", ["@CLM-TWO-001"], [["unit", "never-ran", "TWO-001"]], "unsound"],
    ["CLM-EVR-011", "a claim code error and a Claim Reconciliation out of balance", ["@CLM-TWO-001"], [["unit", "failed", "TWO-001"]], "claim-code-errors"],
    ["CLM-EVR-012", "a corpus whose only scenario is tagged with two codes, and no Evidence Observation", ["@CLM-ONE-001 @CLM-ONE-002"], [], "claim-code-errors"],
  ] as const)("[%s] a run that had %s will be not reconciled, naming the first reason", (_clm, _what, corpus, evidence, why) => {
    expect(runVerdictOfRun(corpus, evidence)).toEqual({ verdict: "not-reconciled", why });
  });
});

// one.feature, its feature code ONE, with a scenario asking for a unit test under each set of tags given.
const featureWith = (...scenarioTags: readonly string[]): string =>
  `@ONE\nFeature: one\n${scenarioTags.map((tags, at) => `\n  @unit ${tags}\n  Scenario: scenario ${at}\n    Given a step\n`).join("")}`;

// The totals of the corpus and evidence given, read and reconciled as balance does.
function totalsOfRun(corpus: readonly string[], observed: readonly Observed[]): ReturnType<typeof totalsOf> {
  const features = corpus.map((source, at) => featureAsWrittenFrom(`f${at}.feature`, source));
  return totalsOf(claimReconciliationsOf(executableClaimsOf(features, { deferralTags: [], strict: false }), observed.map(observationOf)), features);
}

describe("Total of the Claim Reconciliations", () => {
  it.each([
    [
      "CLM-EVR-015",
      "a claim with a unit Evidence Obligation and a passing unit test citing it, and one with a failing one",
      [["@CLM-ONE-001", "@CLM-ONE-002"]],
      [["unit", "passed", "ONE-001"], ["unit", "failed", "ONE-002"]],
      { total: 2, balanced: 1, outOfBalance: 1 },
    ],
    ["CLM-EVR-016", "a unit test citing no code", [], [["unit", "passed"]], { total: 1, balanced: 0, outOfBalance: 1 }],
  ] as const)("[%s] a run that had %s will have its Claim Reconciliations totalled", (_clm, _what, corpus, evidence, counted) => {
    expect(totalsOfRun(corpus.map((tags) => featureWith(...tags)), evidence).claimReconciliations).toEqual(counted);
  });
});

// one.feature, its feature code ONE, with a scenario under each set of tags given, exactly as given.
const scenariosTagged = (...scenarioTags: readonly string[]): string =>
  `@ONE\nFeature: one\n${scenarioTags.map((tags, at) => `\n  ${tags}\n  Scenario: scenario ${at}\n    Given a step\n`).join("")}`;

describe("Total of the Quality Check Reconciliations, by kind of quality check and outcome", () => {
  it.each([
    ["CLM-EVR-017", "a claim with a unit Evidence Obligation, and a passing unit test citing it", ["@unit @CLM-ONE-001"], [["unit", "passed", "ONE-001"]], "unit", { obligations: 1, observations: 1, outcomes: { satisfied: 1 } }],
    [
      "CLM-EVR-054",
      "a claim with a unit Evidence Obligation, and two passing unit tests citing it",
      ["@unit @CLM-ONE-001"],
      [["unit", "passed", "ONE-001"], ["unit", "passed", "ONE-001"]],
      "unit",
      { obligations: 1, observations: 2, outcomes: { satisfied: 2 } },
    ],
    ["CLM-EVR-055", "a claim with an integration Evidence Obligation, and no integration test citing it", ["@integration @CLM-ONE-001"], [], "integration", { obligations: 1, observations: 0, outcomes: { missing: 1 } }],
    [
      "CLM-EVR-056",
      "a claim with a unit Evidence Obligation, and a unit test citing it that never ran",
      ["@unit @CLM-ONE-001"],
      [["unit", "never-ran", "ONE-001"]],
      "unit",
      { obligations: 1, observations: 1, outcomes: { missing: 1, "never-ran": 1 } },
    ],
    ["CLM-EVR-062", "a passing unit test citing no code", [], [["unit", "passed"]], "unit", { obligations: 0, observations: 1, outcomes: { "cites-no-claim": 1 } }],
    ["CLM-EVR-063", "a scenario with a code and no kind-of-check tag", ["@CLM-ONE-001"], [], "no kind", { obligations: 0, observations: 0, outcomes: { "no-quality-check": 1 } }],
  ] as const)("[%s] a run that had %s will have its totals for that kind", (_clm, _what, scenarios, observed, kind, counts) => {
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
  it("[CLM-EVR-065] a run that had a claim with a unit Evidence Obligation and a passing unit test citing it, and a scenario with a code and no kind-of-check tag, will have, for all kinds, 1 Evidence Obligation, 1 Evidence Observation, 1 satisfied and 1 no-quality-check", () => {
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
  ] as const)("[%s] a run that had %s will have its Evidence Observations totalled by where they were filed", (_clm, _what, scenarios, observed, [executable, phantom, unnamed]) => {
    const totals = totalsOfRun(scenarios.length === 0 ? [] : [scenariosTagged(...scenarios)], observed);

    expect(totals.evidenceObservations).toEqual(filed(executable, phantom, unnamed));
  });

  // The result of the observation each variant stands for.
  const PHANTOM: Readonly<Record<string, Result>> = { passed: "passed", "never ran": "never-ran" };

  it.each(evidenceReconciliationVariants["CLM-EVR-068"].variants)("[CLM-EVR-068] a run that had a unit test citing a code no claim has, which %s, will have 1 Evidence Observation, 1 on a phantom claim", (variant) => {
    const result = PHANTOM[variant];
    if (result === undefined) throw new Error(`no result for the variant ${variant}`);

    expect(totalsOfRun([], [["unit", result, "TWO-001"]]).evidenceObservations).toEqual(filed(0, 1, 0));
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
  ] as const)("[%s] a claim out of balance %s is counted by its feature", (_clm, _claim, file, source, observed, byFeature) => {
    const features = source === "" ? [] : [featureAsWrittenFrom(file, source)];
    const totals = totalsOf(claimReconciliationsOf(executableClaimsOf(features, { deferralTags: [], strict: false }), observed.map(observationOf)), features);

    expect({ outOfBalance: totals.claimReconciliations.outOfBalance, byFeature: totals.outOfBalanceByFeature }).toEqual({ outOfBalance: 1, byFeature });
  });
});

describe("Total of the excluded claim code occurrences", () => {
  it.each([
    ["CLM-EVR-027", "a scenario's tag", "@ONE\nFeature: one\n\n  @unit @CLM-ONE-001\n  Scenario: adds one\n    Given a step\n", 0],
    ["CLM-EVR-028", "a word in a scenario's title", "@ONE\nFeature: one\n\n  @unit\n  Scenario: adds one, as @CLM-ONE-001 says\n    Given a step\n", 1],
    ["CLM-EVR-030", "a scenario's tag, and again in a comment", "@ONE\nFeature: one\n\n  # as @CLM-ONE-001 says\n  @unit @CLM-ONE-001\n  Scenario: adds one\n    Given a step\n", 1],
    [
      "CLM-EVR-031",
      "a cell of a clm column",
      "@ONE\nFeature: one\n\n  @unit\n  Scenario Outline: adds <x>\n    Given <x>\n\n    Examples:\n      | clm         | x   |\n      | CLM-ONE-001 | one |\n",
      0,
    ],
  ] as const)("[%s] a feature file that had the claim code CLM-ONE-001 as %s will have its excluded claim code occurrences totalled", (_clm, _written, source, excluded) => {
    expect(totalsOf([], [featureAsWrittenFrom("one.feature", source)]).excludedClaimCodeOccurrences).toBe(excluded);
  });

  // The feature file each variant stands for, with @CLM-ONE-001 written there.
  const WRITTEN: Readonly<Record<string, string>> = {
    "in a title": "@ONE\nFeature: one\n\n  @unit\n  Scenario: adds one, as @CLM-ONE-001 says\n    Given a step\n",
    "in a comment": "@ONE\nFeature: one\n\n  # as @CLM-ONE-001 says\n  @unit\n  Scenario: adds one\n    Given a step\n",
    "in an Examples cell outside a clm column": "@ONE\nFeature: one\n\n  @unit\n  Scenario Outline: adds <x>\n    Given <x>\n\n    Examples:\n      | x                 |\n      | @CLM-ONE-001, one |\n",
  };

  it.each(evidenceReconciliationVariants["CLM-EVR-028"].variants)("[CLM-EVR-028] a feature file that had the claim code CLM-ONE-001 written %s will have 1 excluded claim code occurrence", (variant) => {
    const source = WRITTEN[variant];
    if (source === undefined) throw new Error(`no feature file for the variant ${variant}`);

    expect(totalsOf([], [featureAsWrittenFrom("one.feature", source)]).excludedClaimCodeOccurrences).toBe(1);
  });
});

describe("a claim code in a comment, with punctuation stuck to its end, is counted where no claim reads it", () => {
  it.each(evidenceReconciliationVariants["CLM-EVR-029"].variants)("[CLM-EVR-029] a feature file with @CLM-ONE-001%s in a comment has one excluded claim code occurrence", (punctuation) => {
    const source = `@ONE\nFeature: one\n\n  # as @CLM-ONE-001${punctuation} says\n  @unit\n  Scenario: adds one\n    Given a step\n`;

    expect(totalsOf([], [featureAsWrittenFrom("one.feature", source)]).excludedClaimCodeOccurrences).toBe(1);
  });
});

describe("balance accounts for every step it reads", () => {
  // Two jobs, in one workflow or of one name in two: each a row of its own.
  const disposed = (steps: ReturnType<typeof workflowStepsFrom>, install: { readonly workflow: string; readonly job: string }) =>
    steps.map((step) => ({ step, disposition: stepDispositionOf(step, { runners: {}, nonChecks: [{ ...install, step: "Install" }], deferralTags: [] }, {}, shellAnswers) }));
  const BUILD = [{ uses: "actions/checkout@v4" }, { run: "pnpm lint" }, { run: "spec-controller balance" }];
  const INSTALL = [{ name: "Install", run: "pnpm install" }, { run: "pnpm audit-the-tree" }];
  const twoJobs = () => disposed(workflowStepsFrom("ci.yml", JSON.stringify({ jobs: { build: { steps: BUILD }, test: { steps: INSTALL } } })), { workflow: "ci.yml", job: "test" });
  const twoJobsOfOneName = () =>
    disposed(
      [...workflowStepsFrom("ci.yml", JSON.stringify({ jobs: { build: { steps: BUILD } } })), ...workflowStepsFrom("nightly.yml", JSON.stringify({ jobs: { build: { steps: INSTALL } } }))],
      { workflow: "nightly.yml", job: "build" },
    );

  it.each([
    ["in one workflow", twoJobs],
    ["of one name, in two workflows", twoJobsOfOneName],
  ] as const)("[CLM-EVR-032] two jobs %s will each have counts that add up to the steps read in it", (_jobs, read) => {
    const { jobs } = stepAccountOf(read());

    expect(jobs.map(({ stepsRead, runners, reconcilerSteps, nonChecks, plumbing, candidates }) => ({ stepsRead, sum: runners + reconcilerSteps + nonChecks + plumbing + candidates }))).toEqual([
      { stepsRead: 3, sum: 3 },
      { stepsRead: 2, sum: 2 },
    ]);
  });

  it("[CLM-EVR-033] the total will be the sum of the jobs", () => {
    const { total } = stepAccountOf(twoJobs());

    expect(total).toEqual({ stepsRead: 5, runners: 0, reconcilerSteps: 1, nonChecks: 1, plumbing: 1, candidates: 2 });
  });

  it("[CLM-EVR-072] a workflow with a job that calls a reusable workflow, and a job with one step, has the one step read", () => {
    const steps = workflowStepsFrom("ci.yml", JSON.stringify({ jobs: { call: { uses: "./.github/workflows/other.yml" }, build: { steps: [{ run: "pnpm lint" }] } } }));
    const { jobs } = stepAccountOf(steps.map((step) => ({ step, disposition: stepDispositionOf(step, { runners: {}, nonChecks: [], deferralTags: [] }, {}, shellAnswers) })));

    expect(jobs.map(({ job, stepsRead }) => ({ job, stepsRead }))).toEqual([{ job: "build", stepsRead: 1 }]);
  });

  it("[CLM-EVR-073] a workflow whose every line is commented out has no steps read", () => {
    const steps = workflowStepsFrom("ci.yml", "# on: push\n# jobs:\n#   build:\n#     steps:\n#       - run: pnpm lint\n");
    const { jobs, total } = stepAccountOf(steps.map((step) => ({ step, disposition: stepDispositionOf(step, { runners: {}, nonChecks: [], deferralTags: [] }, {}, shellAnswers) })));

    expect({ jobs, stepsRead: total.stepsRead }).toEqual({ jobs: [], stepsRead: 0 });
  });
});
