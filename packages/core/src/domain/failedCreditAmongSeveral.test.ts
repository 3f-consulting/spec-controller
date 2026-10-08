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
  it.each([
    [
      "reads failing, carrying the failed credit, with the row and the run out of balance",
      [unitCredit("a.test.ts", "passed"), unitCredit("z.test.ts", "failed")],
      { outcome: "failing", carried: "z.test.ts=failed", verdict: "out-of-balance", balanced: false },
    ],
    [
      "reads the same whichever order the runner reported the two files in",
      [unitCredit("z.test.ts", "failed"), unitCredit("a.test.ts", "passed")],
      { outcome: "failing", carried: "z.test.ts=failed", verdict: "out-of-balance", balanced: false },
    ],
    [
      "still reads satisfied, naming the first credit, when every test citing it passed",
      [unitCredit("z.test.ts", "passed"), unitCredit("a.test.ts", "passed")],
      { outcome: "satisfied", carried: "a.test.ts=passed", verdict: "balanced", balanced: true },
    ],
  ])("%s", (_title, credits, expected) => {
    expect(unitItemOf(credits)).toEqual(expected);
  });

  it("names the first failed credit in evidence order when more than one failed", () => {
    expect(
      unitItemOf([
        unitCredit("z.test.ts", "failed"),
        unitCredit("a.test.ts", "passed"),
        unitCredit("m.test.ts", "failed"),
      ]).carried
    ).toBe("m.test.ts=failed");
  });
});

describe("[SCN-LDG-037] a passing and a failing test in one file citing the same scenario read failing, whichever order the two credits arrive in", () => {
  const passed = unitCredit("m.test.ts", "passed");
  const failed = unitCredit("m.test.ts", "failed");

  it.each([
    ["passed first", [passed, failed]],
    ["failed first", [failed, passed]],
  ])("reads failing, carrying the failed credit, with the two handed to the rule %s", (_order, credits) => {
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
    expect(itemOf([wired, severed])).toEqual({ outcome: "watermelon", carried: severed, verdict: "out-of-balance", balanced: false });
  });

  it.each([
    ["wired first", [runOf(true, "m.feature"), runOf(false, "m.feature")]],
    ["severed first", [runOf(false, "m.feature"), runOf(true, "m.feature")]],
  ])("reads watermelon, carrying the severed credit, with the two handed to the rule %s", (_order, credits) => {
    const item = reconcileEvidenceObligation(SCN, obligation, credits);
    expect([item.outcome, item.evidenceObservation]).toEqual(["watermelon", runOf(false, "m.feature")]);
  });

  it("still reads satisfied when every run of the check is wired", () => {
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
  const failedRun = (locator: string): EvidenceObservation => ({
    qualityCheck: "fitness",
    staticCheck: "lint:alpha",
    scnId: SCN,
    exists: true,
    enforcedOverRealSource: true,
    status: "failed",
    locator,
  });
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
