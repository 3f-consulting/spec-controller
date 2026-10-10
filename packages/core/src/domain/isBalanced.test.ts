import { describe, it, expect } from "vitest";

import { reconcile } from "./evidenceReconciliation.js";
import { isBalanced, hasPendingItems, hasBrokenEvidence, hasNothingToReconcile } from "./ledger.js";
import { verdictCode } from "./verdictCode.js";
import type {
  Ledger,
  Scenario,
  EvidenceObservation,
} from "../model.js";

const unitScenario = (scnId: string): Scenario => ({ scnId, evidenceObligations: [{ qualityCheck: "unit" }] });
const unitCredit = (scnId: string): EvidenceObservation => ({ qualityCheck: "unit", scnId, status: "passed" });

describe("[SCN-CLI-005] isBalanced — the positive boundary: a clean all-balanced run is not reded", () => {

  it("maps a balanced reconciliation to NO non-zero exit code (the gate does not over-fire)", () => {
    const reconciliation: Ledger = reconcile(
      [unitScenario("SCN-TGT-001"), unitScenario("SCN-TGT-002")],
      [unitCredit("SCN-TGT-001"), unitCredit("SCN-TGT-002")],
    );
    expect(verdictCode({ ledger: reconciliation, strict: false })).toBe(0);
  });
});

describe("[SCN-CLI-011] hasPendingItems + the --strict exit-3 escalation", () => {
  it("hasPendingItems is true when any row carries a Pending Item (real reconcile output)", () => {
    const balance = reconcile(
      [{ scnId: "SCN-PDR-001", evidenceObligations: [{ qualityCheck: "integration", pending: true }] }],
      [],
    );
    expect(hasPendingItems(balance)).toBe(true);
  });

  it("hasPendingItems is false when no row carries a Pending Item (real reconcile output)", () => {
    const balance = reconcile(
      [{ scnId: "SCN-PDR-001", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [{ qualityCheck: "unit", scnId: "SCN-PDR-001", status: "passed" }],
    );
    expect(hasPendingItems(balance)).toBe(false);
  });

  it("out-of-balance DOMINATES: an out-of-balance run carrying Pending Items exits 1 under --strict, never 3", () => {
    const balance = reconcile(
      [
        { scnId: "SCN-PDR-001", evidenceObligations: [{ qualityCheck: "integration" }] },
        { scnId: "SCN-PDR-002", evidenceObligations: [{ qualityCheck: "unit", pending: true }] },
      ],
      [],
    );
    expect(isBalanced(balance)).toBe(false);
    expect(hasPendingItems(balance)).toBe(true);
    expect(verdictCode({ ledger: balance, strict: true })).toBe(1);
  });
});

describe("[SCN-CLI-019] hasNothingToReconcile — the whole-run predicate for a ledger with no accounts", () => {
  it("is true for the ledger reconcile() emits over a target that declared nothing and produced nothing", () => {
    const empty = reconcile([], []);
    expect(empty.scenarioReconciliations).toEqual([]);
    expect(hasNothingToReconcile(empty)).toBe(true);
  });
});

describe("[SCN-CLI-020] a corpus-less run carrying uncited credits — an ordinary out-of-balance report", () => {
  const corpusLessWithCredits = () =>
    reconcile(
      [],
      [
        { qualityCheck: "unit", scnId: null, status: "passed", locator: "src/widget.test.ts" },
        { qualityCheck: "unit", scnId: null, status: "passed", locator: "src/widget.test.ts" },
      ],
    );

  it("is out of balance, so it reaches the verdict exit 5 would have replaced", () => {
    const ledger = corpusLessWithCredits();
    expect(isBalanced(ledger)).toBe(false);
    expect(hasBrokenEvidence(ledger)).toBe(false);
    expect(hasPendingItems(ledger)).toBe(false);
  });
});
