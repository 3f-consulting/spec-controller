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
