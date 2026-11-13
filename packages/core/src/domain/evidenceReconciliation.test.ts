import { describe, expect, it } from "vitest";
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
    ["CLM-EVR-002", "a Claim Reconciliation out of balance", ["@CLM-ONE-001"], [["unit", "failed", "ONE-001"]], "out-of-balance"],
    ["CLM-EVR-003", "no corpus, and Evidence Observations citing no claim code", [], [["unit", "passed"]], "out-of-balance"],
  ] as const)("[%s] a run with %s has its run verdict", (_clm, _what, corpus, evidence, verdict) => {
    expect(runVerdictOfRun(corpus, evidence)).toEqual({ verdict });
  });
});

describe("the run will be not reconciled, naming why", () => {
  it.each([
    ["CLM-EVR-004", "an Evidence Observation that never ran", ["@CLM-ONE-001"], [["unit", "never-ran", "ONE-001"]], "unsound"],
    ["CLM-EVR-005", "a claim code error, and only balanced Claim Reconciliations", ["@CLM-TWO-001"], [["unit", "passed", "TWO-001"]], "claim-code-errors"],
    ["CLM-EVR-008", "a corpus with no scenario, and no Evidence Observation", ["@ONE\nFeature: one\n"], [], "nothing-to-reconcile"],
  ] as const)("[%s] a run with %s is not reconciled, naming why", (_clm, _what, corpus, evidence, why) => {
    expect(runVerdictOfRun(corpus, evidence)).toEqual({ verdict: "not-reconciled", why });
  });
});

describe("when several reasons apply, unsound comes first, then claim code errors, then nothing to reconcile, all before out of balance", () => {
  it.each([
    ["CLM-EVR-009", "evidence that never ran and a claim out of balance", ["@CLM-ONE-001"], [["unit", "never-ran", "ONE-009"]], "unsound"],
    ["CLM-EVR-010", "evidence that never ran and a claim code error", ["@CLM-TWO-001"], [["unit", "never-ran", "TWO-001"]], "unsound"],
    ["CLM-EVR-011", "a claim code error and a claim out of balance", ["@CLM-TWO-001"], [["unit", "failed", "TWO-001"]], "claim-code-errors"],
    ["CLM-EVR-012", "a corpus whose only scenario is tagged with two codes", ["@CLM-ONE-001 @CLM-ONE-002"], [], "claim-code-errors"],
  ] as const)("[%s] a run with %s is not reconciled, naming the first reason", (_clm, _what, corpus, evidence, why) => {
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
    ["CLM-EVR-013", "a claim with a passing unit test", [["@CLM-ONE-001"]], [["unit", "passed", "ONE-001"]], { total: 1, balanced: 1, outOfBalance: 0 }],
    ["CLM-EVR-014", "a claim with a failing unit test", [["@CLM-ONE-001"]], [["unit", "failed", "ONE-001"]], { total: 1, balanced: 0, outOfBalance: 1 }],
    [
      "CLM-EVR-015",
      "a claim with a passing unit test, and one with a failing unit test",
      [["@CLM-ONE-001", "@CLM-ONE-002"]],
      [["unit", "passed", "ONE-001"], ["unit", "failed", "ONE-002"]],
      { total: 2, balanced: 1, outOfBalance: 1 },
    ],
    ["CLM-EVR-016", "a unit test citing no code", [], [["unit", "passed"]], { total: 1, balanced: 0, outOfBalance: 1 }],
  ] as const)("[%s] a run with %s has its Claim Reconciliations counted", (_clm, _what, corpus, evidence, counted) => {
    expect(totalsOfRun(corpus.map((tags) => featureWith(...tags)), evidence).claimReconciliations).toEqual(counted);
  });
});

// one.feature, its feature code ONE, with a scenario under each set of tags given, exactly as given.
const scenariosTagged = (...scenarioTags: readonly string[]): string =>
  `@ONE\nFeature: one\n${scenarioTags.map((tags, at) => `\n  ${tags}\n  Scenario: scenario ${at}\n    Given a step\n`).join("")}`;

describe("Total of the Quality Check Reconciliations, by kind of quality check and outcome", () => {
  it.each([
    ["CLM-EVR-017", "a unit claim, and a passing unit test", ["@unit @CLM-ONE-001"], [["unit", "passed", "ONE-001"]], "unit", { obligations: 1, observations: 1, outcomes: { satisfied: 1 } }],
    [
      "CLM-EVR-054",
      "a unit claim, and two passing unit tests",
      ["@unit @CLM-ONE-001"],
      [["unit", "passed", "ONE-001"], ["unit", "passed", "ONE-001"]],
      "unit",
      { obligations: 1, observations: 2, outcomes: { satisfied: 2 } },
    ],
    ["CLM-EVR-018", "a unit claim, and a failing unit test", ["@unit @CLM-ONE-001"], [["unit", "failed", "ONE-001"]], "unit", { obligations: 1, observations: 1, outcomes: { failing: 1 } }],
    ["CLM-EVR-055", "an integration claim, and no integration test", ["@integration @CLM-ONE-001"], [], "integration", { obligations: 1, observations: 0, outcomes: { missing: 1 } }],
    [
      "CLM-EVR-056",
      "a unit claim, and a unit test that never ran",
      ["@unit @CLM-ONE-001"],
      [["unit", "never-ran", "ONE-001"]],
      "unit",
      { obligations: 1, observations: 1, outcomes: { missing: 1, "never-ran": 1 } },
    ],
    [
      "CLM-EVR-057",
      "a unit claim, a passing unit test, and one that never ran",
      ["@unit @CLM-ONE-001"],
      [["unit", "passed", "ONE-001"], ["unit", "never-ran", "ONE-001"]],
      "unit",
      { obligations: 1, observations: 2, outcomes: { satisfied: 1, "never-ran": 1 } },
    ],
    ["CLM-EVR-058", "a fitness claim, and its step passing", ["@fitness @CLM-ONE-001"], [["fitness", "passed", "ONE-001"]], "fitness", { obligations: 1, observations: 1, outcomes: { satisfied: 1 } }],
    [
      "CLM-EVR-059",
      "a fitness claim, and its step passing where its failure is allowed",
      ["@fitness @CLM-ONE-001"],
      [["fitness", "passed-on-error", "ONE-001"]],
      "fitness",
      { obligations: 1, observations: 1, outcomes: { "cannot-fail": 1 } },
    ],
    [
      "CLM-EVR-060",
      "a fitness claim, and its step skipped",
      ["@fitness @CLM-ONE-001"],
      [["fitness", "never-ran", "ONE-001"]],
      "fitness",
      { obligations: 1, observations: 1, outcomes: { missing: 1, "never-ran": 1 } },
    ],
    ["CLM-EVR-061", "a fitness claim, and no step for it", ["@fitness @CLM-ONE-001"], [], "fitness", { obligations: 1, observations: 0, outcomes: { missing: 1 } }],
    ["CLM-EVR-019", "a scenario with no code, asking for a unit test", ["@unit"], [], "unit", { obligations: 1, observations: 0, outcomes: { "no-claim-code": 1 } }],
    [
      "CLM-EVR-020",
      "two scenarios sharing a code, each asking for a unit test",
      ["@unit @CLM-ONE-001", "@unit @CLM-ONE-001"],
      [],
      "unit",
      { obligations: 2, observations: 0, outcomes: { "duplicate-claim-code": 2 } },
    ],
    [
      "CLM-EVR-021",
      "an e2e claim, and a passing unit test citing it",
      ["@e2e @CLM-ONE-001"],
      [["unit", "passed", "ONE-001"]],
      "unit",
      { obligations: 0, observations: 1, outcomes: { "not-asked-for": 1 } },
    ],
    ["CLM-EVR-022", "a passing fitness function citing a code no claim has", [], [["fitness", "passed", "TWO-001"]], "fitness", { obligations: 0, observations: 1, outcomes: { "cites-unknown-claim": 1 } }],
    ["CLM-EVR-062", "a passing unit test citing no code", [], [["unit", "passed"]], "unit", { obligations: 0, observations: 1, outcomes: { "cites-no-claim": 1 } }],
    ["CLM-EVR-063", "a scenario with a code and no kind-of-check tag", ["@CLM-ONE-001"], [], "no kind", { obligations: 0, observations: 0, outcomes: { "no-quality-check": 1 } }],
    ["CLM-EVR-064", "a scenario with no code and no kind-of-check tag", ["@other"], [], "no kind", { obligations: 0, observations: 0, outcomes: { "no-claim-code": 1 } }],
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

describe("Total of every kind, as the All row", () => {
  it("[CLM-EVR-065] a run with a unit claim and its passing test, and a scenario with a code and no kind-of-check tag, totals every kind on the All row", () => {
    const { all } = totalsOfRun([scenariosTagged("@unit @CLM-ONE-001", "@CLM-ONE-002")], [["unit", "passed", "ONE-001"]]).qualityCheckReconciliations;

    expect({
      obligations: all.evidenceObligations,
      observations: all.evidenceObservations,
      outcomes: Object.fromEntries(Object.entries(all.byOutcome).filter(([, count]) => count > 0)),
    }).toEqual({ obligations: 1, observations: 1, outcomes: { satisfied: 1, "no-quality-check": 1 } });
  });
});

describe("Total of the Evidence Observations, by where they were filed", () => {
  const filed = (onExecutableClaim: number, onPhantomClaim: number, onUnnamedClaim: number) => ({ total: 1, onExecutableClaim, onPhantomClaim, onUnnamedClaim });

  it.each([
    ["CLM-EVR-066", "a unit claim, and a passing unit test citing it", ["@unit @CLM-ONE-001"], [["unit", "passed", "ONE-001"]], [1, 0, 0]],
    ["CLM-EVR-067", "a passing unit test citing no code", [], [["unit", "passed"]], [0, 0, 1]],
    ["CLM-EVR-068", "a passing unit test citing a code no claim has", [], [["unit", "passed", "TWO-001"]], [0, 1, 0]],
    ["CLM-EVR-069", "a unit test citing a code no claim has, which never ran", [], [["unit", "never-ran", "TWO-001"]], [0, 1, 0]],
  ] as const)("[%s] a run with %s has its Evidence Observations counted where they were filed", (_clm, _what, scenarios, observed, [executable, phantom, unnamed]) => {
    const totals = totalsOfRun(scenarios.length === 0 ? [] : [scenariosTagged(...scenarios)], observed);

    expect(totals.evidenceObservations).toEqual(filed(executable, phantom, unnamed));
  });
});

describe("Total of the out-of-balance Claim Reconciliations, by feature", () => {
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
    ["CLM-EVR-026", "the unnamed claim", "none", "", [["unit", "passed"]], undefined],
  ] as const)("[%s] a claim out of balance %s is counted by its feature", (_clm, _claim, file, source, observed, byFeature) => {
    const features = source === "" ? [] : [featureAsWrittenFrom(file, source)];
    const totals = totalsOf(claimReconciliationsOf(executableClaimsOf(features, { deferralTags: [], strict: false }), observed.map(observationOf)), features);

    expect({ outOfBalance: totals.claimReconciliations.outOfBalance, byFeature: totals.outOfBalanceByFeature }).toEqual({ outOfBalance: 1, byFeature });
  });
});

describe("Total of the claim codes written where no claim reads them", () => {
  it.each([
    ["CLM-EVR-027", "@CLM-ONE-001 as a scenario's tag", "@ONE\nFeature: one\n\n  @unit @CLM-ONE-001\n  Scenario: adds one\n    Given a step\n", 0],
    ["CLM-EVR-028", "@CLM-ONE-001 in a scenario's title", "@ONE\nFeature: one\n\n  @unit\n  Scenario: adds one, as @CLM-ONE-001 says\n    Given a step\n", 1],
    ["CLM-EVR-029", "@CLM-ONE-001 in a comment", "@ONE\nFeature: one\n\n  # as @CLM-ONE-001 says\n  @unit\n  Scenario: adds one\n    Given a step\n", 1],
    ["CLM-EVR-030", "@CLM-ONE-001 as a tag and again in a comment", "@ONE\nFeature: one\n\n  # as @CLM-ONE-001 says\n  @unit @CLM-ONE-001\n  Scenario: adds one\n    Given a step\n", 1],
    [
      "CLM-EVR-031",
      "CLM-ONE-001 in a clm column",
      "@ONE\nFeature: one\n\n  @unit\n  Scenario Outline: adds <x>\n    Given <x>\n\n    Examples:\n      | clm         | x   |\n      | CLM-ONE-001 | one |\n",
      0,
    ],
    [
      "CLM-EVR-070",
      "@CLM-ONE-001, with a comma, in an Examples cell",
      "@ONE\nFeature: one\n\n  @unit\n  Scenario Outline: adds <x>\n    Given <x>\n\n    Examples:\n      | x                 |\n      | @CLM-ONE-001, one |\n",
      1,
    ],
  ] as const)("[%s] a feature file with %s has its excluded claim code occurrences counted", (_clm, _written, source, excluded) => {
    expect(totalsOf([], [featureAsWrittenFrom("one.feature", source)]).excludedClaimCodeOccurrences).toBe(excluded);
  });
});

describe("balance accounts for every step it reads", () => {
  const twoJobs = () =>
    workflowStepsFrom(
      "ci.yml",
      JSON.stringify({
        jobs: {
          build: { steps: [{ uses: "actions/checkout@v4" }, { run: "pnpm lint" }, { run: "spec-controller balance" }] },
          test: { steps: [{ name: "Install", run: "pnpm install" }, { run: "pnpm audit-the-tree" }] },
        },
      }),
    ).map((step) => ({ step, disposition: stepDispositionOf(step, { runners: {}, nonChecks: [{ workflow: "ci.yml", job: "test", step: "Install" }], deferralTags: [] }, {}, shellAnswers) }));

  it("[CLM-EVR-032] each job's counts will add up to the steps read in it", () => {
    const { jobs } = stepAccountOf(twoJobs());

    expect(jobs.map(({ stepsRead, runners, reconcilerSteps, nonChecks, plumbing, candidates }) => ({ stepsRead, sum: runners + reconcilerSteps + nonChecks + plumbing + candidates }))).toEqual([
      { stepsRead: 3, sum: 3 },
      { stepsRead: 2, sum: 2 },
    ]);
  });

  it("[CLM-EVR-033] the total will be the sum of the jobs", () => {
    const { total } = stepAccountOf(twoJobs());

    expect(total).toEqual({ stepsRead: 5, runners: 0, reconcilerSteps: 1, nonChecks: 1, plumbing: 1, candidates: 2, accountedFor: 5 });
  });

  it("[CLM-EVR-072] a workflow with a job that calls a reusable workflow, and a job with one step, has the one step read", () => {
    const steps = workflowStepsFrom("ci.yml", JSON.stringify({ jobs: { call: { uses: "./.github/workflows/other.yml" }, build: { steps: [{ run: "pnpm lint" }] } } }));
    const { jobs } = stepAccountOf(steps.map((step) => ({ step, disposition: stepDispositionOf(step, { runners: {}, nonChecks: [], deferralTags: [] }, {}, shellAnswers) })));

    expect(jobs.map(({ job, stepsRead }) => ({ job, stepsRead }))).toEqual([{ job: "build", stepsRead: 1 }]);
  });
});
