import { describe, it, expect } from "vitest";

import { reconcile } from "./evidenceReconciliation.js";
import { isBalanced, hasPendingItems, hasBrokenEvidence } from "./ledger.js";
import type { EvidenceObservation } from "../model.js";

describe("[SCN-LDG-018] hasBrokenEvidence — the whole-run soundness predicate", () => {
  const brokenObservation: EvidenceObservation = {
    qualityCheck: "unit",
    scnId: null,
    status: "failed",
    broken: true,
    locator: "packages/core/src/collection-failed.test.ts",
    message: "Error: Cannot find package '@cucumber/tag-expressions'",
  };

  it("is true when the run carries a broken reconciling item (real reconcile output)", () => {
    const balance = reconcile(
      [{ scnId: "SCN-HNS-018", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [brokenObservation],
    );
    expect(hasBrokenEvidence(balance)).toBe(true);
  });

  it("is false when no row carries a broken item, even though the run is out-of-balance (real reconcile output)", () => {
    const balance = reconcile(
      [{ scnId: "SCN-HNS-018", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [],
    );
    expect(isBalanced(balance)).toBe(false);
    expect(hasBrokenEvidence(balance)).toBe(false);
  });

  it("is false for a balanced run (real reconcile output)", () => {
    const balance = reconcile(
      [{ scnId: "SCN-HNS-018", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [{ qualityCheck: "unit", scnId: "SCN-HNS-018", status: "passed" }],
    );
    expect(hasBrokenEvidence(balance)).toBe(false);
  });

  it("the three whole-run predicates are INDEPENDENT: pending-without-broken is sound; broken-without-pending is unsound", () => {
    const pendingOnly = reconcile(
      [{ scnId: "SCN-HNS-019", evidenceObligations: [{ qualityCheck: "integration", pending: true }] }],
      [],
    );
    expect(hasPendingItems(pendingOnly)).toBe(true);
    expect(hasBrokenEvidence(pendingOnly)).toBe(false);

    const brokenOnly = reconcile(
      [{ scnId: "SCN-HNS-018", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [brokenObservation],
    );
    expect(hasBrokenEvidence(brokenOnly)).toBe(true);
    expect(hasPendingItems(brokenOnly)).toBe(false);
    expect(isBalanced(brokenOnly)).toBe(false);
  });

  it("soundness is DERIVED, never stored: the reconciliation carries no soundness field", () => {
    const balance = reconcile(
      [{ scnId: "SCN-HNS-018", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [brokenObservation],
    );
    expect(Object.keys(balance)).toEqual(["scenarioReconciliations"]);
  });
});
