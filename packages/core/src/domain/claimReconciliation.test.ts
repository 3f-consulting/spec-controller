import { describe, expect, it } from "vitest";
import type { ClaimCode } from "./claimCodes.js";
import { claimReconciliationOf } from "./claimReconciliation.js";
import type { ExecutableClaim, QualityCheckKind } from "./postEvidenceObligation.js";
import type { EvidenceObservation, PhantomClaim, Result, UnnamedClaim } from "./postEvidenceObservation.js";

const ONE_001: ClaimCode = { featureCode: "ONE", number: "001" };
const ONE_999: ClaimCode = { featureCode: "ONE", number: "999" };

// The claim as the row names it: under @CLM-ONE-001, with no code, sharing its code, on no executable claim, or the unnamed claim.
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
