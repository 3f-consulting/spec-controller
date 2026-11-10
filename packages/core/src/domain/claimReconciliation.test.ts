import { describe, expect, it } from "vitest";
import type { ClaimCode } from "./claimCodes.js";
import { claimReconciliationsOf, type ClaimReconciliation } from "./claimReconciliation.js";
import type { ExecutableClaim, QualityCheckKind } from "./postEvidenceObligation.js";
import type { EvidenceObservation } from "./postEvidenceObservation.js";

function code(text: string): ClaimCode {
  const [featureCode = "", number = ""] = text.split("-");
  return { featureCode, number };
}

function claim(codeText: string | undefined, kinds: readonly QualityCheckKind[], file = "one.feature", title = "a"): ExecutableClaim {
  return { file, title, obligations: kinds.map((kind) => ({ kind })), ...(codeText === undefined ? {} : { claimCode: code(codeText) }) };
}

function observation(
  kind: QualityCheckKind,
  result: EvidenceObservation["result"],
  cites: readonly string[],
  place = "a.test.ts",
  said: { readonly name?: string; readonly message?: string } = {},
): EvidenceObservation {
  return { cites: cites.map(code), result, kind, place, notes: [], ...said };
}

function reconciliationOf(reconciliations: readonly ClaimReconciliation[], subject: string): ClaimReconciliation | undefined {
  return reconciliations.find(({ claim: { file, claimCode } }) => {
    if (subject === "unnamed") return file === undefined && claimCode === undefined;
    if (subject === "no code") return file !== undefined && claimCode === undefined;
    return claimCode !== undefined && `${claimCode.featureCode}-${claimCode.number}` === subject;
  });
}

describe("each executable claim sharing a claim code will have its own Claim Reconciliation", () => {
  it("[CLM-LDG-046] each executable claim sharing a claim code will have its own Claim Reconciliation, naming its feature file and title", () => {
    const claims = [claim("ONE-001", ["unit"], "one.feature", "a"), claim("ONE-001", ["unit"], "two.feature", "b")];
    expect(claimReconciliationsOf(claims, []).map((reconciliation) => reconciliation.claim)).toEqual(claims);
  });
});

describe("balance works out each Quality Check Reconciliation's outcome, and from those the verdict", () => {
  const twoClaimsSharing = (): ExecutableClaim[] => [claim("ONE-001", ["unit"], "one.feature", "a"), claim("ONE-001", ["unit"], "two.feature", "b")];

  it.each([
    ["CLM-LDG-001", "ONE-001", () => [claim("ONE-001", ["unit"])], () => [observation("unit", "passed", ["ONE-001"])], "balanced", ["satisfied"]],
    ["CLM-LDG-048", "ONE-001", () => [claim("ONE-001", ["e2e"])], () => [observation("e2e", "passed", ["ONE-001"])], "balanced", ["satisfied"]],
    ["CLM-LDG-025", "ONE-001", () => [claim("ONE-001", ["fitness"])], () => [observation("fitness", "passed", ["ONE-001"], "ci.yml:ci:a")], "balanced", ["satisfied"]],
    ["CLM-LDG-049", "ONE-001", () => [claim("ONE-001", ["integration"])], () => [observation("integration", "passed", ["ONE-001"])], "balanced", ["satisfied"]],
    ["CLM-LDG-050", "ONE-001", () => [claim("ONE-001", ["performance"])], () => [observation("performance", "passed", ["ONE-001"])], "balanced", ["satisfied"]],
    [
      "CLM-LDG-027",
      "ONE-001",
      () => [claim("ONE-001", ["unit"])],
      () => [observation("unit", "passed", ["ONE-001"]), observation("unit", "passed", ["ONE-001"]), observation("unit", "passed", ["ONE-001"])],
      "balanced",
      ["satisfied", "satisfied", "satisfied"],
    ],
    [
      "CLM-LDG-013",
      "ONE-001",
      () => [claim("ONE-001", ["unit", "e2e"])],
      () => [observation("unit", "passed", ["ONE-001"]), observation("e2e", "passed", ["ONE-001"])],
      "balanced",
      ["satisfied", "satisfied"],
    ],
    ["CLM-LDG-002", "ONE-001", () => [claim("ONE-001", ["unit"])], () => [observation("unit", "failed", ["ONE-001"])], "out-of-balance", ["failing"]],
    [
      "CLM-LDG-047",
      "ONE-001",
      () => [claim("ONE-001", ["unit"])],
      () => [observation("unit", "passed", ["ONE-001"]), observation("unit", "failed", ["ONE-001"])],
      "out-of-balance",
      ["failing", "satisfied"],
    ],
    [
      "CLM-LDG-051",
      "ONE-001",
      () => [claim("ONE-001", ["fitness"])],
      () => [observation("fitness", "passed", ["ONE-001"], "ci.yml:ci:a"), observation("fitness", "failed", ["ONE-001"], "ci.yml:ci:b")],
      "out-of-balance",
      ["failing", "satisfied"],
    ],
    ["CLM-LDG-003", "ONE-001", () => [claim("ONE-001", ["unit"])], () => [], "out-of-balance", ["missing"]],
    ["CLM-LDG-004", "ONE-001", () => [claim("ONE-001", ["unit", "integration"])], () => [observation("unit", "failed", ["ONE-001"])], "out-of-balance", ["failing", "missing"]],
    ["CLM-LDG-052", "ONE-001", () => [claim("ONE-001", ["unit"])], () => [observation("unit", "never-ran", ["ONE-001"])], "out-of-balance", ["missing", "never-ran"]],
    ["CLM-LDG-008", "ONE-001", () => [claim("ONE-001", ["unit"])], () => [observation("e2e", "passed", ["ONE-001"])], "out-of-balance", ["missing", "not-asked-for"]],
    ["CLM-LDG-010", "ONE-001", () => [claim("ONE-001", [])], () => [observation("unit", "passed", ["ONE-001"])], "out-of-balance", ["not-asked-for"]],
    ["CLM-LDG-009", "ONE-001", () => [claim("ONE-001", [])], () => [], "out-of-balance", ["no-quality-check"]],
    [
      "CLM-LDG-053",
      "ONE-001",
      () => [claim("ONE-001", ["fitness"])],
      () => [observation("fitness", "passed-on-error", ["ONE-001"], "ci.yml:ci:a")],
      "out-of-balance",
      ["cannot-fail"],
    ],
    ["CLM-LDG-021", "no code", () => [claim(undefined, ["unit"])], () => [], "out-of-balance", ["no-claim-code"]],
    ["CLM-LDG-054", "ONE-001", twoClaimsSharing, () => [], "out-of-balance", ["duplicate-claim-code"]],
    ["CLM-LDG-006", "ONE-999", () => [], () => [observation("unit", "passed", ["ONE-999"])], "out-of-balance", ["cites-unknown-claim"]],
    ["CLM-LDG-055", "ONE-002", () => [], () => [observation("unit", "passed", ["ONE-002"])], "out-of-balance", ["cites-unknown-claim"]],
    [
      "CLM-LDG-056",
      "ONE-999",
      () => [],
      () => [observation("unit", "passed", ["ONE-999"]), observation("unit", "passed", ["ONE-999"])],
      "out-of-balance",
      ["cites-unknown-claim", "cites-unknown-claim"],
    ],
    ["CLM-LDG-007", "unnamed", () => [], () => [observation("unit", "passed", [])], "out-of-balance", ["cites-no-claim"]],
    ["CLM-LDG-057", "unnamed", () => [], () => [observation("unit", "never-ran", [])], "out-of-balance", ["never-ran"]],
    [
      "CLM-LDG-058",
      "unnamed",
      () => [],
      () => [observation("unit", "passed", []), observation("unit", "passed", [])],
      "out-of-balance",
      ["cites-no-claim", "cites-no-claim"],
    ],
  ])("[%s] the Claim Reconciliation of %s follows from its evidence", (_clm, subject, claims, observations, verdict, outcomes) => {
    const reconciliation = reconciliationOf(claimReconciliationsOf(claims(), observations()), subject);
    expect({ verdict: reconciliation?.verdict, outcomes: reconciliation?.qualityCheckReconciliations.map(({ outcome }) => outcome).sort() }).toEqual({
      verdict,
      outcomes,
    });
  });
});
