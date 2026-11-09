import { describe, it, expect } from "vitest";

import { reconcile } from "./evidenceReconciliation.js";
import { isBalanced } from "./ledger.js";
import { renderMarkdown } from "../assemble/composers.js";
import { outcomeDescription } from "../render/outcomeDescription.js";
import { sampleReportCtx as ctx } from "../render/runContext.test-utils.js";
import { publishedExitCodeOf } from "../render/publishedExitCodes.test-utils.js";
import { reconcilingItemsOf } from "../render/claimReconciliationsTable.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import type { EvidenceObservation, Scenario } from "./journal.js";

const CLAIM_CODE = "CLM-AAA-001";

describe("[CLM-LNT-036] a failed fitness evidence observation beside a passing one for the same check reads a failing line beside a satisfied one, and the ledger is out of balance", () => {
  const rowNamingCheck: Scenario[] = [
    { claimCode: CLAIM_CODE, evidenceObligations: [{ qualityCheckKind: "fitness" }] },
  ];
  const fitnessFunctionObservation = (fitnessFunction: string, status: "passed" | "failed"): EvidenceObservation => ({
    qualityCheckKind: "fitness",
    fitnessFunction,
    claimCode: CLAIM_CODE,
    exists: true,
    enforcedOverRealSource: true,
    status,
  });
  const passing = () => fitnessFunctionObservation("lint:a", "passed");
  const failed = () => fitnessFunctionObservation("lint:b", "failed");

  it("holds both observations in one fitness reconciliation, the passing one a satisfied line and the failed one a failing line, with the row and the run out of balance", () => {
    const ledger = reconcile(rowNamingCheck, [passing(), failed()]);
    const row = ledger.claimReconciliations.find((r) => r.claim === CLAIM_CODE)!;
    expect(row.qualityCheckReconciliations.map((i) => [i.qualityCheckKind, i.outcome, i.evidenceObservations])).toEqual([
      ["fitness", undefined, [{ ...passing(), outcome: "satisfied" }, { ...failed(), outcome: "failing" }]],
    ]);
    expect(row.verdict).toBe("out-of-balance");
    expect(isBalanced(ledger)).toBe(false);
  });
});

describe("[CLM-LNT-037] a cannot-fail fitness evidence observation beside a wired one for the same check reads a cannot-fail line beside a satisfied one, and the ledger is out of balance, whichever one's locator sorts first", () => {
  const obligation = { qualityCheckKind: "fitness" } as const;
  const rowNamingCheck: Scenario[] = [{ claimCode: CLAIM_CODE, evidenceObligations: [obligation] }];
  const runOf = (enforcedOverRealSource: boolean, locator: string): EvidenceObservation => ({
    qualityCheckKind: "fitness",
    fitnessFunction: "lint:alpha",
    claimCode: CLAIM_CODE,
    exists: true,
    enforcedOverRealSource,
    locator,
  });
  const itemOf = (observations: EvidenceObservation[]) => {
    const ledger = reconcile(rowNamingCheck, observations);
    const row = ledger.claimReconciliations.find((r) => r.claim === CLAIM_CODE)!;
    const item = row.qualityCheckReconciliations.find((i) => i.qualityCheckKind === "fitness")!;
    return { outcome: item.outcome, carried: item.evidenceObservations, verdict: row.verdict, balanced: isBalanced(ledger) };
  };

  it.each([
    ["the cannot-fail run's file sorts first", "a.feature", "z.feature"],
    ["the wired run's file sorts first", "z.feature", "a.feature"],
  ])("holds both runs in one fitness reconciliation, a cannot-fail line and a satisfied line in evidence order, with the row and the run out of balance, when %s", (_order, watermelonLocator, wiredLocator) => {
    const watermelon = { ...runOf(false, watermelonLocator), outcome: "cannot-fail" };
    const wired = { ...runOf(true, wiredLocator), outcome: "satisfied" };
    expect(itemOf([runOf(true, wiredLocator), runOf(false, watermelonLocator)])).toEqual({
      outcome: undefined,
      carried: watermelonLocator < wiredLocator ? [watermelon, wired] : [wired, watermelon],
      verdict: "out-of-balance",
      balanced: false,
    });
  });

  it("reads a satisfied line for each run when every run of the check is wired, and the ledger balances", () => {
    expect(itemOf([runOf(true, "z.feature"), runOf(true, "a.feature")])).toEqual({
      outcome: undefined,
      carried: [{ ...runOf(true, "a.feature"), outcome: "satisfied" }, { ...runOf(true, "z.feature"), outcome: "satisfied" }],
      verdict: "balanced",
      balanced: true,
    });
  });
});

describe("[CLM-LNT-038] a failed fitness evidence observation beside a cannot-fail one for the same check reads a failing line and a cannot-fail line, each carrying its own observation, whichever one's locator sorts first", () => {
  const obligation = { qualityCheckKind: "fitness" } as const;
  const rowNamingCheck: Scenario[] = [{ claimCode: CLAIM_CODE, evidenceObligations: [obligation] }];
  const failedRun = (locator: string): EvidenceObservation => ({
    qualityCheckKind: "fitness",
    fitnessFunction: "lint:alpha",
    claimCode: CLAIM_CODE,
    exists: true,
    enforcedOverRealSource: true,
    status: "failed",
    locator,
  });
  const severedRun = (locator: string): EvidenceObservation => ({
    qualityCheckKind: "fitness",
    fitnessFunction: "lint:alpha",
    claimCode: CLAIM_CODE,
    exists: true,
    enforcedOverRealSource: false,
    locator,
  });

  it.each([
    ["the failed run's file sorts first", "a.feature", "z.feature"],
    ["the severed run's file sorts first", "z.feature", "a.feature"],
  ])("reads a failing line carrying the failed run and a cannot-fail line carrying the severed run, in evidence order, and the Markdown row reads both, when %s", (_order, failedLocator, severedLocator) => {
    const failed = { ...failedRun(failedLocator), outcome: "failing" };
    const severed = { ...severedRun(severedLocator), outcome: "cannot-fail" };
    const ledger = reconcile(rowNamingCheck, [severedRun(severedLocator), failedRun(failedLocator)]);
    const row = ledger.claimReconciliations.find((r) => r.claim === CLAIM_CODE)!;
    const item = row.qualityCheckReconciliations.find((i) => i.qualityCheckKind === "fitness")!;
    const failedFirst = failedLocator < severedLocator;
    expect([item.outcome, item.evidenceObservations, row.verdict, isBalanced(ledger)]).toEqual([
      undefined,
      failedFirst ? [failed, severed] : [severed, failed],
      "out-of-balance",
      false,
    ]);
    const lines = (failedFirst ? ["failing", "cannot-fail"] as const : ["cannot-fail", "failing"] as const)
      .map((outcome) => `fitness: ${outcomeDescription(outcome)}`);
    const markdown = renderMarkdown(__er(ledger), ctx, publishedExitCodeOf);
    expect(reconcilingItemsOf(markdown, CLAIM_CODE).map((item, i) => item.startsWith(lines[i]!))).toEqual([true, true]);
  });
});
