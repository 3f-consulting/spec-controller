import { describe, it, expect } from "vitest";
import { reconcile } from "./evidenceReconciliation.js";
import type {
  Scenario,
  EvidenceObservation,
} from "../model.js";

describe("[SCN-LDG-002] a scenario whose Evidence Obligation names a test that exists but fails is reported as out of balance with a failing reconciling item", () => {
  it("returns the out-of-balance verdict listing a failing reconciling item when the evidence answering its unit Evidence Obligation is present but failing", () => {
    const scenarios: Scenario[] = [
      { scnId: "SCN-LDG-002", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheck: "unit", scnId: "SCN-LDG-002", status: "failed" },
    ];

    const balance = reconcile(scenarios, evidenceObservations);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-LDG-002");

    expect(scenario?.verdict).toBe("out-of-balance");
    expect(scenario?.reconcilingItems).toEqual([
      { qualityCheck: "unit", outcome: "failing", evidenceObligation: { qualityCheck: "unit" }, evidenceObservation: { qualityCheck: "unit", scnId: "SCN-LDG-002", status: "failed" } },
    ]);
  });
});

describe("[SCN-LDG-003] a scenario that raises an Evidence Obligation with no matching result is reported as out of balance with a missing reconciling item", () => {
  it("returns the out-of-balance verdict listing a missing reconciling item when its integration Evidence Obligation has no matching result", () => {
    const scenarios: Scenario[] = [
      { scnId: "SCN-LDG-003", evidenceObligations: [{ qualityCheck: "integration" }] },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheck: "integration", scnId: "SCN-LDG-OTHER", status: "passed" },
    ];

    const balance = reconcile(scenarios, evidenceObservations);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-LDG-003");

    expect(scenario?.verdict).toBe("out-of-balance");
    expect(scenario?.reconcilingItems).toEqual([
      { qualityCheck: "integration", outcome: "missing", evidenceObligation: { qualityCheck: "integration" } },
    ]);
  });
});

describe("[SCN-LDG-004] a multi-evidenceObligation scenario failing one level and missing another lists both reconciling items", () => {
  it("lists BOTH the failing AND the missing reconciling item, with no ranking between them", () => {
    const scenarios: Scenario[] = [
      {
        scnId: "SCN-LDG-004",
        evidenceObligations: [
          { qualityCheck: "unit" },
          { qualityCheck: "integration" },
        ],
      },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheck: "unit", scnId: "SCN-LDG-004", status: "failed" },
    ];

    const balance = reconcile(scenarios, evidenceObservations);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-LDG-004");

    expect(scenario?.verdict).toBe("out-of-balance");
    expect(scenario?.reconcilingItems).toEqual(
      expect.arrayContaining([
        { qualityCheck: "unit", outcome: "failing", evidenceObligation: { qualityCheck: "unit" }, evidenceObservation: { qualityCheck: "unit", scnId: "SCN-LDG-004", status: "failed" } },
        { qualityCheck: "integration", outcome: "missing", evidenceObligation: { qualityCheck: "integration" } },
      ])
    );
    expect(scenario?.reconcilingItems).toHaveLength(2);
  });
});

describe("[SCN-LDG-005] an out-of-balance scenario carries its reconciling items as a list", () => {
  it("carries the non-balanced reconciling item in the verdict's reconcilingItems LIST, not a single picked scenario outcome", () => {
    const scenarios: Scenario[] = [
      { scnId: "SCN-LDG-005", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheck: "unit", scnId: "SCN-LDG-005", status: "failed" },
    ];

    const balance = reconcile(scenarios, evidenceObservations);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-LDG-005");

    expect(scenario?.verdict).toBe("out-of-balance");
    expect(Array.isArray(scenario?.reconcilingItems)).toBe(true);
    expect(scenario?.reconcilingItems).toEqual([
      { qualityCheck: "unit", outcome: "failing", evidenceObligation: { qualityCheck: "unit" }, evidenceObservation: { qualityCheck: "unit", scnId: "SCN-LDG-005", status: "failed" } },
    ]);
  });
});

describe("[SCN-LDG-027] a Quality Check Reconciliation carries the evidence observation it reconciles (the credit side)", () => {
  it("carries the citing observation on the no-evidence-obligation reconciliation, with no obligation (the pure credit case)", () => {
    const scenarios: Scenario[] = [
      { scnId: "SCN-LDG-027", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const observation: EvidenceObservation = {
      qualityCheck: "integration",
      scnId: "SCN-LDG-027",
      status: "passed",
      locator: "src/no-evidence-obligation.test.ts",
    };
    const evidenceObservations: EvidenceObservation[] = [observation];

    const balance = reconcile(scenarios, evidenceObservations);
    const row = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-LDG-027");

    const noEvidenceObligation = row?.qualityCheckReconciliations.find((o) => o.outcome === "no-evidence-obligation");
    expect(noEvidenceObligation?.evidenceObservation).toEqual(observation);
    expect(noEvidenceObligation?.evidenceObligation).toBeUndefined();
  });
});

describe("[SCN-LDG-010] a zero-evidence obligation scenario cited by a stray credit is no-evidence-obligation, not both-missing", () => {
  it("emits a no-evidence-obligation row (NOT a warning, NOT both-missing) when a zero-evidence obligation scenario is cited by a stray credit", () => {
    const scenarios: Scenario[] = [
      { scnId: "SCN-LDG-010", evidenceObligations: [] },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheck: "unit", scnId: "SCN-LDG-010", status: "passed" },
    ];

    const balance = reconcile(scenarios, evidenceObservations);

    const row = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-LDG-010");
    expect(row?.kind).toBe("scenario");
    expect(row?.verdict).toBe("out-of-balance");
    expect(row?.reconcilingItems).toEqual([
      { qualityCheck: "unit", outcome: "no-evidence-obligation", evidenceObservation: { qualityCheck: "unit", scnId: "SCN-LDG-010", status: "passed" } },
    ]);
    expect(row?.reconcilingItems.some((r) => r.outcome === "both-missing")).toBe(false);
  });
});

describe("[SCN-LDG-009] a scenario with zero rows on both sides is reported as both-missing, out of balance", () => {

  it("does NOT emit both-missing when the scenario names an evidence obligation (a one-sided row is a debit, not both-missing)", () => {
    const scenarios: Scenario[] = [
      { scnId: "SCN-LDG-009", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const evidenceObservations: EvidenceObservation[] = [];

    const balance = reconcile(scenarios, evidenceObservations);
    const row = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-LDG-009");

    expect(row?.verdict).toBe("out-of-balance");
    expect(row?.reconcilingItems).toEqual([{ qualityCheck: "unit", outcome: "missing", evidenceObligation: { qualityCheck: "unit" } }]);
    expect(row?.reconcilingItems.some((r) => r.outcome === "both-missing")).toBe(false);
  });
});
