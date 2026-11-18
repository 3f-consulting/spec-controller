import { describe, expect, it } from "vitest";
import type { ClaimCode } from "./claimCodes.js";
import { citedClaimReconciliationOf, claimReconciliationOf, claimReconciliationsOf, evidenceGroupsOf } from "./claimReconciliation.js";
import { featureAsWrittenFrom } from "../inputs/gherkin.js";
import { shellAnswers } from "../inputs/shell.js";
import { stepRecordFrom } from "../inputs/stepRecord.js";
import { workflowStepsFrom } from "../inputs/workflows.js";
import { executableClaimsOf, type ExecutableClaim, type QualityCheckKind } from "./postEvidenceObligation.js";
import { disposedStepsOf, fitnessObservationsOf, type EvidenceObservation, type PhantomClaim, type Result, type UnnamedClaim } from "./postEvidenceObservation.js";

const ONE_001: ClaimCode = { featureCode: "ONE", number: "001" };
const ONE_999: ClaimCode = { featureCode: "ONE", number: "999" };

// The claim as the row names it: under its own code, with no code, sharing its code, on no executable claim, or the unnamed claim.
type ClaimRead = "under its code" | "with no code" | "sharing its code" | "phantom" | "unnamed";

type ObservationRead = readonly [kind: QualityCheckKind, result: Result];

function claimOf(read: ClaimRead, kinds: readonly QualityCheckKind[]): ExecutableClaim | PhantomClaim | UnnamedClaim {
  const obligations = kinds.map((kind) => ({ kind }));
  if (read === "phantom") return { claimCode: ONE_999 };
  if (read === "unnamed") return {};
  return { file: "one.feature", title: "a scenario", obligations, ...(read === "with no code" ? {} : { claimCode: ONE_001 }) };
}

// A claim reconciled on its own, or beside a second claim with its code, by what kind of claim it is.
const reconciledAlone = (claim: ExecutableClaim | PhantomClaim | UnnamedClaim, filed: readonly EvidenceObservation[], shared = false) =>
  "obligations" in claim ? claimReconciliationsOf(shared ? [claim, claim] : [claim], filed)[0]! : citedClaimReconciliationOf(claim, filed);

const citing = (read: ClaimRead): ClaimCode[] => (read === "phantom" ? [ONE_999] : read === "unnamed" ? [] : [ONE_001]);

const observationOf = (read: ClaimRead, [kind, result]: ObservationRead): EvidenceObservation => ({
  cites: citing(read),
  result,
  kind,
  place: "one.test.ts",
});

describe("a Quality Check Reconciliation's outcome follows from the sides it has", () => {
  it.each<[string, ClaimRead, readonly QualityCheckKind[], readonly ObservationRead[], readonly string[]]>([
    ["CLM-LDG-001", "under its code", ["unit"], [["unit", "passed"]], ["satisfied"]],
    ["CLM-LDG-049", "under its code", ["integration"], [["integration", "passed"]], ["satisfied"]],
    ["CLM-LDG-048", "under its code", ["e2e"], [["e2e", "passed"]], ["satisfied"]],
    ["CLM-LDG-050", "under its code", ["performance"], [["performance", "passed"]], ["satisfied"]],
    ["CLM-LDG-025", "under its code", ["fitness"], [["fitness", "passed"]], ["satisfied"]],
    ["CLM-LDG-027", "under its code", ["unit"], [["unit", "passed"], ["unit", "passed"], ["unit", "passed"]], ["satisfied", "satisfied", "satisfied"]],
    ["CLM-LDG-013", "under its code", ["unit", "e2e"], [["unit", "passed"], ["e2e", "passed"]], ["satisfied", "satisfied"]],
    ["CLM-LDG-002", "under its code", ["unit"], [["unit", "failed"]], ["failing"]],
    ["CLM-LDG-047", "under its code", ["unit"], [["unit", "passed"], ["unit", "failed"]], ["failing", "satisfied"]],
    ["CLM-LDG-051", "under its code", ["fitness"], [["fitness", "passed"], ["fitness", "failed"]], ["failing", "satisfied"]],
    ["CLM-LDG-003", "under its code", ["unit"], [], ["missing"]],
    ["CLM-LDG-004", "under its code", ["unit", "integration"], [["unit", "failed"]], ["failing", "missing"]],
    ["CLM-LDG-052", "under its code", ["unit"], [["unit", "never-ran"]], ["missing", "never-ran"]],
    ["CLM-LDG-008", "under its code", ["unit"], [["e2e", "passed"]], ["missing", "not-asked-for"]],
    ["CLM-LDG-010", "under its code", [], [["unit", "passed"]], ["not-asked-for"]],
    ["CLM-LDG-009", "under its code", [], [], ["no-quality-check"]],
    ["CLM-LDG-053", "under its code", ["fitness"], [["fitness", "passed-on-error"]], ["cannot-fail"]],
    ["CLM-LDG-021", "with no code", ["unit"], [], ["no-claim-code"]],
    ["CLM-LDG-054", "sharing its code", ["unit"], [], ["duplicate-claim-code"]],
    ["CLM-LDG-077", "sharing its code", [], [], ["no-quality-check"]],
    ["CLM-LDG-006", "phantom", [], [["unit", "passed"]], ["cites-unknown-claim"]],
    ["CLM-LDG-056", "phantom", [], [["unit", "passed"], ["unit", "passed"]], ["cites-unknown-claim", "cites-unknown-claim"]],
    ["CLM-LDG-007", "unnamed", [], [["unit", "passed"]], ["cites-no-claim"]],
    ["CLM-LDG-057", "unnamed", [], [["unit", "never-ran"]], ["never-ran"]],
    ["CLM-LDG-081", "unnamed", [], [["fitness", "not-recorded"]], ["cites-no-claim"]],
    ["CLM-LDG-078", "with no code", [], [], ["no-claim-code"]],
  ])("[%s] balance gives each Quality Check Reconciliation on a claim %s its outcome from its two sides", (_clm, read, kinds, observations, outcomes) => {
    const filed = observations.map((observation) => observationOf(read, observation));
    const reconciliation = reconciledAlone(claimOf(read, kinds), filed, read === "sharing its code");

    expect(reconciliation.qualityCheckReconciliations.map(({ outcome }) => outcome).sort()).toEqual(outcomes);
  });
});

describe("a claim is balanced only when every Quality Check Reconciliation on it is satisfied", () => {
  it.each<[string, string, readonly QualityCheckKind[], readonly ObservationRead[], string]>([
    ["CLM-LDG-079", "two satisfied", ["unit", "e2e"], [["unit", "passed"], ["e2e", "passed"]], "balanced"],
    ["CLM-LDG-080", "one satisfied and one failing", ["unit"], [["unit", "passed"], ["unit", "failed"]], "out-of-balance"],
  ])("[%s] balance gives a claim whose Quality Check Reconciliations have the outcomes %s its verdict", (_clm, _outcomes, kinds, observations, verdict) => {
    const reconciliation = reconciledAlone(claimOf("under its code", kinds), observations.map((observation) => observationOf("under its code", observation)));

    expect(reconciliation.verdict).toBe(verdict);
  });
});

describe("each executable claim sharing a claim code will have its own Claim Reconciliation, naming its feature file and title", () => {
  it("[CLM-LDG-046] scenarios \"a\" in one.feature and \"b\" in two.feature, both tagged @CLM-ONE-001, each have their own Claim Reconciliation", () => {
    const claims: ExecutableClaim[] = [
      { claimCode: ONE_001, file: "one.feature", title: "a", obligations: [{ kind: "unit" }] },
      { claimCode: ONE_001, file: "two.feature", title: "b", obligations: [{ kind: "unit" }] },
    ];

    expect(claimReconciliationsOf(claims, []).map(({ claim }) => claim)).toEqual(claims);
  });
});

// An Evidence Observation as a row writes it: its kind, result, place, the codes it cites, and the name and message it
// has, if any; a title given apart from the message names it instead. A fitness function is a CI step, which has no name.
type Placed = readonly [kind: QualityCheckKind, result: Result, place: string, cites: readonly ("001" | "002")[], named: string, titled?: string];

const placedObservation = ([kind, result, place, cites, named, titled]: Placed): EvidenceObservation => ({
  cites: cites.map((number) => ({ featureCode: "ONE", number })),
  result,
  kind,
  place,
  ...(named === "" ? {} : { message: named, ...(kind === "fitness" ? {} : { name: named }) }),
  ...(titled === undefined ? {} : { name: titled }),
});

const sortedAs = ({ kind, observation }: { kind?: QualityCheckKind; observation?: EvidenceObservation }): string =>
  [kind, observation?.place, observation?.cites.map(({ number }) => number).join(" "), observation?.message].join("|");

describe("a deferred scenario's code is read by no executable claim", () => {
  it("[CLM-LDG-055] @CLM-ONE-002, on a deferred scenario, with no Evidence Obligation and a unit test citing it, is out of balance with one cites-unknown-claim", () => {
    const deferred = featureAsWrittenFrom("one.feature", "@ONE\nFeature: one\n\n  @wip @unit @CLM-ONE-002\n  Scenario: a scenario\n    Given a step\n");
    const [reconciliation] = claimReconciliationsOf(executableClaimsOf([deferred], { deferralTags: [], strict: false }), [
      { cites: [{ featureCode: "ONE", number: "002" }], result: "passed", kind: "unit", place: "one.test.ts", name: "a test" },
    ]);

    expect({ claim: reconciliation?.claim, outcomes: reconciliation?.qualityCheckReconciliations.map(({ outcome }) => outcome) }).toEqual({
      claim: { claimCode: { featureCode: "ONE", number: "002" } },
      outcomes: ["cites-unknown-claim"],
    });
  });
});

describe("balance will list a claim's Quality Check Reconciliations in the same order whatever order the evidence came in", () => {
  it.each<[string, "under its code" | "unnamed", readonly QualityCheckKind[], readonly Placed[], readonly string[]]>([
    [
      "CLM-LDG-059",
      "under its code",
      ["fitness", "performance", "e2e", "integration", "unit"],
      [
        ["fitness", "passed", "a.test.ts", ["001"], ""],
        ["performance", "passed", "a.test.ts", ["001"], ""],
        ["e2e", "passed", "a.test.ts", ["001"], ""],
        ["integration", "passed", "a.test.ts", ["001"], ""],
        ["unit", "passed", "a.test.ts", ["001"], ""],
      ],
      ["unit|a.test.ts|001|", "integration|a.test.ts|001|", "e2e|a.test.ts|001|", "performance|a.test.ts|001|", "fitness|a.test.ts|001|"],
    ],
    [
      "CLM-LDG-060",
      "under its code",
      ["unit"],
      [["unit", "passed", "z.test.ts", ["001"], ""], ["unit", "failed", "a.test.ts", ["001"], ""]],
      ["unit|a.test.ts|001|", "unit|z.test.ts|001|"],
    ],
    [
      "CLM-LDG-061",
      "unnamed",
      [],
      [["unit", "passed", "z.test.ts", [], ""], ["unit", "passed", "a.test.ts", ["002"], ""]],
      ["unit|a.test.ts|002|", "unit|z.test.ts||"],
    ],
    [
      "CLM-LDG-062",
      "unnamed",
      [],
      [["unit", "passed", "a.test.ts", ["002"], ""], ["unit", "passed", "a.test.ts", [], ""]],
      ["unit|a.test.ts||", "unit|a.test.ts|002|"],
    ],
    [
      "CLM-LDG-063",
      "unnamed",
      [],
      [["unit", "failed", "a.test.ts", ["002"], "a"], ["unit", "failed", "a.test.ts", [], "b"]],
      ["unit|a.test.ts||b", "unit|a.test.ts|002|a"],
    ],
    [
      "CLM-LDG-064",
      "under its code",
      ["unit"],
      [["unit", "failed", "a.test.ts", ["001"], "b"], ["unit", "failed", "a.test.ts", ["001"], "a"]],
      ["unit|a.test.ts|001|a", "unit|a.test.ts|001|b"],
    ],
  ])("[%s] a claim %s has its Quality Check Reconciliations in order", (_clm, read, kinds, observations, sorted) => {
    const reconciliation = reconciledAlone(claimOf(read, kinds), observations.map(placedObservation));

    expect(reconciliation.qualityCheckReconciliations.map(sortedAs)).toEqual(sorted);
  });

  it('[CLM-LDG-083] a unit Evidence Obligation under @CLM-ONE-001, and a passing unit test in a.test.ts citing it titled "b", then one titled "a", neither with a message, are in the order "a" then "b"', () => {
    const titledB: Placed = ["unit", "passed", "a.test.ts", ["001"], "", "b"];
    const titledA: Placed = ["unit", "passed", "a.test.ts", ["001"], "", "a"];
    const reconciliation = reconciledAlone(claimOf("under its code", ["unit"]), [titledB, titledA].map(placedObservation));

    expect(reconciliation.qualityCheckReconciliations.map(({ observation }) => [observation?.place, observation?.message, observation?.name])).toEqual([
      ["a.test.ts", undefined, "a"],
      ["a.test.ts", undefined, "b"],
    ]);
  });

  it("[CLM-LDG-076] a unit and a fitness Evidence Obligation under @CLM-ONE-001, and a unit test in a.test.ts citing it that never ran, are in the order unit missing, the unit test in a.test.ts that never ran, then fitness missing", () => {
    const neverRan: EvidenceObservation = { cites: [ONE_001], result: "never-ran", kind: "unit", place: "a.test.ts", name: "adds" };
    const reconciliation = claimReconciliationOf(claimOf("under its code", ["unit", "fitness"]) as ExecutableClaim, [neverRan], false);

    expect(reconciliation.qualityCheckReconciliations.map(({ outcome, kind }) => `${kind} ${outcome}`)).toEqual(["unit missing", "unit never-ran", "fitness missing"]);
  });
});

const groupsOf = (observations: readonly EvidenceObservation[]): ReturnType<typeof evidenceGroupsOf> => evidenceGroupsOf(citedClaimReconciliationOf({}, observations));

const groupsOn = (evidence: readonly Placed[]): ReturnType<typeof evidenceGroupsOf> => groupsOf(evidence.map(placedObservation));

describe("balance will split the unnamed claim's evidence by kind, file and shared claim code, and by nothing else", () => {
  it.each<[string, readonly Placed[], readonly string[]]>([
    ["CLM-LDG-065", [["unit", "passed", "a.test.ts", [], "x"], ["unit", "passed", "a.test.ts", [], "y"]], ["unit a.test.ts  2"]],
    ["CLM-LDG-066", [["unit", "passed", "a.test.ts", [], "x"], ["unit", "passed", "b.test.ts", [], "y"]], ["unit a.test.ts  1", "unit b.test.ts  1"]],
    ["CLM-LDG-067", [["unit", "passed", "a.test.ts", [], "x"], ["integration", "passed", "a.test.ts", [], "y"]], ["unit a.test.ts  1", "integration a.test.ts  1"]],
    ["CLM-LDG-068", [["unit", "passed", "a.test.ts", [], "x"], ["unit", "passed", "a.test.ts", ["001"], "y"]], ["unit a.test.ts  1", "unit a.test.ts ONE-001 1"]],
    ["CLM-LDG-073", [["unit", "passed", "a.test.ts", [], "x"], ["unit", "passed", "a.test.ts", ["001", "002"], "y"]], ["unit a.test.ts  2"]],
    ["CLM-LDG-070", [["fitness", "passed", "ci / Lint", [], "Lint"], ["fitness", "passed", "ci / Audit", ["001"], "Audit"]], ["fitness   1", "fitness  ONE-001 1"]],
  ])("[%s] the unnamed claim's evidence falls into its groups", (_clm, evidence, groups) => {
    const read = groupsOn(evidence).map(({ kind, file, claimCode, qualityCheckReconciliations }) =>
      [kind, file ?? "", claimCode ? `${claimCode.featureCode}-${claimCode.number}` : "", qualityCheckReconciliations.length].join(" "),
    );

    expect([...read].sort()).toEqual([...groups].sort());
  });
});

describe("two uncited fitness functions share one group", () => {
  it("[CLM-LDG-069] two steps with no id, in jobs build and test, posted from an empty step record, are one fitness group naming both", () => {
    const steps = workflowStepsFrom("ci.yml", JSON.stringify({ jobs: { build: { steps: [{ run: "pnpm lint" }] }, test: { steps: [{ run: "pnpm audit-the-tree" }] } } }));
    const posted = fitnessObservationsOf(disposedStepsOf(steps, { runners: {}, nonChecks: [], deferralTags: [] }, {}, shellAnswers, []), []);

    expect(groupsOf(posted).map(({ kind, file, qualityCheckReconciliations }) => ({ kind, file, places: qualityCheckReconciliations.map(({ observation }) => observation?.place) }))).toEqual([
      { kind: "fitness", file: undefined, places: ["ci.yml:build:pnpm lint", "ci.yml:test:pnpm audit-the-tree"] },
    ]);
  });

  it("[CLM-LDG-069] a step with the id lint, in job build, that failed, and a step with no id, in job test, are one fitness group naming the failure by its place", () => {
    const steps = workflowStepsFrom("ci.yml", JSON.stringify({ jobs: { build: { steps: [{ id: "lint", run: "pnpm lint" }] }, test: { steps: [{ run: "pnpm audit-the-tree" }] } } }));
    const posted = fitnessObservationsOf(disposedStepsOf(steps, { runners: {}, nonChecks: [], deferralTags: [] }, {}, shellAnswers, stepRecordFrom({ lint: { outcome: "failure", conclusion: "failure" } })), stepRecordFrom({ lint: { outcome: "failure", conclusion: "failure" } }));

    expect(groupsOf(posted).map(({ kind, failures }) => ({ kind, failures }))).toEqual([{ kind: "fitness", failures: ["ci.yml:build:pnpm lint"] }]);
  });
});

describe("balance counts a group's results and names those that failed", () => {
  it.each<[string, readonly Placed[], number, number, number, readonly string[]]>([
    ["CLM-LDG-071", [["unit", "passed", "a.test.ts", [], "a"], ["unit", "passed", "a.test.ts", [], "b"]], 2, 2, 0, []],
    ["CLM-LDG-072", [["unit", "passed", "a.test.ts", [], "a"], ["unit", "failed", "a.test.ts", [], "b"]], 2, 1, 1, ["b"]],
    ["CLM-LDG-074", [["fitness", "passed-on-error", "ci / Lint", [], "Lint"]], 1, 1, 0, []],
    ["CLM-LDG-075", [["unit", "passed", "a.test.ts", [], "a"], ["unit", "never-ran", "a.test.ts", [], "b"]], 1, 1, 0, []],
    ["CLM-LDG-082", [["fitness", "not-recorded", "ci / Lint", [], "Lint"]], 0, 0, 0, []],
  ])("[%s] a group on the unnamed claim counts what ran, passed and failed, naming the failures", (_clm, evidence, ran, passed, failed, failures) => {
    expect(groupsOn(evidence).map((group) => ({ ran: group.ran, passed: group.passed, failed: group.failed, failures: group.failures }))).toEqual([
      { ran, passed, failed, failures },
    ]);
  });
});
