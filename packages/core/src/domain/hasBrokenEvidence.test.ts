import { describe, it, expect } from "vitest";

import { reconcile } from "./evidenceReconciliation.js";
import { isBalanced, hasPendingItems, hasBrokenEvidence } from "./ledger.js";
import type { EvidenceObservation } from "../model.js";

describe("[CLM-LDG-018] hasBrokenEvidence — the whole-run soundness predicate", () => {
  const brokenObservation: EvidenceObservation = {
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
    expect(hasBrokenEvidence(pendingOnly)).toBe(false);

    const brokenOnly = reconcile(
      [{ claimCode: "CLM-HNS-018", evidenceObligations: [{ qualityCheckKind: "unit" }] }],
      [brokenObservation],
    );
    expect(hasBrokenEvidence(brokenOnly)).toBe(true);
    expect(hasPendingItems(brokenOnly)).toBe(false);
    expect(isBalanced(brokenOnly)).toBe(false);
  });
});
