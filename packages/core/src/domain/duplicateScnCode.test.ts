/**
 * @unit for the account-number Rule of features/scn-tags.feature (3F-3609): a code carried by more
 * than one scenario is ONE account, and every quality check on it reads `duplicate-scn-code`.
 *
 * Each describe carries its @SCN id, so a grep of the id returns both halves of the pair. The
 * @integration arms (tests/steps/scnAccounts.steps.ts) drive real Gherkin through the parser and
 * the CLI; these prove `reconcile()` over constructed scenarios.
 */
import { describe, it, expect } from "vitest";
import { reconcile } from "./evidenceReconciliation.js";
import { isBalanced } from "./ledger.js";
import { parseScenarios } from "../parse/scenarios.js";
import type { Ledger, ScenarioReconciliation } from "../model.js";

/** The rows the ledger holds for a code — a real account is `kind: "scenario"`. */
function accountsFor(ledger: Ledger, scnId: string): ScenarioReconciliation[] {
  return ledger.scenarioReconciliations.filter((r) => r.scnId === scnId);
}

describe("[SCN-STG-013] two scenarios in one file sharing an @SCN are one account, reading duplicate-scn-code at every quality check", () => {
  // The second sharer DEFERS an integration check: a pending declaration on the account cannot be
  // attributed to either sharer any more than a credit can, so it reads duplicate-scn-code too.
  const ledger = reconcile(
    [
      { scnId: "SCN-DUP-001", evidenceObligations: [{ qualityCheck: "unit" }] },
      {
        scnId: "SCN-DUP-001",
        evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration", pending: true }],
      },
    ],
    []
  );

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

  it("leaves a code carried once reconciling exactly as before", () => {
    const single = reconcile(
      [{ scnId: "SCN-ONE-001", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [{ qualityCheck: "unit", scnId: "SCN-ONE-001", status: "passed", locator: "one.test.ts" }]
    );
    const [account] = accountsFor(single, "SCN-ONE-001");
    expect(account!.qualityCheckReconciliations.map((q) => q.outcome)).toEqual(["satisfied"]);
    expect(isBalanced(single)).toBe(true);
  });
});

describe("[SCN-STG-014] two scenarios in different files sharing an @SCN are one account, reading duplicate-scn-code at every quality check", () => {
  // Two FILES, each read by the real parser on its own, meeting in one corpus the way a target's do.
  const one = "@ONE\nFeature: one\n\n  @unit @SCN-ONE-001\n  Scenario: in one\n    Given a thing\n";
  const two = "@TWO\nFeature: two\n\n  @unit @SCN-ONE-001\n  Scenario: in two\n    Given a thing\n";
  const ledger = reconcile([...parseScenarios(one), ...parseScenarios(two)], []);

  it("holds ONE account for the code across the two files", () => {
    expect(accountsFor(ledger, "SCN-ONE-001")).toHaveLength(1);
  });

  it("reads duplicate-scn-code at every quality check, out of balance", () => {
    const [account] = accountsFor(ledger, "SCN-ONE-001");
    expect(account!.qualityCheckReconciliations.map((q) => q.outcome)).toEqual(["duplicate-scn-code"]);
    expect(account!.verdict).toBe("out-of-balance");
    expect(isBalanced(ledger)).toBe(false);
  });
});

describe("[SCN-STG-015] scenarios sharing a code but naming disjoint quality checks still never balance", () => {
  // Each sharer's OWN check passes. Split into two rows, both would balance — the false green.
  const ledger = reconcile(
    [
      { scnId: "SCN-DIS-001", evidenceObligations: [{ qualityCheck: "unit" }] },
      { scnId: "SCN-DIS-001", evidenceObligations: [{ qualityCheck: "integration" }] },
    ],
    [
      { qualityCheck: "unit", scnId: "SCN-DIS-001", status: "passed", locator: "dis.test.ts" },
      { qualityCheck: "integration", scnId: "SCN-DIS-001", status: "passed", locator: "dis.feature" },
    ]
  );

  it("carries the union of the checks the sharers name, each reading duplicate-scn-code", () => {
    const [account] = accountsFor(ledger, "SCN-DIS-001");
    expect(account!.qualityCheckReconciliations.map((q) => [q.qualityCheck, q.outcome])).toEqual([
      ["unit", "duplicate-scn-code"],
      ["integration", "duplicate-scn-code"],
    ]);
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
    // At a check NEITHER sharer names — still the account's, still unattributable.
    { qualityCheck: "e2e", scnId: "SCN-CRD-001", status: "passed", locator: "crd-e2e.spec.ts" },
  ] as const;
  const ledger = reconcile(
    [
      { scnId: "SCN-CRD-001", evidenceObligations: [{ qualityCheck: "unit" }] },
      { scnId: "SCN-CRD-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    ],
    [...credits]
  );

  it("posts each citing credit to the one account exactly once", () => {
    const [account] = accountsFor(ledger, "SCN-CRD-001");
    expect(account!.evidenceObservations).toHaveLength(credits.length);
    for (const credit of credits) {
      expect(account!.evidenceObservations.filter((o) => o === credit || (o.qualityCheck !== "fitness" && o.locator === credit.locator))).toHaveLength(1);
    }
  });

  it("posts none of them to any other row", () => {
    const others = ledger.scenarioReconciliations.filter((r) => r.scnId !== "SCN-CRD-001");
    expect(others.flatMap((r) => r.evidenceObservations)).toEqual([]);
  });

  it("attributes none of them — every item on the account reads duplicate-scn-code", () => {
    const [account] = accountsFor(ledger, "SCN-CRD-001");
    expect(new Set(account!.qualityCheckReconciliations.map((q) => q.outcome))).toEqual(
      new Set(["duplicate-scn-code"])
    );
  });
});
