import { describe, expect, it } from "vitest";
import type { ClaimReconciliation } from "./claimReconciliation.js";
import { runVerdictOf } from "./evidenceReconciliation.js";

const balancedClaim = (number: string): ClaimReconciliation => ({
  claim: { claimCode: { featureCode: "ONE", number }, file: "one.feature", title: `scenario ${number}`, obligations: [] },
  qualityCheckReconciliations: [],
  verdict: "balanced",
});

describe("the run will be balanced or out of balance, as its Claim Reconciliations call for", () => {
  it("[CLM-EVR-001] a run of only balanced Claim Reconciliations is balanced", () => {
    expect(runVerdictOf([balancedClaim("001"), balancedClaim("002")])).toEqual({ verdict: "balanced" });
  });
});
