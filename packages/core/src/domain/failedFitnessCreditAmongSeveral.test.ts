import { describe, it, expect } from "vitest";

import { reconcile } from "./evidenceReconciliation.js";
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
});
