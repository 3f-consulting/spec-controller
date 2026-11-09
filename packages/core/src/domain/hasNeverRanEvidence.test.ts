import { describe, it, expect } from "vitest";

import { reconcile } from "./evidenceReconciliation.js";
import { isBalanced, hasPendingItems, hasNeverRanEvidence } from "./ledger.js";
import type { EvidenceObservation } from "../model.js";

describe("[CLM-LDG-018] hasNeverRanEvidence — the whole-run soundness predicate", () => {
  const neverRanObservation: EvidenceObservation = {
    qualityCheckKind: "unit",
    claimCode: null,
    status: "failed",
    neverRan: true,
    locator: "packages/core/src/collection-failed.test.ts",
    message: "Error: Cannot find package '@cucumber/tag-expressions'",
  };

  it("the three whole-run predicates are INDEPENDENT: pending-without-never-ran is sound; never-ran-without-pending is unsound", () => {
    const pendingOnly = reconcile(
      [{ claimCode: "CLM-HNS-019", evidenceObligations: [{ qualityCheckKind: "integration", pending: true }] }],
      [],
    );
    expect(hasPendingItems(pendingOnly)).toBe(true);
    expect(hasNeverRanEvidence(pendingOnly)).toBe(false);

    const neverRanOnly = reconcile(
      [{ claimCode: "CLM-HNS-018", evidenceObligations: [{ qualityCheckKind: "unit" }] }],
      [neverRanObservation],
    );
    expect(hasNeverRanEvidence(neverRanOnly)).toBe(true);
    expect(hasPendingItems(neverRanOnly)).toBe(false);
    expect(isBalanced(neverRanOnly)).toBe(false);
  });
});
