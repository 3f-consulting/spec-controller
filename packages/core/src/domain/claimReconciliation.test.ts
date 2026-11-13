import { describe, expect, it } from "vitest";
import { claimReconciliationOf } from "./claimReconciliation.js";
import type { ExecutableClaim } from "./postEvidenceObligation.js";
import type { EvidenceObservation } from "./postEvidenceObservation.js";

describe("balance works out each Quality Check Reconciliation's outcome, and from those the verdict", () => {
  it("[CLM-LDG-001] a unit Evidence Obligation under @CLM-ONE-001 and a passing unit test citing it: balanced, one satisfied", () => {
    const claimCode = { featureCode: "ONE", number: "001" };
    const claim: ExecutableClaim = { claimCode, file: "one.feature", title: "a scenario", obligations: [{ kind: "unit" }] };
    const observation: EvidenceObservation = { cites: [claimCode], result: "passed", kind: "unit", place: "one.test.ts", notes: [] };

    const { verdict, qualityCheckReconciliations } = claimReconciliationOf(claim, [observation]);

    expect({ verdict, outcomes: qualityCheckReconciliations.map(({ outcome }) => outcome) }).toEqual({
      verdict: "balanced",
      outcomes: ["satisfied"],
    });
  });
});
