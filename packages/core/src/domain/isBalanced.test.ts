import { describe, it, expect } from "vitest";

import { reconcile } from "./evidenceReconciliation.js";
import { isBalanced, hasPendingItems, hasBrokenEvidence, hasNothingToReconcile } from "./ledger.js";
import { runVerdict } from "./runVerdict.js";
import type {
  Ledger,
  Scenario,
  EvidenceObservation,
} from "../model.js";

const unitScenario = (claimCode: string): Scenario => ({ claimCode, evidenceObligations: [{ qualityCheckKind: "unit" }] });
const unitObservation = (claimCode: string): EvidenceObservation => ({ qualityCheckKind: "unit", claimCode, status: "passed" });

describe("[SCN-CLI-005] isBalanced — the positive boundary: a clean all-balanced run is not reded", () => {

  it("names a balanced reconciliation's verdict balanced (the gate does not over-fire)", () => {
    const reconciliation: Ledger = reconcile(
      [unitScenario("SCN-TGT-001"), unitScenario("SCN-TGT-002")],
      [unitObservation("SCN-TGT-001"), unitObservation("SCN-TGT-002")],
    );
    expect(runVerdict({ ledger: reconciliation, strict: false })).toBe("balanced");
  });
});

describe("[SCN-CLI-011] hasPendingItems + the --strict pending escalation", () => {
  it("hasPendingItems is true when any row carries a Pending Item (real reconcile output)", () => {
    const balance = reconcile(
      [{ claimCode: "SCN-PDR-001", evidenceObligations: [{ qualityCheckKind: "integration", pending: true }] }],
      [],
    );
    expect(hasPendingItems(balance)).toBe(true);
  });

  it("hasPendingItems is false when no row carries a Pending Item (real reconcile output)", () => {
    const balance = reconcile(
      [{ claimCode: "SCN-PDR-001", evidenceObligations: [{ qualityCheckKind: "unit" }] }],
      [{ qualityCheckKind: "unit", claimCode: "SCN-PDR-001", status: "passed" }],
    );
    expect(hasPendingItems(balance)).toBe(false);
  });

  it("out-of-balance DOMINATES: an out-of-balance run carrying Pending Items is named out-of-balance under --strict, never pending", () => {
    const balance = reconcile(
      [
        { claimCode: "SCN-PDR-001", evidenceObligations: [{ qualityCheckKind: "integration" }] },
        { claimCode: "SCN-PDR-002", evidenceObligations: [{ qualityCheckKind: "unit", pending: true }] },
      ],
      [],
    );
    expect(isBalanced(balance)).toBe(false);
    expect(hasPendingItems(balance)).toBe(true);
    expect(runVerdict({ ledger: balance, strict: true })).toBe("out-of-balance");
  });
});

describe("[SCN-CLI-019] hasNothingToReconcile — the whole-run predicate for a ledger with no accounts", () => {
  it("is true for the ledger reconcile() emits over a target that carried no scenario and produced nothing", () => {
    const empty = reconcile([], []);
    expect(empty.claimReconciliations).toEqual([]);
    expect(hasNothingToReconcile(empty)).toBe(true);
  });
});

describe("[SCN-CLI-020] a corpus-less run carrying uncited evidence observations — an ordinary out-of-balance report", () => {
  const corpusLessWithObservations = () =>
    reconcile(
      [],
      [
        { qualityCheckKind: "unit", claimCode: null, status: "passed", locator: "src/widget.test.ts" },
        { qualityCheckKind: "unit", claimCode: null, status: "passed", locator: "src/widget.test.ts" },
      ],
    );

  it("is out of balance, so it reaches the verdict exit 5 would have replaced", () => {
    const ledger = corpusLessWithObservations();
    expect(isBalanced(ledger)).toBe(false);
    expect(hasBrokenEvidence(ledger)).toBe(false);
    expect(hasPendingItems(ledger)).toBe(false);
  });
});
