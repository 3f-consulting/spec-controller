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

describe("[SCN-CLI-004] isBalanced — the whole-run balance predicate over the Ledger", () => {
  it("is balanced when every row reconciles with zero reconciling items", () => {
    const reconciliation: Ledger = reconcile(
      [unitScenario("SCN-TGT-001"), unitScenario("SCN-TGT-002")],
      [unitCredit("SCN-TGT-001"), unitCredit("SCN-TGT-002")],
    );
    expect(isBalanced(reconciliation)).toBe(true);
  });

  it("is NOT balanced when a scenario carries an out-of-balance reconciling item", () => {
    const reconciliation: Ledger = reconcile(
      [unitScenario("SCN-TGT-001"), { scnId: "SCN-TGT-002", evidenceObligations: [{ qualityCheck: "integration" }] }],
      [unitCredit("SCN-TGT-001")],
    );
    expect(isBalanced(reconciliation)).toBe(false);
  });

  it("is NOT balanced for a WATERMELON-ONLY run — every scenario balanced, yet a no-evidence-obligation static-check sits in the suspense row", () => {
    const reconciliation: Ledger = reconcile(
      [unitScenario("SCN-TGT-001"), unitScenario("SCN-TGT-002")],
      [
        unitCredit("SCN-TGT-001"),
        unitCredit("SCN-TGT-002"),
        { qualityCheck: "fitness", staticCheck: "guard:static", exists: true, enforcedOverRealSource: true },
      ],
    );
    expect(isBalanced(reconciliation)).toBe(false);
  });

  it("is NOT balanced when only a phantom-scenario row (a credit citing a phantom @SCN) is out-of-balance", () => {
    const reconciliation: Ledger = reconcile(
      [unitScenario("SCN-TGT-001")],
      [unitCredit("SCN-TGT-001"), unitCredit("SCN-PHM-999")],
    );
    expect(isBalanced(reconciliation)).toBe(false);
  });
});

describe("[SCN-CLI-005] isBalanced — the positive boundary: a clean all-balanced run is not reded", () => {
  it("is balanced for a clean run (every scenario row balanced, no suspense or phantom row) → isBalanced true", () => {
    const reconciliation: Ledger = reconcile(
      [unitScenario("SCN-TGT-001"), unitScenario("SCN-TGT-002")],
      [unitCredit("SCN-TGT-001"), unitCredit("SCN-TGT-002")],
    );
    expect(isBalanced(reconciliation)).toBe(true);
  });

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

  it("--strict escalates an otherwise-balanced run carrying Pending Items to exit 3", () => {
    const balance = reconcile(
      [
        { scnId: "SCN-PDR-001", evidenceObligations: [{ qualityCheck: "integration", pending: true }] },
        { scnId: "SCN-PDR-002", evidenceObligations: [{ qualityCheck: "unit", pending: true }] },
      ],
      [],
    );
    expect(isBalanced(balance)).toBe(true);
    expect(hasPendingItems(balance)).toBe(true);
    expect(verdictCode({ ledger: balance, strict: true })).toBe(3);
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

  it("a balanced run with NO Pending Items stays 0 even under --strict (the escalation does not over-fire)", () => {
    const balance = reconcile(
      [{ scnId: "SCN-PDR-001", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [{ qualityCheck: "unit", scnId: "SCN-PDR-001", status: "passed" }],
    );
    expect(isBalanced(balance)).toBe(true);
    expect(hasPendingItems(balance)).toBe(false);
    expect(verdictCode({ ledger: balance, strict: true })).toBe(0);
  });
});

describe("[SCN-CLI-019] hasNothingToReconcile — the whole-run predicate for a ledger with no accounts", () => {
  it("is true for the ledger reconcile() emits over a target that declared nothing and produced nothing", () => {
    const empty = reconcile([], []);
    expect(empty.scenarioReconciliations).toEqual([]);
    expect(hasNothingToReconcile(empty)).toBe(true);
  });

  it("is the ONLY predicate that separates an empty ledger from a balanced one: the other three read it as a pass", () => {
    const empty = reconcile([], []);
    expect(isBalanced(empty)).toBe(true);
    expect(hasPendingItems(empty)).toBe(false);
    expect(hasBrokenEvidence(empty)).toBe(false);
    expect(hasNothingToReconcile(empty)).toBe(true);

    const balanced = reconcile(
      [{ scnId: "SCN-NTR-001", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [{ qualityCheck: "unit", scnId: "SCN-NTR-001", status: "passed" }],
    );
    expect(isBalanced(balanced)).toBe(true);
    expect(hasNothingToReconcile(balanced)).toBe(false);
  });

  it("is DERIVED, never stored: the ledger carries no emptiness field", () => {
    const empty = reconcile([], []);
    expect(Object.keys(empty)).toEqual(["scenarioReconciliations"]);
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

  it("has a suspense row, so it is NOT a run with nothing to reconcile", () => {
    const ledger = corpusLessWithCredits();
    expect(ledger.scenarioReconciliations.map((row) => row.kind)).toEqual(["suspense-scenario"]);
    expect(hasNothingToReconcile(ledger)).toBe(false);
  });

  it("is out of balance, so it reaches the verdict exit 5 would have replaced", () => {
    const ledger = corpusLessWithCredits();
    expect(isBalanced(ledger)).toBe(false);
    expect(hasBrokenEvidence(ledger)).toBe(false);
    expect(hasPendingItems(ledger)).toBe(false);
  });

  it("differs from the empty run ONLY in its credits: the same empty corpus, the opposite verdict", () => {
    const declaredNothingProducedNothing = reconcile([], []);
    expect(hasNothingToReconcile(declaredNothingProducedNothing)).toBe(true);
    expect(hasNothingToReconcile(corpusLessWithCredits())).toBe(false);
  });
});
