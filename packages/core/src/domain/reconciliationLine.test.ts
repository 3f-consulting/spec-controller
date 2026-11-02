import { describe, it, expect } from "vitest";
import { reconcile } from "./evidenceReconciliation.js";
import { reconcilingItemsOf, UNNAMED_CLAIM_ID } from "./claimReconciliation.js";
import type { ClaimReconciliation } from "./claimReconciliation.js";
import { brokenItemsOf, hasBrokenEvidence, isBalanced, ledgerTally } from "./ledger.js";
import type { Ledger } from "./ledger.js";
import type { EvidenceObservation, QualityCheckKind, Scenario } from "./journal.js";
import type { QualityCheckReconciliation } from "./qualityCheckReconciliation.js";

const SCN = "SCN-AAA-001";

const unit = (status: "passed" | "failed", locator: string): EvidenceObservation => ({
  qualityCheckKind: "unit",
  scnId: SCN,
  status,
  locator,
});
const brokenUnit = (locator: string): EvidenceObservation => ({
  qualityCheckKind: "unit",
  scnId: SCN,
  status: "failed",
  broken: true,
  locator,
});

function rowOf(ledger: Ledger, claim: string): ClaimReconciliation {
  return ledger.claimReconciliations.find((row) => row.claim === claim)!;
}

function qcrOf(row: ClaimReconciliation, qualityCheckKind: QualityCheckKind): QualityCheckReconciliation[] {
  return row.qualityCheckReconciliations.filter((qcr) => qcr.qualityCheckKind === qualityCheckKind);
}

/** The outcomes a reader of the JSON reads off one Quality Check Reconciliation: its own, then each observation's. */
function lineOutcomesOf(qcr: QualityCheckReconciliation): (string | undefined)[] {
  return [
    ...(qcr.outcome === undefined ? [] : [qcr.outcome]),
    ...(qcr.evidenceObservations ?? []).map((o) => o.outcome),
  ];
}

function reconciledOneScenario(observations: EvidenceObservation[], obligations: Scenario["evidenceObligations"] = [{ qualityCheckKind: "unit" }]) {
  const ledger = reconcile([{ scnId: SCN, evidenceObligations: obligations }], observations);
  return { ledger, row: rowOf(ledger, SCN) };
}

describe("[SCN-LDG-047] each evidence observation a quality-check reconciliation holds reads its own outcome, every one counting toward the claim's verdict, and an obligation with none reads one missing line", () => {
  it("reads two satisfied lines for an obligation answered by two passing tests, and the claim balances", () => {
    const { ledger, row } = reconciledOneScenario([unit("passed", "a.test.ts"), unit("passed", "b.test.ts")]);

    expect(qcrOf(row, "unit")).toHaveLength(1);
    expect(qcrOf(row, "unit")[0]).not.toHaveProperty("outcome");
    expect(qcrOf(row, "unit").map(lineOutcomesOf)).toEqual([["satisfied", "satisfied"]]);
    expect(reconcilingItemsOf(row)).toEqual([]);
    expect(row.verdict).toBe("balanced");
    expect(isBalanced(ledger)).toBe(true);
  });

  it("reads satisfied and failing for a passing and a failing test, and only the failing line is a reconciling item", () => {
    const failed = unit("failed", "b.test.ts");
    const { ledger, row } = reconciledOneScenario([unit("passed", "a.test.ts"), failed]);

    expect(qcrOf(row, "unit").map(lineOutcomesOf)).toEqual([["satisfied", "failing"]]);
    expect(reconcilingItemsOf(row)).toEqual([
      { qualityCheckKind: "unit", outcome: "failing", evidenceObligation: { qualityCheckKind: "unit" }, evidenceObservation: { ...failed, outcome: "failing" } },
    ]);
    expect(row.verdict).toBe("out-of-balance");
    expect(isBalanced(ledger)).toBe(false);
  });

  it("reads satisfied and broken for a passing and a broken test, in one reconciliation, out of balance and the run unsound", () => {
    const broken = brokenUnit("b.test.ts");
    const { ledger, row } = reconciledOneScenario([unit("passed", "a.test.ts"), broken]);

    expect(qcrOf(row, "unit").map(lineOutcomesOf)).toEqual([["satisfied", "broken"]]);
    expect(reconcilingItemsOf(row).map((line) => line.outcome)).toEqual(["broken"]);
    expect(row.verdict).toBe("out-of-balance");
    expect(isBalanced(ledger)).toBe(false);
    expect(hasBrokenEvidence(ledger)).toBe(true);
    expect(brokenItemsOf(ledger)).toHaveLength(1);
  });

  it("reads missing and broken for an obligation whose only test is broken", () => {
    const broken = brokenUnit("a.test.ts");
    const { row } = reconciledOneScenario([broken]);

    expect(qcrOf(row, "unit")).toHaveLength(1);
    expect(qcrOf(row, "unit")[0]!.outcome).toBe("missing");
    expect(qcrOf(row, "unit").map(lineOutcomesOf)).toEqual([["missing", "broken"]]);
    expect(reconcilingItemsOf(row).map((line) => line.outcome)).toEqual(["missing", "broken"]);
    expect(row.verdict).toBe("out-of-balance");
  });

  it("reads one missing line for an obligation with no observation", () => {
    const { row } = reconciledOneScenario([]);

    expect(qcrOf(row, "unit")).toEqual([{ qualityCheckKind: "unit", outcome: "missing", evidenceObligation: { qualityCheckKind: "unit" } }]);
    expect(reconcilingItemsOf(row)).toEqual([{ qualityCheckKind: "unit", outcome: "missing", evidenceObligation: { qualityCheckKind: "unit" } }]);
  });

  const fitness = (run: { exists: boolean; enforcedOverRealSource: boolean; status?: "passed" | "failed"; broken?: true }): EvidenceObservation => ({
    qualityCheckKind: "fitness",
    fitnessFunction: "lint:a",
    scnId: SCN,
    ...run,
  });

  it.each([
    ["failed", { exists: true, enforcedOverRealSource: true, status: "failed" as const }, ["failing"]],
    ["enforced over real source", { exists: true, enforcedOverRealSource: true, status: "passed" as const }, ["satisfied"]],
    ["only existing", { exists: true, enforcedOverRealSource: false }, ["watermelon"]],
    ["broken", { exists: false, enforcedOverRealSource: false, broken: true as const }, ["missing", "broken"]],
  ])("reads a fitness observation that %s against its obligation as its own line", (_case, run, lines) => {
    const { row } = reconciledOneScenario([fitness(run)], [{ qualityCheckKind: "fitness" }]);

    expect(qcrOf(row, "fitness").map(lineOutcomesOf)).toEqual([lines]);
    expect(row.verdict).toBe(lines.every((line) => line === "satisfied") ? "balanced" : "out-of-balance");
  });

  it("reads failing and satisfied lines, not one pick, for a failed fitness run beside an enforced one", () => {
    const { row } = reconciledOneScenario(
      [fitness({ exists: true, enforcedOverRealSource: true, status: "failed" }), fitness({ exists: true, enforcedOverRealSource: true, status: "passed" })],
      [{ qualityCheckKind: "fitness" }]
    );

    expect(qcrOf(row, "fitness").map(lineOutcomesOf)).toEqual([["failing", "satisfied"]]);
  });

  it("reads each observation no obligation asks for as its own no-evidence-obligation line, and a broken one as broken", () => {
    const integration = (status: "passed" | "failed", locator: string, broken?: true): EvidenceObservation => ({
      qualityCheckKind: "integration",
      scnId: SCN,
      status,
      locator,
      ...(broken ? { broken } : {}),
    });
    const { row } = reconciledOneScenario([
      unit("passed", "a.test.ts"),
      integration("passed", "a.feature"),
      integration("failed", "b.feature"),
      integration("failed", "c.feature", true),
    ]);

    expect(qcrOf(row, "integration")).toHaveLength(1);
    expect(qcrOf(row, "integration").map(lineOutcomesOf)).toEqual([["no-evidence-obligation", "no-evidence-obligation", "broken"]]);
    expect(reconcilingItemsOf(row).map((line) => line.outcome)).toEqual(["no-evidence-obligation", "no-evidence-obligation", "broken"]);
  });

  it("reads each observation on a phantom claim as its own cites-unknown-scenario line", () => {
    const phantom = (locator: string): EvidenceObservation => ({ qualityCheckKind: "unit", scnId: "SCN-PHM-999", status: "passed", locator });
    const ledger = reconcile([], [phantom("a.test.ts"), phantom("b.test.ts")]);
    const row = rowOf(ledger, "SCN-PHM-999");

    expect(qcrOf(row, "unit").map(lineOutcomesOf)).toEqual([["cites-unknown-scenario", "cites-unknown-scenario"]]);
    expect(reconcilingItemsOf(row).map((line) => line.outcome)).toEqual(["cites-unknown-scenario", "cites-unknown-scenario"]);
  });

  it("reads each observation on the unnamed claim as its own cites-no-scenario line, and a broken one as broken, in one reconciliation per kind of quality check", () => {
    const uncited = (locator: string, broken?: true): EvidenceObservation => ({
      qualityCheckKind: "unit",
      scnId: null,
      status: broken ? "failed" : "passed",
      locator,
      ...(broken ? { broken } : {}),
    });
    const ledger = reconcile([], [uncited("a.test.ts"), uncited("b.test.ts"), uncited("c.test.ts", true)]);
    const row = rowOf(ledger, UNNAMED_CLAIM_ID);

    expect(qcrOf(row, "unit").map(lineOutcomesOf)).toEqual([["cites-no-scenario", "cites-no-scenario", "broken"]]);
    expect(reconcilingItemsOf(row).map((line) => line.outcome)).toEqual(["cites-no-scenario", "cites-no-scenario", "broken"]);
  });

  it("reads a pending kind of quality check's observation as one no-evidence-obligation line beside the Pending Item", () => {
    const observation: EvidenceObservation = { qualityCheckKind: "integration", scnId: SCN, status: "passed", locator: "a.feature" };
    const { row } = reconciledOneScenario([observation], [{ qualityCheckKind: "integration", pending: true }]);

    expect(row.pendingItems).toEqual([{ qualityCheckKind: "integration" }]);
    expect(row.qualityCheckReconciliations.map(lineOutcomesOf)).toEqual([["no-evidence-obligation"]]);
    expect(reconcilingItemsOf(row)).toEqual([
      { qualityCheckKind: "integration", outcome: "no-evidence-obligation", evidenceObservation: { ...observation, outcome: "no-evidence-obligation" } },
    ]);
    expect(row.verdict).toBe("out-of-balance");
  });

  it("reads one line for a scenario with no @SCN, for a shared code's kind of quality check, and for a scenario with neither side", () => {
    const ledger = reconcile(
      [
        { scnId: "SCN-DUP-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
        { scnId: "SCN-DUP-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
        { scnId: "SCN-NON-001", evidenceObligations: [] },
      ],
      [],
      ["a.feature : untagged"]
    );

    expect(reconcilingItemsOf(rowOf(ledger, "a.feature : untagged")).map((line) => line.outcome)).toEqual(["no-scn-code"]);
    expect(reconcilingItemsOf(rowOf(ledger, "SCN-DUP-001")).map((line) => [line.qualityCheckKind, line.outcome])).toEqual([
      ["unit", "duplicate-scn-code"],
    ]);
    expect(reconcilingItemsOf(rowOf(ledger, "SCN-NON-001")).map((line) => line.outcome)).toEqual(["both-missing"]);
  });

  it("counts lines, not reconciliations, in the summary's total and by-outcome tally", () => {
    const ledger = reconcile(
      [
        { scnId: SCN, evidenceObligations: [{ qualityCheckKind: "unit" }] },
        { scnId: "SCN-BBB-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
      ],
      [
        unit("passed", "a.test.ts"),
        unit("passed", "b.test.ts"),
        { qualityCheckKind: "unit", scnId: "SCN-BBB-001", status: "failed", broken: true, locator: "c.test.ts" },
      ]
    );

    const { total, byOutcome, outOfBalance } = ledgerTally(ledger).reconciliationLines;
    expect(total).toBe(4);
    expect(byOutcome.satisfied).toBe(2);
    expect(byOutcome.missing).toBe(1);
    expect(byOutcome.broken).toBe(1);
    expect(outOfBalance).toBe(2);
  });
});
