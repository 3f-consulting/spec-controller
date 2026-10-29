import { describe, it, expect } from "vitest";
import { reconcilingItemsOf, UNNAMED_CLAIM_ID } from "./claimReconciliation.js";
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
    const scenario = balance.claimReconciliations.find((s) => s.claim === "SCN-LDG-002");

    expect(scenario?.verdict).toBe("out-of-balance");
    expect(reconcilingItemsOf(scenario!)).toEqual([
      { qualityCheck: "unit", outcome: "failing", evidenceObligation: { qualityCheck: "unit" }, evidenceObservation: { qualityCheck: "unit", scnId: "SCN-LDG-002", status: "failed", outcome: "failing" } },
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
    const scenario = balance.claimReconciliations.find((s) => s.claim === "SCN-LDG-003");

    expect(scenario?.verdict).toBe("out-of-balance");
    expect(reconcilingItemsOf(scenario!)).toEqual([
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
    const scenario = balance.claimReconciliations.find((s) => s.claim === "SCN-LDG-004");

    expect(scenario?.verdict).toBe("out-of-balance");
    expect(reconcilingItemsOf(scenario!)).toEqual(
      expect.arrayContaining([
        { qualityCheck: "unit", outcome: "failing", evidenceObligation: { qualityCheck: "unit" }, evidenceObservation: { qualityCheck: "unit", scnId: "SCN-LDG-004", status: "failed", outcome: "failing" } },
        { qualityCheck: "integration", outcome: "missing", evidenceObligation: { qualityCheck: "integration" } },
      ])
    );
    expect(reconcilingItemsOf(scenario!)).toHaveLength(2);
  });
});

describe("[SCN-LDG-005] an out-of-balance scenario carries its reconciling items as a list", () => {
  it("carries the non-balanced reconciling item among the claim's reconciling items, read through reconcilingItemsOf, not a single picked scenario outcome", () => {
    const scenarios: Scenario[] = [
      { scnId: "SCN-LDG-005", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheck: "unit", scnId: "SCN-LDG-005", status: "failed" },
    ];

    const balance = reconcile(scenarios, evidenceObservations);
    const scenario = balance.claimReconciliations.find((s) => s.claim === "SCN-LDG-005");

    expect(scenario?.verdict).toBe("out-of-balance");
    expect(Array.isArray(reconcilingItemsOf(scenario!))).toBe(true);
    expect(reconcilingItemsOf(scenario!)).toEqual([
      { qualityCheck: "unit", outcome: "failing", evidenceObligation: { qualityCheck: "unit" }, evidenceObservation: { qualityCheck: "unit", scnId: "SCN-LDG-005", status: "failed", outcome: "failing" } },
    ]);
  });
});

describe("[SCN-LDG-027] a quality-check reconciliation carries every evidence observation of its quality check on its claim", () => {
  const REMOVED_KEYS = ["evidenceObservation", "locator", "message", "notes", "fitnessFunction"];

  const first: EvidenceObservation = { qualityCheck: "unit", scnId: "SCN-LDG-027", status: "passed", locator: "a.test.ts" };
  const second: EvidenceObservation = { qualityCheck: "unit", scnId: "SCN-LDG-027", status: "passed", locator: "b.test.ts" };
  const third: EvidenceObservation = { qualityCheck: "unit", scnId: "SCN-LDG-027", status: "passed", locator: "c.test.ts" };
  const integrationOne: EvidenceObservation = { qualityCheck: "integration", scnId: "SCN-LDG-027", status: "passed", locator: "d.feature" };
  const integrationTwo: EvidenceObservation = { qualityCheck: "integration", scnId: "SCN-LDG-027", status: "failed", locator: "e.feature", message: "boom" };
  const uncitedOne: EvidenceObservation = { qualityCheck: "unit", scnId: null, status: "passed", locator: "f.test.ts", message: "said" };
  const uncitedTwo: EvidenceObservation = { qualityCheck: "unit", scnId: null, status: "failed", locator: "g.test.ts" };

  function ledger() {
    const scenarios: Scenario[] = [{ scnId: "SCN-LDG-027", evidenceObligations: [{ qualityCheck: "unit" }] }];
    return reconcile(scenarios, [third, integrationTwo, uncitedTwo, first, integrationOne, uncitedOne, second]);
  }

  function qcrsOf(claim: string, qualityCheck: string) {
    const row = ledger().claimReconciliations.find((s) => s.claim === claim);
    return row!.qualityCheckReconciliations.filter((r) => r.qualityCheck === qualityCheck);
  }

  it("holds all three unit tests citing the scenario's unit obligation in one unit reconciliation, in evidence order", () => {
    const unit = qcrsOf("SCN-LDG-027", "unit");
    expect(unit).toHaveLength(1);
    expect(unit[0]!.evidenceObligation).toEqual({ qualityCheck: "unit" });
    expect(unit[0]!.evidenceObservations).toEqual([first, second, third].map((o) => ({ ...o, outcome: "satisfied" })));
  });

  it("holds both integration observations the scenario raises no obligation for in one integration reconciliation", () => {
    const integration = qcrsOf("SCN-LDG-027", "integration");
    expect(integration).toHaveLength(1);
    expect(integration[0]!.evidenceObligation).toBeUndefined();
    expect(integration[0]!.evidenceObservations).toEqual([integrationOne, integrationTwo].map((o) => ({ ...o, outcome: "no-evidence-obligation" })));
  });

  it("holds both uncited unit observations in one unit reconciliation on the unnamed claim", () => {
    const unnamed = qcrsOf(UNNAMED_CLAIM_ID, "unit");
    expect(unnamed).toHaveLength(1);
    expect(unnamed[0]!.evidenceObservations).toEqual([uncitedOne, uncitedTwo].map((o) => ({ ...o, outcome: "cites-no-scenario" })));
  });

  it("carries no copy of an observation's keys on any reconciliation", () => {
    const keys = ledger().claimReconciliations.flatMap((row) =>
      row.qualityCheckReconciliations.flatMap((r) => Object.keys(r))
    );
    expect(keys.filter((key) => REMOVED_KEYS.includes(key))).toEqual([]);
  });
});

describe("[SCN-LDG-010] a zero-evidence obligation scenario cited by a stray evidence observation is no-evidence-obligation, not both-missing", () => {
  it("emits a no-evidence-obligation row (NOT a warning, NOT both-missing) when a zero-evidence obligation scenario is cited by a stray evidence observation", () => {
    const scenarios: Scenario[] = [
      { scnId: "SCN-LDG-010", evidenceObligations: [] },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheck: "unit", scnId: "SCN-LDG-010", status: "passed" },
    ];

    const balance = reconcile(scenarios, evidenceObservations);

    const row = balance.claimReconciliations.find((s) => s.claim === "SCN-LDG-010");
    expect(row?.kind).toBe("scenario");
    expect(row?.verdict).toBe("out-of-balance");
    expect(reconcilingItemsOf(row!)).toEqual([
      { qualityCheck: "unit", outcome: "no-evidence-obligation", evidenceObservation: { qualityCheck: "unit", scnId: "SCN-LDG-010", status: "passed", outcome: "no-evidence-obligation" } },
    ]);
    expect(reconcilingItemsOf(row!).some((r) => r.outcome === "both-missing")).toBe(false);
  });
});

describe("[SCN-LDG-009] a scenario with zero rows on both sides is reported as both-missing, out of balance", () => {

  it("does NOT emit both-missing when the scenario names an evidence obligation (a one-sided row is a debit, not both-missing)", () => {
    const scenarios: Scenario[] = [
      { scnId: "SCN-LDG-009", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const evidenceObservations: EvidenceObservation[] = [];

    const balance = reconcile(scenarios, evidenceObservations);
    const row = balance.claimReconciliations.find((s) => s.claim === "SCN-LDG-009");

    expect(row?.verdict).toBe("out-of-balance");
    expect(reconcilingItemsOf(row!)).toEqual([{ qualityCheck: "unit", outcome: "missing", evidenceObligation: { qualityCheck: "unit" } }]);
    expect(reconcilingItemsOf(row!).some((r) => r.outcome === "both-missing")).toBe(false);
  });
});
