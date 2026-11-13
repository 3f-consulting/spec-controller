import { describe, expect, it } from "vitest";
import type { ClaimCode } from "./claimCodes.js";
import { claimReconciliationOf, claimReconciliationsOf, evidenceGroupsOf } from "./claimReconciliation.js";
import type { ExecutableClaim, QualityCheckKind } from "./postEvidenceObligation.js";
import type { EvidenceObservation, PhantomClaim, Result, UnnamedClaim } from "./postEvidenceObservation.js";

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

const citing = (read: ClaimRead): ClaimCode[] => (read === "phantom" ? [ONE_999] : read === "unnamed" ? [] : [ONE_001]);

const observationOf = (read: ClaimRead, [kind, result]: ObservationRead): EvidenceObservation => ({
  cites: citing(read),
  result,
  kind,
  place: "one.test.ts",
  notes: [],
});

describe("balance works out each Quality Check Reconciliation's outcome, and from those the verdict", () => {
  it.each<[string, ClaimRead, readonly QualityCheckKind[], readonly ObservationRead[], string, readonly string[]]>([
    ["CLM-LDG-001", "under its code", ["unit"], [["unit", "passed"]], "balanced", ["satisfied"]],
    ["CLM-LDG-049", "under its code", ["integration"], [["integration", "passed"]], "balanced", ["satisfied"]],
    ["CLM-LDG-048", "under its code", ["e2e"], [["e2e", "passed"]], "balanced", ["satisfied"]],
    ["CLM-LDG-050", "under its code", ["performance"], [["performance", "passed"]], "balanced", ["satisfied"]],
    ["CLM-LDG-025", "under its code", ["fitness"], [["fitness", "passed"]], "balanced", ["satisfied"]],
    ["CLM-LDG-027", "under its code", ["unit"], [["unit", "passed"], ["unit", "passed"], ["unit", "passed"]], "balanced", ["satisfied", "satisfied", "satisfied"]],
    ["CLM-LDG-013", "under its code", ["unit", "e2e"], [["unit", "passed"], ["e2e", "passed"]], "balanced", ["satisfied", "satisfied"]],
    ["CLM-LDG-002", "under its code", ["unit"], [["unit", "failed"]], "out-of-balance", ["failing"]],
    ["CLM-LDG-047", "under its code", ["unit"], [["unit", "passed"], ["unit", "failed"]], "out-of-balance", ["failing", "satisfied"]],
    ["CLM-LDG-051", "under its code", ["fitness"], [["fitness", "passed"], ["fitness", "failed"]], "out-of-balance", ["failing", "satisfied"]],
    ["CLM-LDG-003", "under its code", ["unit"], [], "out-of-balance", ["missing"]],
    ["CLM-LDG-004", "under its code", ["unit", "integration"], [["unit", "failed"]], "out-of-balance", ["failing", "missing"]],
    ["CLM-LDG-052", "under its code", ["unit"], [["unit", "never-ran"]], "out-of-balance", ["missing", "never-ran"]],
    ["CLM-LDG-008", "under its code", ["unit"], [["e2e", "passed"]], "out-of-balance", ["missing", "not-asked-for"]],
    ["CLM-LDG-010", "under its code", [], [["unit", "passed"]], "out-of-balance", ["not-asked-for"]],
    ["CLM-LDG-009", "under its code", [], [], "out-of-balance", ["no-quality-check"]],
    ["CLM-LDG-053", "under its code", ["fitness"], [["fitness", "passed-on-error"]], "out-of-balance", ["cannot-fail"]],
    ["CLM-LDG-021", "with no code", ["unit"], [], "out-of-balance", ["no-claim-code"]],
    ["CLM-LDG-054", "sharing its code", ["unit"], [], "out-of-balance", ["duplicate-claim-code"]],
    ["CLM-LDG-006", "phantom", [], [["unit", "passed"]], "out-of-balance", ["cites-unknown-claim"]],
    ["CLM-LDG-055", "phantom", [], [["unit", "passed"]], "out-of-balance", ["cites-unknown-claim"]],
    ["CLM-LDG-056", "phantom", [], [["unit", "passed"], ["unit", "passed"]], "out-of-balance", ["cites-unknown-claim", "cites-unknown-claim"]],
    ["CLM-LDG-007", "unnamed", [], [["unit", "passed"]], "out-of-balance", ["cites-no-claim"]],
    ["CLM-LDG-057", "unnamed", [], [["unit", "never-ran"]], "out-of-balance", ["never-ran"]],
    ["CLM-LDG-058", "unnamed", [], [["unit", "passed"], ["unit", "passed"]], "out-of-balance", ["cites-no-claim", "cites-no-claim"]],
  ])("[%s] a claim %s, with its Evidence Obligations and Evidence Observations, has its verdict and outcomes", (_clm, read, kinds, observations, verdict, outcomes) => {
    const reconciliation = claimReconciliationOf(
      claimOf(read, kinds),
      observations.map((observation) => observationOf(read, observation)),
      read === "sharing its code",
    );

    expect({ verdict: reconciliation.verdict, outcomes: reconciliation.qualityCheckReconciliations.map(({ outcome }) => outcome).sort() }).toEqual({
      verdict,
      outcomes,
    });
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

describe("balance sorts a Claim Reconciliation's Quality Check Reconciliations by kind of quality check, then where the test is, then the code it cites, then what else it records", () => {
  it.each<[string, "under its code" | "unnamed", readonly QualityCheckKind[], readonly Placed[], readonly string[]]>([
    [
      "CLM-LDG-059",
      "under its code",
      ["unit", "integration", "e2e", "performance", "fitness"],
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
      "under its code",
      ["unit"],
      [["unit", "passed", "z.test.ts", "it", ""], ["unit", "failed", "a.test.ts", "it", ""]],
      ["unit|a.test.ts|001|", "unit|z.test.ts|001|"],
    ],
    [
      "CLM-LDG-061",
      "unnamed",
      [],
      [["unit", "passed", "z.test.ts", "no code", ""], ["unit", "passed", "a.test.ts", "CLM-ONE-002", ""]],
      ["unit|a.test.ts|002|", "unit|z.test.ts||"],
    ],
    [
      "CLM-LDG-062",
      "unnamed",
      [],
      [["unit", "passed", "a.test.ts", "CLM-ONE-002", ""], ["unit", "passed", "a.test.ts", "no code", ""]],
      ["unit|a.test.ts||", "unit|a.test.ts|002|"],
    ],
    [
      "CLM-LDG-063",
      "unnamed",
      [],
      [["unit", "failed", "a.test.ts", "CLM-ONE-002", "a"], ["unit", "failed", "a.test.ts", "no code", "b"]],
      ["unit|a.test.ts||b", "unit|a.test.ts|002|a"],
    ],
    [
      "CLM-LDG-064",
      "under its code",
      ["unit"],
      [["unit", "failed", "a.test.ts", "it", "b"], ["unit", "failed", "a.test.ts", "it", "a"]],
      ["unit|a.test.ts|001|a", "unit|a.test.ts|001|b"],
    ],
  ])("[%s] a claim %s has its Quality Check Reconciliations sorted", (_clm, read, kinds, observations, sorted) => {
    const reconciliation = claimReconciliationOf(claimOf(read, kinds), observations.map(placedObservation), false);

    expect(reconciliation.qualityCheckReconciliations.map(sortedAs)).toEqual(sorted);
  });
});

// Evidence on the unnamed claim as a group row writes it: its kind, result, place, the codes it cites, and its name.
type Unnamed = readonly [kind: QualityCheckKind, result: Result, place: string, cites: readonly ("001" | "002")[], name: string];

const unnamedObservation = ([kind, result, place, cites, name]: Unnamed): EvidenceObservation => ({
  cites: cites.map((number) => ({ featureCode: "ONE", number })),
  result,
  kind,
  place,
  name,
  notes: [],
});

const groupsOn = (evidence: readonly Unnamed[]): ReturnType<typeof evidenceGroupsOf> =>
  evidenceGroupsOf(claimReconciliationOf({}, evidence.map(unnamedObservation), false));

describe("evidence of the same kind, file and shared claim code will share a group", () => {
  it.each<[string, readonly Unnamed[], readonly string[]]>([
    ["CLM-LDG-065", [["unit", "passed", "a.test.ts", [], "x"], ["unit", "passed", "a.test.ts", [], "y"]], ["unit a.test.ts  2"]],
    ["CLM-LDG-066", [["unit", "passed", "a.test.ts", [], "x"], ["unit", "passed", "b.test.ts", [], "y"]], ["unit a.test.ts  1", "unit b.test.ts  1"]],
    ["CLM-LDG-067", [["unit", "passed", "a.test.ts", [], "x"], ["integration", "passed", "a.test.ts", [], "y"]], ["unit a.test.ts  1", "integration a.test.ts  1"]],
    ["CLM-LDG-068", [["unit", "passed", "a.test.ts", [], "x"], ["unit", "passed", "a.test.ts", ["001"], "y"]], ["unit a.test.ts  1", "unit a.test.ts ONE-001 1"]],
    ["CLM-LDG-073", [["unit", "passed", "a.test.ts", [], "x"], ["unit", "passed", "a.test.ts", ["001", "002"], "y"]], ["unit a.test.ts  2"]],
    ["CLM-LDG-069", [["fitness", "passed", "ci / Lint", [], "Lint"], ["fitness", "passed", "ci / Audit", [], "Audit"]], ["fitness   2"]],
    ["CLM-LDG-070", [["fitness", "passed", "ci / Lint", [], "Lint"], ["fitness", "passed", "ci / Audit", ["001"], "Audit"]], ["fitness   1", "fitness  ONE-001 1"]],
  ])("[%s] the unnamed claim's evidence falls into its groups", (_clm, evidence, groups) => {
    const read = groupsOn(evidence).map(({ kind, file, claimCode, qualityCheckReconciliations }) =>
      [kind, file ?? "", claimCode ? `${claimCode.featureCode}-${claimCode.number}` : "", qualityCheckReconciliations.length].join(" "),
    );

    expect([...read].sort()).toEqual([...groups].sort());
  });
});

describe("a group of tests will count them and name those that failed", () => {
  it.each<[string, readonly Unnamed[], number, number, number, readonly string[]]>([
    ["CLM-LDG-071", [["unit", "passed", "a.test.ts", [], "a"], ["unit", "passed", "a.test.ts", [], "b"]], 2, 2, 0, []],
    ["CLM-LDG-072", [["unit", "passed", "a.test.ts", [], "a"], ["unit", "failed", "a.test.ts", [], "b"]], 2, 1, 1, ["b"]],
    ["CLM-LDG-074", [["fitness", "passed-on-error", "ci / Lint", [], "Lint"]], 1, 1, 0, []],
  ])("[%s] a group on the unnamed claim counts what ran, passed and failed, naming the failures", (_clm, evidence, ran, passed, failed, failures) => {
    expect(groupsOn(evidence).map((group) => ({ ran: group.ran, passed: group.passed, failed: group.failed, failures: group.failures }))).toEqual([
      { ran, passed, failed, failures },
    ]);
  });
});
