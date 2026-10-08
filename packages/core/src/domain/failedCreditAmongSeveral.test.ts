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
