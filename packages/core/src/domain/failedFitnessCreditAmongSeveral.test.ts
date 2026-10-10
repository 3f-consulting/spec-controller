import { describe, it, expect } from "vitest";

import { reconcile } from "./evidenceReconciliation.js";
import { reconcileEvidenceObligation } from "./qualityCheckReconciliation.js";
import { isBalanced } from "./ledger.js";
import type { EvidenceObservation, Scenario } from "./journal.js";

const SCN = "SCN-AAA-001";

describe("[SCN-LNT-036] a failed fitness credit beside a passing one for the same check reads failing", () => {
  const rowNamingCheck: Scenario[] = [
    { scnId: SCN, evidenceObligations: [{ qualityCheck: "fitness" }] },
  ];
  const fitnessFunctionCredit = (fitnessFunction: string, status: "passed" | "failed"): EvidenceObservation => ({
    qualityCheck: "fitness",
    fitnessFunction,
    scnId: SCN,
    exists: true,
    enforcedOverRealSource: true,
    status,
  });
  const passing = () => fitnessFunctionCredit("lint:a", "passed");
  const failed = () => fitnessFunctionCredit("lint:b", "failed");

  it("reads failing, carrying the failed credit, with the row and the run out of balance", () => {
    const ledger = reconcile(rowNamingCheck, [passing(), failed()]);
    const row = ledger.scenarioReconciliations.find((r) => r.scnId === SCN)!;
    expect(row.qualityCheckReconciliations.map((i) => [i.qualityCheck, i.outcome, i.evidenceObservation])).toEqual([
      ["fitness", "failing", failed()],
    ]);
    expect(row.verdict).toBe("out-of-balance");
    expect(isBalanced(ledger)).toBe(false);
  });

  it.each([
    ["passing first", [passing, failed]],
    ["failed first", [failed, passing]],
  ])("reads failing with the two handed to the rule %s", (_order, credits) => {
    const item = reconcileEvidenceObligation(SCN, { qualityCheck: "fitness" }, credits.map((c) => c()));
    expect([item.outcome, item.evidenceObservation]).toEqual(["failing", failed()]);
  });

  it("still reads satisfied when every credit for the check passed", () => {
    const ledger = reconcile(rowNamingCheck, [passing(), fitnessFunctionCredit("lint:b", "passed")]);
    expect(isBalanced(ledger)).toBe(true);
  });
});

describe("[SCN-LNT-037] a watermelon fitness credit beside a wired one for the same check reads watermelon, whichever one's locator sorts first", () => {
  const obligation = { qualityCheck: "fitness" } as const;
  const rowNamingCheck: Scenario[] = [{ scnId: SCN, evidenceObligations: [obligation] }];
  const runOf = (enforcedOverRealSource: boolean, locator: string): EvidenceObservation => ({
    qualityCheck: "fitness",
    fitnessFunction: "lint:alpha",
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
    ["the wired run's file sorts first", "a.feature", "z.feature"],
    ["the severed run's file sorts first", "z.feature", "a.feature"],
  ])("reads watermelon, carrying the severed credit, with the row and the run out of balance, when %s", (_order, wiredLocator, severedLocator) => {
    const wired = runOf(true, wiredLocator);
    const severed = runOf(false, severedLocator);
    expect(itemOf([wired, severed])).toEqual({ outcome: "watermelon", carried: severed, verdict: "out-of-balance", balanced: false });
  });

  it.each([
    ["wired first", [true, false]],
    ["severed first", [false, true]],
  ])("reads watermelon, carrying the severed credit, with the two handed to the rule %s", (_order, wiredness) => {
    const credits = wiredness.map((enforcedOverRealSource) => runOf(enforcedOverRealSource, "m.feature"));
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
    fitnessFunction: "lint:alpha",
    scnId: SCN,
    exists: true,
    enforcedOverRealSource: true,
    status: "failed",
    locator,
  });
  const severedRun = (locator: string): EvidenceObservation => ({
    qualityCheck: "fitness",
    fitnessFunction: "lint:alpha",
    scnId: SCN,
    exists: true,
    enforcedOverRealSource: false,
    locator,
  });

  it.each([
    ["the failed run's file sorts first", "a.feature", "z.feature"],
    ["the severed run's file sorts first", "z.feature", "a.feature"],
  ])("reads failing, carrying the failed credit, with the row and the run out of balance, when %s", (_order, failedLocator, severedLocator) => {
    const failed = failedRun(failedLocator);
    const severed = severedRun(severedLocator);
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
    ["failed first", [failedRun, severedRun]],
    ["severed first", [severedRun, failedRun]],
  ])("reads failing, carrying the failed credit, with the two handed to the rule %s", (_order, runs) => {
    const item = reconcileEvidenceObligation(SCN, obligation, runs.map((run) => run("m.feature")));
    expect([item.outcome, item.evidenceObservation]).toEqual(["failing", failedRun("m.feature")]);
  });
});
