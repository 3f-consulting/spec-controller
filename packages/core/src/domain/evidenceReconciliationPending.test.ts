import { describe, it, expect } from "vitest";
import { linesOf, reconcilingItemsOf } from "./claimReconciliation.js";
import { reconcile } from "./evidenceReconciliation.js";
import { isBalanced } from "./ledger.js";
import type {
  Scenario,
  EvidenceObservation,
} from "../model.js";
import { parseCucumberEvidenceObservations, type CucumberJsonReport } from "../parse/cucumber.js";

describe("[CLM-PND-004] a named-pending obligation reconciles as a one-sided Pending Item, never a reconciling item", () => {
  it("keeps the bare (non-pending) obligation reconciling while partitioning the pending one off (mixed scenario)", () => {
    const scenarios: Scenario[] = [
      {
        claimCode: "CLM-PND-004",
        evidenceObligations: [
          { qualityCheckKind: "unit" },
          { qualityCheckKind: "integration", pending: true },
        ],
      },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheckKind: "unit", claimCode: "CLM-PND-004", status: "passed" },
    ];

    const balance = reconcile(scenarios, evidenceObservations);
    const scenario = balance.claimReconciliations.find((s) => s.claim === "CLM-PND-004");

    expect(scenario?.qualityCheckReconciliations).toEqual([
      { qualityCheckKind: "unit", evidenceObligation: { qualityCheckKind: "unit" }, evidenceObservations: [{ qualityCheckKind: "unit", claimCode: "CLM-PND-004", status: "passed", outcome: "satisfied" }] },
    ]);
    expect(scenario?.pendingItems).toEqual([{ qualityCheckKind: "integration" }]);
    expect(reconcilingItemsOf(scenario!)).toEqual([]);
  });
});

describe("[CLM-PND-005] the pending deferral governs even when a matching observation exists — the Pending Item is raised, the observation IS not-asked-for", () => {
  it("raises the Pending Item and posts the matching observation as not-asked-for (obligation never satisfied; the row reds via the evidence observation)", () => {
    const scenarios: Scenario[] = [
      {
        claimCode: "CLM-PND-005",
        evidenceObligations: [{ qualityCheckKind: "integration", pending: true }],
      },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheckKind: "integration", claimCode: "CLM-PND-005", status: "passed" },
    ];

    const balance = reconcile(scenarios, evidenceObservations);
    const scenario = balance.claimReconciliations.find((s) => s.claim === "CLM-PND-005");

    expect(scenario?.pendingItems).toEqual([{ qualityCheckKind: "integration" }]);
    expect(scenario?.qualityCheckReconciliations.flatMap(linesOf).some((line) => line.outcome === "satisfied")).toBe(false);
    const noEvidenceObligation = balance.claimReconciliations.flatMap((s) =>
      reconcilingItemsOf(s).filter((r) => r.outcome === "not-asked-for")
    );
    expect(noEvidenceObligation).toEqual([{ qualityCheckKind: "integration", outcome: "not-asked-for", evidenceObservation: { qualityCheckKind: "integration", claimCode: "CLM-PND-005", status: "passed", outcome: "not-asked-for" } }]);
    expect(scenario?.verdict).toBe("out-of-balance");
    expect(reconcilingItemsOf(scenario!)).toEqual([
      { qualityCheckKind: "integration", outcome: "not-asked-for", evidenceObservation: { qualityCheckKind: "integration", claimCode: "CLM-PND-005", status: "passed", outcome: "not-asked-for" } },
    ]);
    expect(isBalanced(balance)).toBe(false);
    expect(balance.claimReconciliations.every((s) => s.kind === "scenario")).toBe(true);
  });
});

describe("[CLM-PND-006] a Pending Item is not a Reconciling Item — a structurally distinct category, never an error", () => {
  it("keeps the deferred obligation out of the reconciling/error list even when a genuine error is present", () => {
    const scenarios: Scenario[] = [
      {
        claimCode: "CLM-PND-006",
        evidenceObligations: [
          { qualityCheckKind: "unit" },
          { qualityCheckKind: "integration", pending: true },
        ],
      },
    ];
    const balance = reconcile(scenarios, []);
    const scenario = balance.claimReconciliations.find((s) => s.claim === "CLM-PND-006");

    expect(reconcilingItemsOf(scenario!)).toEqual([
      { qualityCheckKind: "unit", outcome: "missing", evidenceObligation: { qualityCheckKind: "unit" } },
    ]);
    expect(
      reconcilingItemsOf(scenario!).some((r) => r.qualityCheckKind === "integration")
    ).toBe(false);
    expect(
      scenario?.qualityCheckReconciliations.some((r) => r.qualityCheckKind === "integration")
    ).toBe(false);
    expect(scenario?.pendingItems).toEqual([{ qualityCheckKind: "integration" }]);
  });
});

describe("[CLM-PND-007] a scenario whose only exception is a Pending Item has verdict balanced", () => {

  it("balances a scenario carrying a passing unit obligation alongside a deferred integration one", () => {
    const scenarios: Scenario[] = [
      {
        claimCode: "CLM-PND-007",
        evidenceObligations: [
          { qualityCheckKind: "unit" },
          { qualityCheckKind: "integration", pending: true },
        ],
      },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheckKind: "unit", claimCode: "CLM-PND-007", status: "passed" },
    ];
    const balance = reconcile(scenarios, evidenceObservations);
    const scenario = balance.claimReconciliations.find((s) => s.claim === "CLM-PND-007");

    expect(scenario?.verdict).toBe("balanced");
    expect(reconcilingItemsOf(scenario!)).toEqual([]);
    expect(scenario?.qualityCheckReconciliations).toEqual([{ qualityCheckKind: "unit", evidenceObligation: { qualityCheckKind: "unit" }, evidenceObservations: [{ qualityCheckKind: "unit", claimCode: "CLM-PND-007", status: "passed", outcome: "satisfied" }] }]);
    expect(scenario?.pendingItems).toEqual([{ qualityCheckKind: "integration" }]);
  });
});

describe("[CLM-PND-009] a @unit @integrationpending scenario with a passing unit observation is balanced with one Pending Item", () => {
  it("reconciles the unit obligation satisfied and partitions the integration one to a Pending Item", () => {
    const scenarios: Scenario[] = [
      {
        claimCode: "CLM-PND-009",
        evidenceObligations: [
          { qualityCheckKind: "unit" },
          { qualityCheckKind: "integration", pending: true },
        ],
      },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheckKind: "unit", claimCode: "CLM-PND-009", status: "passed" },
    ];
    const balance = reconcile(scenarios, evidenceObservations);
    const scenario = balance.claimReconciliations.find((s) => s.claim === "CLM-PND-009");

    expect(scenario?.qualityCheckReconciliations).toEqual([{ qualityCheckKind: "unit", evidenceObligation: { qualityCheckKind: "unit" }, evidenceObservations: [{ qualityCheckKind: "unit", claimCode: "CLM-PND-009", status: "passed", outcome: "satisfied" }] }]);
    expect(scenario?.pendingItems).toEqual([{ qualityCheckKind: "integration" }]);
    expect(scenario?.verdict).toBe("balanced");
    expect(reconcilingItemsOf(scenario!)).toEqual([]);
  });
});

describe("[CLM-PND-014] an undefined step with no pending deferral is reported out-of-balance (missing), not excused as pending", () => {
  it("drops the undefined observation → the named obligation reconciles missing, verdict out-of-balance, no Pending Item", () => {
    const scenarios: Scenario[] = [
      { claimCode: "CLM-PND-014", evidenceObligations: [{ qualityCheckKind: "integration" }] },
    ];
    const report: CucumberJsonReport = [
      {
        uri: "features/pnd014.feature",
        elements: [
          {
            tags: [{ name: "@integration" }, { name: "@CLM-PND-014" }],
            steps: [{ result: { status: "undefined" } }],
          },
        ],
      },
    ];
    const observations = parseCucumberEvidenceObservations(report);
    expect(observations).toEqual([]);

    const balance = reconcile(scenarios, observations);
    const scenario = balance.claimReconciliations.find((s) => s.claim === "CLM-PND-014");

    expect(scenario?.verdict).toBe("out-of-balance");
    expect(reconcilingItemsOf(scenario!)).toEqual([
      { qualityCheckKind: "integration", outcome: "missing", evidenceObligation: { qualityCheckKind: "integration" } },
    ]);
    expect(scenario?.pendingItems).toEqual([]);
  });
});
