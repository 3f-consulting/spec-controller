import { describe, it, expect, beforeEach } from "vitest";
import { reconcile } from "./evidenceReconciliation.js";
import { isBalanced } from "./ledger.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { readTargetCorpus } from "../parse/targetCorpus.js";
import type { Ledger, ClaimReconciliation } from "../model.js";
import type { EvidenceObligation } from "./journal.js";

function accountsFor(ledger: Ledger, claimCode: string): ClaimReconciliation[] {
  return ledger.claimReconciliations.filter((r) => r.claim === claimCode);
}

describe("[CLM-STG-013] two scenarios in one file sharing a claim code are two claims, each reading duplicate-claim-code at every kind of quality check it raises", () => {
  let ledger: Ledger;
  beforeEach(() => {
    ledger = reconcile(
      [
        { claimCode: "CLM-DUP-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
        {
          claimCode: "CLM-DUP-001",
          evidenceObligations: [{ qualityCheckKind: "unit" }, { qualityCheckKind: "integration", pending: true }],
        },
      ],
      []
    );
  });

  it("holds one claim per scenario under the code", () => {
    expect(accountsFor(ledger, "CLM-DUP-001").map((account) => account.kind)).toEqual(["scenario", "scenario"]);
  });

  it("reads duplicate-claim-code at every kind of quality check each scenario raises, the deferred one included", () => {
    expect(
      accountsFor(ledger, "CLM-DUP-001").map((account) =>
        account.qualityCheckReconciliations.map((q) => [q.qualityCheckKind, q.outcome])
      )
    ).toEqual([
      [["unit", "duplicate-claim-code"]],
      [
        ["unit", "duplicate-claim-code"],
        ["integration", "duplicate-claim-code"],
      ],
    ]);
  });

  it("carries no Pending Item on either claim — the deferral is as unattributable as an evidence observation", () => {
    expect(accountsFor(ledger, "CLM-DUP-001").map((account) => account.pendingItems)).toEqual([[], []]);
  });

  it("is out of balance on either claim, and so is the run", () => {
    expect(accountsFor(ledger, "CLM-DUP-001").map((account) => account.verdict)).toEqual(["out-of-balance", "out-of-balance"]);
    expect(isBalanced(ledger)).toBe(false);
  });

  it("with no kind of quality check named at all, carries ONE duplicate-claim-code sub-row on each claim, never no-quality-check", () => {
    const bare = reconcile(
      [
        { claimCode: "CLM-DUP-002", evidenceObligations: [] },
        { claimCode: "CLM-DUP-002", evidenceObligations: [] },
      ],
      []
    );
    const accounts = accountsFor(bare, "CLM-DUP-002");
    expect(accounts.map((account) => account.qualityCheckReconciliations.map((q) => q.outcome))).toEqual([
      ["duplicate-claim-code"],
      ["duplicate-claim-code"],
    ]);
    expect(accounts.map((account) => account.qualityCheckReconciliations.map((q) => q.evidenceObligation))).toEqual([
      [{ qualityCheckKind: null }],
      [{ qualityCheckKind: null }],
    ]);
    expect(accounts.map((account) => account.verdict)).toEqual(["out-of-balance", "out-of-balance"]);
  });
});

describe("[CLM-STG-014] two scenarios in different files sharing a claim code are two claims, each reading duplicate-claim-code at every kind of quality check it raises", () => {
  const one = "@ONE\nFeature: one\n\n  @unit @CLM-ONE-001\n  Scenario: in one\n    Given a thing\n";
  const two = "@TWO\nFeature: two\n\n  @integration @CLM-ONE-001\n  Scenario: in two\n    Given a thing\n";
  let ledger: Ledger;
  beforeEach(() => {
    const corpus = readTargetCorpus(parsedFeatures([one, two], ["features/one.feature", "features/two.feature"]), []);
    ledger = reconcile(corpus.scenarios, []);
  });

  it("holds exactly two claims under the code, each reading duplicate-claim-code at its own kind of quality check and naming its own scenario", () => {
    expect(accountsFor(ledger, "CLM-ONE-001").map((account) => account.qualityCheckReconciliations)).toEqual([
      [{ qualityCheckKind: "unit", outcome: "duplicate-claim-code", evidenceObligation: { qualityCheckKind: "unit" }, scenario: { feature: "features/one.feature", title: "in one" } }],
      [{ qualityCheckKind: "integration", outcome: "duplicate-claim-code", evidenceObligation: { qualityCheckKind: "integration" }, scenario: { feature: "features/two.feature", title: "in two" } }],
    ]);
  });

  it("is out of balance on either claim, and so is the run", () => {
    expect(accountsFor(ledger, "CLM-ONE-001").map((account) => account.verdict)).toEqual(["out-of-balance", "out-of-balance"]);
    expect(isBalanced(ledger)).toBe(false);
  });
});

describe("[CLM-STG-015] scenarios sharing a code but naming disjoint kinds of quality check still never balance, on either claim", () => {
  let ledger: Ledger;
  beforeEach(() => {
    ledger = reconcile(
      [
        { claimCode: "CLM-DIS-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
        { claimCode: "CLM-DIS-001", evidenceObligations: [{ qualityCheckKind: "integration" }] },
      ],
      [
        { qualityCheckKind: "unit", claimCode: "CLM-DIS-001", status: "passed", locator: "dis.test.ts" },
        { qualityCheckKind: "integration", claimCode: "CLM-DIS-001", status: "passed", locator: "dis.feature" },
      ]
    );
  });

  it("never balances on either claim, though every check has passing evidence", () => {
    expect(accountsFor(ledger, "CLM-DIS-001").map((account) => account.verdict)).toEqual(["out-of-balance", "out-of-balance"]);
    expect(isBalanced(ledger)).toBe(false);
  });

  it("reads duplicate-claim-code on each claim at its own kind of quality check only", () => {
    expect(
      accountsFor(ledger, "CLM-DIS-001").map((account) =>
        account.qualityCheckReconciliations.map((q) => [q.qualityCheckKind, q.outcome])
      )
    ).toEqual([[["unit", "duplicate-claim-code"]], [["integration", "duplicate-claim-code"]]]);
  });
});

describe("[CLM-STG-035] the Evidence Obligation a scenario sharing its claim code raises is never deferred, whatever pending or deferral tag it carries", () => {
  type Obligations = readonly EvidenceObligation[];
  it.each<[string, Obligations, Obligations]>([
    ["a pending tag beside a bare kind tag", [{ qualityCheckKind: "unit" }, { qualityCheckKind: "integration", pending: true }], [{ qualityCheckKind: "unit" }]],
    ["a pending tag alone", [{ qualityCheckKind: "integration", pending: true }], [{ qualityCheckKind: "unit" }]],
    ["several pending tags", [{ qualityCheckKind: "unit", pending: true }, { qualityCheckKind: "e2e", pending: true }], [{ qualityCheckKind: "unit" }]],
    ["a pending tag on both sharers", [{ qualityCheckKind: "unit", pending: true }], [{ qualityCheckKind: "integration", pending: true }]],
    ["a deferral tag beside kind tags", [{ qualityCheckKind: "unit", pending: true }, { qualityCheckKind: "integration", pending: true }], [{ qualityCheckKind: "unit" }]],
  ])("with %s, every sharer's obligation names its kind of quality check and no claim carries a Pending Item", (_shape, first, second) => {
    const ledger = reconcile(
      [
        { claimCode: "CLM-PEN-001", evidenceObligations: first },
        { claimCode: "CLM-PEN-001", evidenceObligations: second },
      ],
      []
    );
    const accounts = accountsFor(ledger, "CLM-PEN-001");
    expect(accounts.map((account) => account.qualityCheckReconciliations.map((q) => q.evidenceObligation))).toEqual(
      [first, second].map((obligations) => obligations.map(({ qualityCheckKind }) => ({ qualityCheckKind })))
    );
    expect(accounts.map((account) => account.pendingItems)).toEqual([[], []]);
  });
});
