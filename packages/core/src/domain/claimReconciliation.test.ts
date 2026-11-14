import { describe, expect, it } from "vitest";
import type { ClaimCode } from "./claimCodes.js";
import { citedClaimReconciliationOf, claimReconciliationOf, claimReconciliationsOf, evidenceGroupsOf, type ClaimReconciliation } from "./claimReconciliation.js";
import claimReconciliationVariants from "./claimReconciliation.variants.json" with { type: "json" };
import { featureAsWrittenFrom } from "../inputs/gherkin.js";
import { shellAnswers } from "../inputs/shell.js";
import { workflowStepsFrom } from "../inputs/workflows.js";
import { executableClaimsOf, type ExecutableClaim, type QualityCheckKind } from "./postEvidenceObligation.js";
import { fitnessObservationsOf, type EvidenceObservation, type PhantomClaim, type Result, type UnnamedClaim } from "./postEvidenceObservation.js";

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

// A claim reconciled on its own, by what kind of claim it is.
const reconciledAlone = (claim: ExecutableClaim | PhantomClaim | UnnamedClaim, filed: readonly EvidenceObservation[]) =>
  "obligations" in claim ? claimReconciliationOf(claim, filed, false) : citedClaimReconciliationOf(claim, filed);

const citing = (read: ClaimRead): ClaimCode[] => (read === "phantom" ? [ONE_999] : read === "unnamed" ? [] : [ONE_001]);

const observationOf = (read: ClaimRead, [kind, result]: ObservationRead): EvidenceObservation => ({
  cites: citing(read),
  result,
  kind,
  place: "one.test.ts",
  notes: [],
});

// A claim reconciled as balance would: a claim sharing its code beside the other claim that has it, any other on its own.
function reconciled(read: ClaimRead, kinds: readonly QualityCheckKind[], observations: readonly ObservationRead[]): ClaimReconciliation {
  const filed = observations.map((observation) => observationOf(read, observation));
  const claim = claimOf(read, kinds);
  if (read !== "sharing its code") return reconciledAlone(claim, filed);
  const shared = claim as ExecutableClaim;
  return claimReconciliationsOf([shared, { ...shared, title: "another scenario" }], filed)[0]!;
}

const verdictAndOutcomes = ({ verdict, qualityCheckReconciliations }: ClaimReconciliation) => ({
  verdict,
  outcomes: qualityCheckReconciliations.map(({ outcome }) => outcome).sort(),
});

// A kind of quality check, as a variant names it.
const KIND: Readonly<Record<string, QualityCheckKind>> = {
  unit: "unit",
  integration: "integration",
  e2e: "e2e",
  performance: "performance",
  fitness: "fitness",
  "unit tests": "unit",
  "fitness functions": "fitness",
};

const kindNamed = (variant: string): QualityCheckKind => {
  const kind = KIND[variant];
  if (kind === undefined) throw new Error(`no kind of quality check for the variant ${variant}`);
  return kind;
};

describe("a Claim Reconciliation follows from its evidence", () => {
  it.each(claimReconciliationVariants["CLM-LDG-001"].variants)(
    "[CLM-LDG-001] there was an Evidence Obligation of the kind %s under @CLM-ONE-001, and a passing check of that kind citing it: when balance reconciles them, the Claim Reconciliation will be balanced, and its Quality Check Reconciliations will have the outcomes one satisfied",
    (variant) => {
      const kind = kindNamed(variant);

      expect(verdictAndOutcomes(reconciled("under its code", [kind], [[kind, "passed"]]))).toEqual({ verdict: "balanced", outcomes: ["satisfied"] });
    },
  );

  it.each(claimReconciliationVariants["CLM-LDG-047"].variants)(
    "[CLM-LDG-047] there was an Evidence Obligation under @CLM-ONE-001, and one passing and one failing check citing it, of %s: when balance reconciles them, the Claim Reconciliation will be out of balance, and its Quality Check Reconciliations will have the outcomes one satisfied and one failing",
    (variant) => {
      const kind = kindNamed(variant);

      expect(verdictAndOutcomes(reconciled("under its code", [kind], [[kind, "passed"], [kind, "failed"]]))).toEqual({
        verdict: "out-of-balance",
        outcomes: ["failing", "satisfied"],
      });
    },
  );

  // Whether the claim sharing its code asks for a unit test.
  const TAGGED: Readonly<Record<string, readonly QualityCheckKind[]>> = { "with a kind-of-check tag": ["unit"], "without a kind-of-check tag": [] };

  it.each(claimReconciliationVariants["CLM-LDG-054"].variants)(
    "[CLM-LDG-054] there was a claim %s under @CLM-ONE-001, shared with another claim, and no test citing it: when balance reconciles them, the Claim Reconciliation will be out of balance, and its Quality Check Reconciliations will have the outcomes one duplicate-claim-code",
    (variant) => {
      const kinds = TAGGED[variant];
      if (kinds === undefined) throw new Error(`no claim for the variant ${variant}`);

      expect(verdictAndOutcomes(reconciled("sharing its code", kinds, []))).toEqual({ verdict: "out-of-balance", outcomes: ["duplicate-claim-code"] });
    },
  );

  it.each<[string, string, string, string, string, string, ClaimRead, readonly QualityCheckKind[], readonly ObservationRead[], string, readonly string[]]>([
    ["CLM-LDG-027", "a unit Evidence Obligation", "@CLM-ONE-001", "three passing unit tests citing it", "balanced", "three satisfied",
      "under its code", ["unit"], [["unit", "passed"], ["unit", "passed"], ["unit", "passed"]], "balanced", ["satisfied", "satisfied", "satisfied"]],
    ["CLM-LDG-013", "a unit and an e2e Evidence Obligation", "@CLM-ONE-001", "a passing unit test and a passing e2e test, each citing it", "balanced", "two satisfied",
      "under its code", ["unit", "e2e"], [["unit", "passed"], ["e2e", "passed"]], "balanced", ["satisfied", "satisfied"]],
    ["CLM-LDG-002", "a unit Evidence Obligation", "@CLM-ONE-001", "a failing unit test citing it", "out of balance", "one failing",
      "under its code", ["unit"], [["unit", "failed"]], "out-of-balance", ["failing"]],
    ["CLM-LDG-003", "a unit Evidence Obligation", "@CLM-ONE-001", "no unit test", "out of balance", "one missing",
      "under its code", ["unit"], [], "out-of-balance", ["missing"]],
    ["CLM-LDG-004", "a unit and an integration Evidence Obligation", "@CLM-ONE-001", "a failing unit test citing it", "out of balance", "one failing and one missing",
      "under its code", ["unit", "integration"], [["unit", "failed"]], "out-of-balance", ["failing", "missing"]],
    ["CLM-LDG-052", "a unit Evidence Obligation", "@CLM-ONE-001", "a unit test citing it that never reached its assertions", "out of balance", "one missing and one never-ran",
      "under its code", ["unit"], [["unit", "never-ran"]], "out-of-balance", ["missing", "never-ran"]],
    ["CLM-LDG-008", "a unit Evidence Obligation", "@CLM-ONE-001", "an e2e test citing it", "out of balance", "one missing and one not-asked-for",
      "under its code", ["unit"], [["e2e", "passed"]], "out-of-balance", ["missing", "not-asked-for"]],
    ["CLM-LDG-010", "no Evidence Obligation", "@CLM-ONE-001", "a unit test citing it", "out of balance", "one not-asked-for",
      "under its code", [], [["unit", "passed"]], "out-of-balance", ["not-asked-for"]],
    ["CLM-LDG-009", "no Evidence Obligation", "@CLM-ONE-001", "no test citing it", "out of balance", "one no-quality-check",
      "under its code", [], [], "out-of-balance", ["no-quality-check"]],
    ["CLM-LDG-053", "a fitness Evidence Obligation", "@CLM-ONE-001", "a passing fitness function citing it, whose step cannot fail its job", "out of balance", "one cannot-fail",
      "under its code", ["fitness"], [["fitness", "passed-on-error"]], "out-of-balance", ["cannot-fail"]],
    ["CLM-LDG-021", "a unit Evidence Obligation", "no code", "no test", "out of balance", "one no-claim-code",
      "with no code", ["unit"], [], "out-of-balance", ["no-claim-code"]],
    ["CLM-LDG-006", "no Evidence Obligation", "@CLM-ONE-999, on no executable claim", "a unit test citing it", "out of balance", "one cites-unknown-claim",
      "phantom", [], [["unit", "passed"]], "out-of-balance", ["cites-unknown-claim"]],
    ["CLM-LDG-007", "no Evidence Obligation", "the unnamed claim", "a unit test citing no code", "out of balance", "one cites-no-claim",
      "unnamed", [], [["unit", "passed"]], "out-of-balance", ["cites-no-claim"]],
    ["CLM-LDG-057", "no Evidence Obligation", "the unnamed claim", "a test file that never ran, citing no code", "out of balance", "one never-ran",
      "unnamed", [], [["unit", "never-ran"]], "out-of-balance", ["never-ran"]],
  ])(
    "[%s] there was %s under %s, and there was %s: when balance reconciles them, the Claim Reconciliation will be %s, and its Quality Check Reconciliations will have the outcomes %s",
    (_clm, _obligations, _claimCode, _observations, _verdict, _outcomes, read, kinds, observations, verdict, outcomes) => {
      expect(verdictAndOutcomes(reconciled(read, kinds, observations))).toEqual({ verdict, outcomes });
    },
  );

  it("[CLM-LDG-055] there was no Evidence Obligation under @CLM-ONE-002, on a deferred scenario, and there was a unit test citing it: when balance reconciles them, the Claim Reconciliation will be out of balance, and its Quality Check Reconciliations will have the outcomes one cites-unknown-claim", () => {
    const deferred = featureAsWrittenFrom("one.feature", "@ONE\nFeature: one\n\n  @wip @unit @CLM-ONE-002\n  Scenario: a scenario\n    Given a step\n");
    const [reconciliation] = claimReconciliationsOf(executableClaimsOf([deferred], { deferralTags: [], strict: false }), [
      { cites: [{ featureCode: "ONE", number: "002" }], result: "passed", kind: "unit", place: "one.test.ts", name: "a test", notes: [] },
    ]);

    expect({ claim: reconciliation?.claim, verdict: reconciliation?.verdict, outcomes: reconciliation?.qualityCheckReconciliations.map(({ outcome }) => outcome) }).toEqual({
      claim: { claimCode: { featureCode: "ONE", number: "002" } },
      verdict: "out-of-balance",
      outcomes: ["cites-unknown-claim"],
    });
  });

  it("[CLM-LDG-046] a scenario titled \"a\" in one.feature and one titled \"b\" in two.feature were both tagged @CLM-ONE-001: when balance reconciles them, there will be two Claim Reconciliations under @CLM-ONE-001, one for each executable claim", () => {
    const claims: ExecutableClaim[] = [
      { claimCode: ONE_001, file: "one.feature", title: "a", obligations: [{ kind: "unit" }] },
      { claimCode: ONE_001, file: "two.feature", title: "b", obligations: [{ kind: "unit" }] },
    ];

    expect(claimReconciliationsOf(claims, []).map(({ claim }) => claim)).toEqual(claims);
  });
});

// Evidence on the unnamed claim as a group row writes it: its kind, result, place, the codes it cites, and its name.
type Unnamed = readonly [kind: QualityCheckKind, result: Result, place: string, cites: readonly ("001" | "002")[], name: string];

// A fitness function is a CI step, which has no name.
const unnamedObservation = ([kind, result, place, cites, name]: Unnamed): EvidenceObservation => ({
  cites: cites.map((number) => ({ featureCode: "ONE", number })),
  result,
  kind,
  place,
  ...(kind === "fitness" ? {} : { name }),
  notes: [],
});

const groupsOf = (observations: readonly EvidenceObservation[]): ReturnType<typeof evidenceGroupsOf> => evidenceGroupsOf(citedClaimReconciliationOf({}, observations));

const groupsOn = (evidence: readonly Unnamed[]): ReturnType<typeof evidenceGroupsOf> => groupsOf(evidence.map(unnamedObservation));

describe("balance groups the unnamed claim's evidence by kind of quality check, file and shared claim code", () => {
  it.each<[string, string, string, readonly Unnamed[], readonly string[]]>([
    ["CLM-LDG-065", "two unit tests in a.test.ts, citing no code", "one unit group for a.test.ts", [["unit", "passed", "a.test.ts", [], "x"], ["unit", "passed", "a.test.ts", [], "y"]], ["unit a.test.ts  2"]],
    ["CLM-LDG-066", "a unit test in a.test.ts and one in b.test.ts, citing no code", "a unit group for each file", [["unit", "passed", "a.test.ts", [], "x"], ["unit", "passed", "b.test.ts", [], "y"]], ["unit a.test.ts  1", "unit b.test.ts  1"]],
    ["CLM-LDG-067", "a unit test and an integration test in a.test.ts, citing no code", "a unit group and an integration group", [["unit", "passed", "a.test.ts", [], "x"], ["integration", "passed", "a.test.ts", [], "y"]], ["unit a.test.ts  1", "integration a.test.ts  1"]],
    ["CLM-LDG-068", "a test in a.test.ts citing no code, and one citing the shared claim code CLM-ONE-001", "two groups, one naming CLM-ONE-001", [["unit", "passed", "a.test.ts", [], "x"], ["unit", "passed", "a.test.ts", ["001"], "y"]], ["unit a.test.ts  1", "unit a.test.ts ONE-001 1"]],
    ["CLM-LDG-073", "a test in a.test.ts citing no code, and one citing both CLM-ONE-001 and CLM-ONE-002", "one unit group for a.test.ts", [["unit", "passed", "a.test.ts", [], "x"], ["unit", "passed", "a.test.ts", ["001", "002"], "y"]], ["unit a.test.ts  2"]],
    ["CLM-LDG-070", "an uncited fitness function, and one citing the shared claim code CLM-ONE-001", "two fitness groups, one naming CLM-ONE-001", [["fitness", "passed", "ci / Lint", [], "Lint"], ["fitness", "passed", "ci / Audit", ["001"], "Audit"]], ["fitness   1", "fitness  ONE-001 1"]],
  ])("[%s] the unnamed claim had %s: when balance reconciles it, it will have %s", (_clm, _evidence, _groups, evidence, groups) => {
    const read = groupsOn(evidence).map(({ kind, file, claimCode, qualityCheckReconciliations }) =>
      [kind, file ?? "", claimCode ? `${claimCode.featureCode}-${claimCode.number}` : "", qualityCheckReconciliations.length].join(" "),
    );

    expect([...read].sort()).toEqual([...groups].sort());
  });

  // Two steps with no id, in jobs build and test, posted from an empty step record.
  it("[CLM-LDG-069] the unnamed claim had two uncited fitness functions: when balance reconciles it, it will have one fitness group naming both", () => {
    const steps = workflowStepsFrom("ci.yml", JSON.stringify({ jobs: { build: { steps: [{ run: "pnpm lint" }] }, test: { steps: [{ run: "pnpm audit-the-tree" }] } } }));
    const posted = fitnessObservationsOf(steps, [], { runners: {}, nonChecks: [], deferralTags: [] }, {}, shellAnswers);

    expect(groupsOf(posted).map(({ kind, file, qualityCheckReconciliations }) => ({ kind, file, places: qualityCheckReconciliations.map(({ observation }) => observation?.place) }))).toEqual([
      { kind: "fitness", file: undefined, places: ["ci.yml:build:pnpm lint", "ci.yml:test:pnpm audit-the-tree"] },
    ]);
  });

  it.each<[string, string, number, number, number, string, readonly Unnamed[], readonly string[]]>([
    ["CLM-LDG-071", "two passing tests", 2, 2, 0, "no test", [["unit", "passed", "a.test.ts", [], "a"], ["unit", "passed", "a.test.ts", [], "b"]], []],
    ["CLM-LDG-072", "a passing test and a failing test \"b\"", 2, 1, 1, "the test b", [["unit", "passed", "a.test.ts", [], "a"], ["unit", "failed", "a.test.ts", [], "b"]], ["b"]],
    ["CLM-LDG-074", "a passing fitness function whose step cannot fail its job", 1, 1, 0, "no test", [["fitness", "passed-on-error", "ci / Lint", [], "Lint"]], []],
    ["CLM-LDG-075", "a passing test in a.test.ts, and a.test.ts's tests that never ran", 1, 1, 0, "no test", [["unit", "passed", "a.test.ts", [], "a"], ["unit", "never-ran", "a.test.ts", [], "b"]], []],
  ])("[%s] a group on the unnamed claim had %s: when balance reconciles it, the group will have %s ran, %s passed and %s failed, naming %s", (_clm, _tests, ran, passed, failed, _failures, evidence, failures) => {
    expect(groupsOn(evidence).map((group) => ({ ran: group.ran, passed: group.passed, failed: group.failed, failures: group.failures }))).toEqual([
      { ran, passed, failed, failures },
    ]);
  });
});

// An Evidence Observation as a sort row writes it: its kind, result, test file, the code it cites, and its message.
type Placed = readonly [kind: QualityCheckKind, result: Result, place: string, cites: "it" | "no code" | "CLM-ONE-002", message: string];

const ONE_002: ClaimCode = { featureCode: "ONE", number: "002" };

const placedObservation = ([kind, result, place, cites, message]: Placed): EvidenceObservation => ({
  cites: cites === "it" ? [ONE_001] : cites === "CLM-ONE-002" ? [ONE_002] : [],
  result,
  kind,
  place,
  notes: [],
  ...(message === "" ? {} : { message }),
});

const sortedAs = ({ kind, observation }: { kind?: QualityCheckKind; observation?: EvidenceObservation }): string =>
  [kind, observation?.place, observation?.cites.map(({ number }) => number).join(" "), observation?.message].join("|");

describe("a Claim Reconciliation lists its Quality Check Reconciliations in one fixed order", () => {
  it.each<[string, string, string, string, string, "under its code" | "unnamed", readonly QualityCheckKind[], readonly Placed[], readonly string[]]>([
    [
      "CLM-LDG-059",
      "a unit, an integration, an e2e, a performance and a fitness Evidence Obligation",
      "@CLM-ONE-001",
      "a passing fitness function, performance test, e2e test, integration test, then unit test, each citing it",
      "a passing unit test, integration test, e2e test, performance test, then fitness function, each citing it",
      "under its code",
      ["fitness", "performance", "e2e", "integration", "unit"],
      [
        ["fitness", "passed", "a.test.ts", "it", ""],
        ["performance", "passed", "a.test.ts", "it", ""],
        ["e2e", "passed", "a.test.ts", "it", ""],
        ["integration", "passed", "a.test.ts", "it", ""],
        ["unit", "passed", "a.test.ts", "it", ""],
      ],
      ["unit|a.test.ts|001|", "integration|a.test.ts|001|", "e2e|a.test.ts|001|", "performance|a.test.ts|001|", "fitness|a.test.ts|001|"],
    ],
    [
      "CLM-LDG-060",
      "a unit Evidence Obligation",
      "@CLM-ONE-001",
      "a passing unit test in z.test.ts citing it, then a failing one in a.test.ts",
      "a failing unit test in a.test.ts citing it, then a passing one in z.test.ts",
      "under its code",
      ["unit"],
      [["unit", "passed", "z.test.ts", "it", ""], ["unit", "failed", "a.test.ts", "it", ""]],
      ["unit|a.test.ts|001|", "unit|z.test.ts|001|"],
    ],
    [
      "CLM-LDG-061",
      "no Evidence Obligation",
      "the unnamed claim",
      "a unit test in z.test.ts citing no code, then one in a.test.ts citing @CLM-ONE-002, on two executable claims",
      "a unit test in a.test.ts citing @CLM-ONE-002, on two executable claims, then one in z.test.ts citing no code",
      "unnamed",
      [],
      [["unit", "passed", "z.test.ts", "no code", ""], ["unit", "passed", "a.test.ts", "CLM-ONE-002", ""]],
      ["unit|a.test.ts|002|", "unit|z.test.ts||"],
    ],
    [
      "CLM-LDG-062",
      "no Evidence Obligation",
      "the unnamed claim",
      "a unit test in a.test.ts citing @CLM-ONE-002, on two executable claims, then one in a.test.ts citing no code",
      "a unit test in a.test.ts citing no code, then one in a.test.ts citing @CLM-ONE-002, on two executable claims",
      "unnamed",
      [],
      [["unit", "passed", "a.test.ts", "CLM-ONE-002", ""], ["unit", "passed", "a.test.ts", "no code", ""]],
      ["unit|a.test.ts||", "unit|a.test.ts|002|"],
    ],
    [
      "CLM-LDG-063",
      "no Evidence Obligation",
      "the unnamed claim",
      "a unit test in a.test.ts citing @CLM-ONE-002, on two executable claims, failing with \"a\", then one in a.test.ts citing no code failing with \"b\"",
      "a unit test in a.test.ts citing no code failing with \"b\", then one in a.test.ts citing @CLM-ONE-002, on two executable claims, failing with \"a\"",
      "unnamed",
      [],
      [["unit", "failed", "a.test.ts", "CLM-ONE-002", "a"], ["unit", "failed", "a.test.ts", "no code", "b"]],
      ["unit|a.test.ts||b", "unit|a.test.ts|002|a"],
    ],
    [
      "CLM-LDG-064",
      "a unit Evidence Obligation",
      "@CLM-ONE-001",
      "a unit test in a.test.ts citing it failing with \"b\", then one failing with \"a\"",
      "a unit test in a.test.ts citing it failing with \"a\", then one failing with \"b\"",
      "under its code",
      ["unit"],
      [["unit", "failed", "a.test.ts", "it", "b"], ["unit", "failed", "a.test.ts", "it", "a"]],
      ["unit|a.test.ts|001|a", "unit|a.test.ts|001|b"],
    ],
  ])("[%s] there was %s under %s, and there was %s: when balance reconciles them, its Quality Check Reconciliations will be in the order %s", (_clm, _obligations, _claimCode, _observations, _order, read, kinds, observations, sorted) => {
    const reconciliation = reconciledAlone(claimOf(read, kinds), observations.map(placedObservation));

    expect(reconciliation.qualityCheckReconciliations.map(sortedAs)).toEqual(sorted);
  });

  it("[CLM-LDG-076] there was a unit and a fitness Evidence Obligation under @CLM-ONE-001, and there was a unit test in a.test.ts citing it that never ran: when balance reconciles them, its Quality Check Reconciliations will be in the order unit missing, the unit test in a.test.ts that never ran, then fitness missing", () => {
    const neverRan: EvidenceObservation = { cites: [ONE_001], result: "never-ran", kind: "unit", place: "a.test.ts", name: "adds" };
    const reconciliation = claimReconciliationOf(claimOf("under its code", ["unit", "fitness"]) as ExecutableClaim, [neverRan], false);

    expect(reconciliation.qualityCheckReconciliations.map(({ outcome, kind }) => `${kind} ${outcome}`)).toEqual(["unit missing", "unit never-ran", "fitness missing"]);
  });
});
