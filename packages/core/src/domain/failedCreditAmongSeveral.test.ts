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
  const rowNamingCheck: Scenario[] = [
    { scnId: SCN, evidenceObligations: [{ qualityCheck: "fitness" }] },
  ];
  /** A fitness credit citing `SCN`, wired and run; only its handle and verdict vary. */
  const staticCredit = (staticCheck: string, status: "passed" | "failed"): EvidenceObservation => ({
    qualityCheck: "fitness",
    staticCheck,
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
    expect(row.qualityCheckReconciliations.map((i) => [i.qualityCheck, i.outcome, i.evidenceObservation])).toEqual([
      ["fitness", "failing", failed],
    ]);
    expect(row.verdict).toBe("out-of-balance");
    expect(isBalanced(ledger)).toBe(false);
  });

  it.each([
    ["passing first", [passing, failed]],
    ["failed first", [failed, passing]],
  ])("reads failing with the two handed to the rule %s", (_order, credits) => {
    const item = reconcileEvidenceObligation(SCN, { qualityCheck: "fitness" }, credits);
    expect([item.outcome, item.evidenceObservation]).toEqual(["failing", failed]);
  });

  it("still reads satisfied when every credit for the check passed", () => {
    const ledger = reconcile(rowNamingCheck, [passing, staticCredit("lint:b", "passed")]);
    expect(isBalanced(ledger)).toBe(true);
  });
});

describe("[SCN-LNT-037] a watermelon fitness credit beside a wired one for the same check reads watermelon, whichever one's locator sorts first", () => {
  const obligation = { qualityCheck: "fitness" } as const;
  const rowNamingCheck: Scenario[] = [{ scnId: SCN, evidenceObligations: [obligation] }];
  /** A fitness credit citing `SCN` that ran and carries no verdict; only its wiring and file vary. */
  const runOf = (enforcedOverRealSource: boolean, locator: string): EvidenceObservation => ({
    qualityCheck: "fitness",
    staticCheck: "lint:alpha",
    scnId: SCN,
    exists: true,
    enforcedOverRealSource,
    locator,
  });
  const itemOf = (credits: EvidenceObservation[]) => {
    const ledger = reconcile(rowNamingCheck, credits);
    const row = ledger.scenarioReconciliations.find((r) => r.scnId === SCN)!;
    const item = row.qualityCheckReconciliations.find((i) => i.qualityCheck === "fitness")!;
    return { outcome: item.outcome, carried: item.evidenceObservation, verdict: row.verdict, balanced: isBalanced(ledger) };
  };

  it.each([
    ["the wired run's file sorts first", runOf(true, "a.feature"), runOf(false, "z.feature")],
    ["the severed run's file sorts first", runOf(true, "z.feature"), runOf(false, "a.feature")],
  ])("reads watermelon, carrying the severed credit, with the row and the run out of balance, when %s", (_order, wired, severed) => {
    // THE MEASURED FALSE GREEN (3F-3552): wired at `a.feature`, severed at `z.feature`. First-match
    // read the wired credit, `satisfied`, balanced — the severed run vouched for by its sibling.
    expect(itemOf([wired, severed])).toEqual({ outcome: "watermelon", carried: severed, verdict: "out-of-balance", balanced: false });
  });

  it.each([
    ["wired first", [runOf(true, "m.feature"), runOf(false, "m.feature")]],
    ["severed first", [runOf(false, "m.feature"), runOf(true, "m.feature")]],
  ])("reads watermelon, carrying the severed credit, with the two handed to the rule %s", (_order, credits) => {
    // NO EVIDENCE ORDER IN BETWEEN: the rule itself, on whatever order it is handed.
    const item = reconcileEvidenceObligation(SCN, obligation, credits);
    expect([item.outcome, item.evidenceObservation]).toEqual(["watermelon", runOf(false, "m.feature")]);
  });

  it("still reads satisfied when every run of the check is wired", () => {
    // The control: the rule reads watermelon over a severed run, never over plurality.
    expect(itemOf([runOf(true, "z.feature"), runOf(true, "a.feature")])).toEqual({
      outcome: "satisfied",
      carried: runOf(true, "a.feature"),
      verdict: "balanced",
      balanced: true,
    });
  });
});

describe("[SCN-LNT-038] a failed fitness credit beside a watermelon one for the same check reads failing, whichever one's locator sorts first", () => {
  const obligation = { qualityCheck: "fitness" } as const;
  const rowNamingCheck: Scenario[] = [{ scnId: SCN, evidenceObligations: [obligation] }];
  /** A wired run of the check whose own verdict is a failure. */
  const failedRun = (locator: string): EvidenceObservation => ({
    qualityCheck: "fitness",
    staticCheck: "lint:alpha",
    scnId: SCN,
    exists: true,
    enforcedOverRealSource: true,
    status: "failed",
    locator,
  });
  /** A severed run of the check carrying no verdict: on its own, a watermelon. */
  const severedRun = (locator: string): EvidenceObservation => ({
    qualityCheck: "fitness",
    staticCheck: "lint:alpha",
    scnId: SCN,
    exists: true,
    enforcedOverRealSource: false,
    locator,
  });

  it.each([
    ["the failed run's file sorts first", failedRun("a.feature"), severedRun("z.feature")],
    ["the severed run's file sorts first", failedRun("z.feature"), severedRun("a.feature")],
  ])("reads failing, carrying the failed credit, with the row and the run out of balance, when %s", (_order, failed, severed) => {
    // THE RULED ORDER (3F-3552): failing outranks watermelon, the same order one credit's own ladder
    // asks in (@SCN-LNT-028) — so a failed run does not read watermelon because a severed one sits beside it.
    const ledger = reconcile(rowNamingCheck, [severed, failed]);
    const row = ledger.scenarioReconciliations.find((r) => r.scnId === SCN)!;
    const item = row.qualityCheckReconciliations.find((i) => i.qualityCheck === "fitness")!;
    expect([item.outcome, item.evidenceObservation, row.verdict, isBalanced(ledger)]).toEqual([
      "failing",
      failed,
      "out-of-balance",
      false,
    ]);
  });

  it.each([
    ["failed first", [failedRun("m.feature"), severedRun("m.feature")]],
    ["severed first", [severedRun("m.feature"), failedRun("m.feature")]],
  ])("reads failing, carrying the failed credit, with the two handed to the rule %s", (_order, credits) => {
    const item = reconcileEvidenceObligation(SCN, obligation, credits);
    expect([item.outcome, item.evidenceObservation]).toEqual(["failing", failedRun("m.feature")]);
  });
});
