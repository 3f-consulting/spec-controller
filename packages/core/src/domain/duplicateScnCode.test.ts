import { describe, it, expect, beforeEach } from "vitest";
import { reconcile } from "./evidenceReconciliation.js";
import { isBalanced } from "./ledger.js";
import { parseScenarios } from "../parse/scenarios.js";
import type { Ledger, ScenarioReconciliation } from "../model.js";

function accountsFor(ledger: Ledger, scnId: string): ScenarioReconciliation[] {
  return ledger.scenarioReconciliations.filter((r) => r.scnId === scnId);
}

describe("[SCN-STG-013] two scenarios in one file sharing an @SCN are one account, reading duplicate-scn-code at every quality check", () => {
  let ledger: Ledger;
  beforeEach(() => {
    ledger = reconcile(
      [
        { scnId: "SCN-DUP-001", evidenceObligations: [{ qualityCheck: "unit" }] },
        {
          scnId: "SCN-DUP-001",
          evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration", pending: true }],
        },
      ],
      []
    );
  });

  it("holds ONE real account for the code, never one row per scenario", () => {
    const accounts = accountsFor(ledger, "SCN-DUP-001");
    expect(accounts).toHaveLength(1);
    expect(accounts[0]!.kind).toBe("scenario");
  });

  it("reads duplicate-scn-code at every quality check the sharers name, the deferred one included", () => {
    const [account] = accountsFor(ledger, "SCN-DUP-001");
    expect(
      account!.qualityCheckReconciliations.map((q) => [q.qualityCheck, q.outcome])
    ).toEqual([
      ["unit", "duplicate-scn-code"],
      ["integration", "duplicate-scn-code"],
    ]);
  });

  it("carries no Pending Item — the deferral is as unattributable as a credit", () => {
    const [account] = accountsFor(ledger, "SCN-DUP-001");
    expect(account!.pendingItems).toEqual([]);
  });

  it("is out of balance, and so is the run", () => {
    const [account] = accountsFor(ledger, "SCN-DUP-001");
    expect(account!.verdict).toBe("out-of-balance");
    expect(isBalanced(ledger)).toBe(false);
  });

  it("with no quality check named at all, carries ONE duplicate-scn-code sub-row, never both-missing", () => {
    const bare = reconcile(
      [
        { scnId: "SCN-DUP-002", evidenceObligations: [] },
        { scnId: "SCN-DUP-002", evidenceObligations: [] },
      ],
      []
    );
    const accounts = accountsFor(bare, "SCN-DUP-002");
    expect(accounts).toHaveLength(1);
    expect(accounts[0]!.qualityCheckReconciliations.map((q) => q.outcome)).toEqual([
      "duplicate-scn-code",
    ]);
    expect(accounts[0]!.verdict).toBe("out-of-balance");
  });
});

describe("[SCN-STG-014] two scenarios in different files sharing an @SCN are one account, reading duplicate-scn-code at every quality check", () => {
  const one = "@ONE\nFeature: one\n\n  @unit @SCN-ONE-001\n  Scenario: in one\n    Given a thing\n";
  const two = "@TWO\nFeature: two\n\n  @unit @SCN-ONE-001\n  Scenario: in two\n    Given a thing\n";
  let ledger: Ledger;
  beforeEach(() => {
    ledger = reconcile([...parseScenarios(one), ...parseScenarios(two)], []);
  });

  it("reads duplicate-scn-code at every quality check, out of balance", () => {
    const [account] = accountsFor(ledger, "SCN-ONE-001");
    expect(account!.qualityCheckReconciliations.map((q) => q.outcome)).toEqual(["duplicate-scn-code"]);
    expect(account!.verdict).toBe("out-of-balance");
    expect(isBalanced(ledger)).toBe(false);
  });
});

describe("[SCN-STG-015] scenarios sharing a code but naming disjoint quality checks still never balance", () => {
  let ledger: Ledger;
  beforeEach(() => {
    ledger = reconcile(
      [
        { scnId: "SCN-DIS-001", evidenceObligations: [{ qualityCheck: "unit" }] },
        { scnId: "SCN-DIS-001", evidenceObligations: [{ qualityCheck: "integration" }] },
      ],
      [
        { qualityCheck: "unit", scnId: "SCN-DIS-001", status: "passed", locator: "dis.test.ts" },
        { qualityCheck: "integration", scnId: "SCN-DIS-001", status: "passed", locator: "dis.feature" },
      ]
    );
  });

  it("never balances, though every check has passing evidence", () => {
    const [account] = accountsFor(ledger, "SCN-DIS-001");
    expect(account!.verdict).toBe("out-of-balance");
    expect(isBalanced(ledger)).toBe(false);
  });
});

describe("[SCN-STG-016] every credit citing a duplicated code posts to its one account, none dropped, none doubled, none attributed by position", () => {
  const credits = [
    { qualityCheck: "unit", scnId: "SCN-CRD-001", status: "passed", locator: "crd-pass.test.ts" },
    { qualityCheck: "unit", scnId: "SCN-CRD-001", status: "failed", locator: "crd-fail.test.ts" },
    { qualityCheck: "e2e", scnId: "SCN-CRD-001", status: "passed", locator: "crd-e2e.spec.ts" },
  ] as const;
  let ledger: Ledger;
  beforeEach(() => {
    ledger = reconcile(
      [
        { scnId: "SCN-CRD-001", evidenceObligations: [{ qualityCheck: "unit" }] },
        { scnId: "SCN-CRD-001", evidenceObligations: [{ qualityCheck: "unit" }] },
      ],
      [...credits]
    );
  });

  it("attributes none of them — every item on the account reads duplicate-scn-code", () => {
    const [account] = accountsFor(ledger, "SCN-CRD-001");
    expect(new Set(account!.qualityCheckReconciliations.map((q) => q.outcome))).toEqual(
      new Set(["duplicate-scn-code"])
    );
  });
});
