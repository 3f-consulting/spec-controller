/**
 * @unit for an evidence obligation answered by several credits that disagree (3F-3547) — a failed
 * credit reads `failing` whatever passed beside it and wherever it sorts, and the item names a credit
 * that FAILED.
 *
 * Bidirectional evidence: each describe carries its @SCN id, matching features/ledger.feature
 * (@SCN-LDG-036/037), features/fitness-reconciliation.feature (@SCN-LNT-036) and the @integration
 * steps in tests/steps/failedCreditAmongSeveral.steps.ts.
 *
 * TWO LEVELS, ON PURPOSE. `reconcile` reads every credit in evidence order first, so a test at that
 * level cannot tell a rule that reads the failed credit from one that reads whichever sorts first
 * when the order happens to agree. `reconcileEvidenceObligation` takes the credits as it is handed
 * them, so the arrival-order arms below ask the per-obligation rule itself.
 */

import { describe, it, expect } from "vitest";

import { reconcile } from "./evidenceReconciliation.js";
import { reconcileEvidenceObligation } from "./qualityCheckReconciliation.js";
import { isBalanced } from "./ledger.js";
import type { EvidenceObservation, Scenario } from "./journal.js";

const SCN = "SCN-AAA-001";

const rowRaisingUnit: Scenario[] = [{ scnId: SCN, evidenceObligations: [{ qualityCheck: "unit" }] }];

const unitCredit = (locator: string, status: "passed" | "failed"): EvidenceObservation => ({
  qualityCheck: "unit",
  scnId: SCN,
  status,
  locator,
});

/** The row's unit item as `outcome` + the file and status of the credit it carries. */
const unitItemOf = (credits: EvidenceObservation[]) => {
  const ledger = reconcile(rowRaisingUnit, credits);
  const row = ledger.scenarioReconciliations.find((r) => r.scnId === SCN)!;
  const item = row.qualityCheckReconciliations.find((i) => i.qualityCheck === "unit")!;
  const carried = item.evidenceObservation as { locator?: string; status?: string } | undefined;
  return {
    outcome: item.outcome,
    carried: `${carried?.locator}=${carried?.status}`,
    verdict: row.verdict,
    balanced: isBalanced(ledger),
  };
};

describe("[SCN-LDG-036] a failing test in a file that sorts after a passing one citing the same scenario reads failing", () => {
  it("reads failing, carrying the failed credit, with the row and the run out of balance", () => {
    // THE MEASURED FALSE GREEN, as a pin: `a.test.ts` sorts first and passes, `z.test.ts` sorts last
    // and fails. First-match read `a.test.ts`, `satisfied`, balanced.
    expect(
      unitItemOf([unitCredit("a.test.ts", "passed"), unitCredit("z.test.ts", "failed")])
    ).toEqual({ outcome: "failing", carried: "z.test.ts=failed", verdict: "out-of-balance", balanced: false });
  });

  it("reads the same whichever order the runner reported the two files in", () => {
    expect(
      unitItemOf([unitCredit("z.test.ts", "failed"), unitCredit("a.test.ts", "passed")])
    ).toEqual({ outcome: "failing", carried: "z.test.ts=failed", verdict: "out-of-balance", balanced: false });
  });

  it("names the first failed credit in evidence order when more than one failed", () => {
    // Design's call (3F-3547): the item names the first FAILED credit in the order the books read
    // evidence in, so a reader is sent to a test that failed, and the choice is deterministic.
    expect(
      unitItemOf([
        unitCredit("z.test.ts", "failed"),
        unitCredit("a.test.ts", "passed"),
        unitCredit("m.test.ts", "failed"),
      ]).carried
    ).toBe("m.test.ts=failed");
  });

  it("still reads satisfied, naming the first credit, when every test citing it passed", () => {
    // The control: the rule reads failing over a failure, never over plurality.
    expect(
      unitItemOf([unitCredit("z.test.ts", "passed"), unitCredit("a.test.ts", "passed")])
    ).toEqual({ outcome: "satisfied", carried: "a.test.ts=passed", verdict: "balanced", balanced: true });
  });
});

describe("[SCN-LDG-037] a passing and a failing test in one file citing the same scenario read failing, whichever order the two credits arrive in", () => {
  const passed = unitCredit("m.test.ts", "passed");
  const failed = unitCredit("m.test.ts", "failed");

  it.each([
    ["passed first", [passed, failed]],
    ["failed first", [failed, passed]],
  ])("reads failing, carrying the failed credit, with the two handed to the rule %s", (_order, credits) => {
    // NO EVIDENCE ORDER IN BETWEEN. Through `reconcile` the failed credit always reads first, because
    // its serialised content sorts "failed" before "passed" — an accident of spelling. Here nothing
    // sorts, so a first-match rule reads `satisfied` on the passed-first order.
    const item = reconcileEvidenceObligation(SCN, { qualityCheck: "unit" }, credits);
    expect([item.outcome, item.evidenceObservation]).toEqual(["failing", failed]);
  });

  it("puts the row and the run out of balance through the reconciliation", () => {
    expect(unitItemOf([passed, failed])).toEqual({
      outcome: "failing",
      carried: "m.test.ts=failed",
      verdict: "out-of-balance",
      balanced: false,
    });
  });

  it("still reads satisfied when both tests in the file passed", () => {
    const item = reconcileEvidenceObligation(SCN, { qualityCheck: "unit" }, [passed, unitCredit("m.test.ts", "passed")]);
    expect(item.outcome).toBe("satisfied");
  });
});

describe("[SCN-LNT-036] a failed fitness credit beside a passing one for the same check reads failing", () => {
  const CHECK = "complexity";
  const rowNamingCheck: Scenario[] = [
    { scnId: SCN, evidenceObligations: [{ qualityCheck: "lint", staticCheck: CHECK }] },
  ];
  /** A static credit for `CHECK` citing `SCN`, wired and run; only its handle and verdict vary. */
  const staticCredit = (staticCheck: string, status: "passed" | "failed"): EvidenceObservation => ({
    qualityCheck: "lint",
    staticCheck,
    checkTag: CHECK,
    scnId: SCN,
    exists: true,
    enforcedOverRealSource: true,
    status,
  });
  const passing = staticCredit("lint:a", "passed");
  const failed = staticCredit("lint:b", "failed");

  it("reads failing, carrying the failed credit, with the row and the run out of balance", () => {
    // `lint:a` reads first in evidence order and passed; first-match read it and balanced.
    const ledger = reconcile(rowNamingCheck, [passing, failed]);
    const row = ledger.scenarioReconciliations.find((r) => r.scnId === SCN)!;
    expect(row.qualityCheckReconciliations.map((i) => [i.staticCheck, i.outcome, i.evidenceObservation])).toEqual([
      [CHECK, "failing", failed],
    ]);
    expect(row.verdict).toBe("out-of-balance");
    expect(isBalanced(ledger)).toBe(false);
  });

  it.each([
    ["passing first", [passing, failed]],
    ["failed first", [failed, passing]],
  ])("reads failing with the two handed to the rule %s", (_order, credits) => {
    const item = reconcileEvidenceObligation(SCN, { qualityCheck: "lint", staticCheck: CHECK }, credits);
    expect([item.outcome, item.evidenceObservation]).toEqual(["failing", failed]);
  });

  it("still reads satisfied when every credit for the check passed", () => {
    const ledger = reconcile(rowNamingCheck, [passing, staticCredit("lint:b", "passed")]);
    expect(isBalanced(ledger)).toBe(true);
  });
});
