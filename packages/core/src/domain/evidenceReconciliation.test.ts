import { describe, it, expect } from "vitest";
import { reconcilingItemsOf, UNNAMED_CLAIM_ID } from "./claimReconciliation.js";
import { reconcile } from "./evidenceReconciliation.js";
import type {
  Scenario,
  EvidenceObservation,
} from "../model.js";

describe("[CLM-LDG-002] a scenario whose Evidence Obligation names a test that exists but fails is reported as out of balance with a failing reconciling item", () => {
  it("returns the out-of-balance verdict listing a failing reconciling item when the evidence answering its unit Evidence Obligation is present but failing", () => {
    const scenarios: Scenario[] = [
      { claimCode: "CLM-LDG-002", evidenceObligations: [{ qualityCheckKind: "unit" }] },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheckKind: "unit", claimCode: "CLM-LDG-002", status: "failed" },
    ];

    const balance = reconcile(scenarios, evidenceObservations);
    const scenario = balance.claimReconciliations.find((s) => s.claim === "CLM-LDG-002");

    expect(scenario?.verdict).toBe("out-of-balance");
    expect(reconcilingItemsOf(scenario!)).toEqual([
      { qualityCheckKind: "unit", outcome: "failing", evidenceObligation: { qualityCheckKind: "unit" }, evidenceObservation: { qualityCheckKind: "unit", claimCode: "CLM-LDG-002", status: "failed", outcome: "failing" } },
    ]);
  });
});

describe("[CLM-LDG-003] a scenario that raises an Evidence Obligation with no matching result is reported as out of balance with a missing reconciling item", () => {
  it("returns the out-of-balance verdict listing a missing reconciling item when its integration Evidence Obligation has no matching result", () => {
    const scenarios: Scenario[] = [
      { claimCode: "CLM-LDG-003", evidenceObligations: [{ qualityCheckKind: "integration" }] },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheckKind: "integration", claimCode: "CLM-LDG-OTHER", status: "passed" },
    ];

    const balance = reconcile(scenarios, evidenceObservations);
    const scenario = balance.claimReconciliations.find((s) => s.claim === "CLM-LDG-003");

    expect(scenario?.verdict).toBe("out-of-balance");
    expect(reconcilingItemsOf(scenario!)).toEqual([
      { qualityCheckKind: "integration", outcome: "missing", evidenceObligation: { qualityCheckKind: "integration" } },
    ]);
  });
});

describe("[CLM-LDG-004] a multi-evidenceObligation scenario failing one level and missing another lists both reconciling items", () => {
  it("lists BOTH the failing AND the missing reconciling item, with no ranking between them", () => {
    const scenarios: Scenario[] = [
      {
        claimCode: "CLM-LDG-004",
        evidenceObligations: [
          { qualityCheckKind: "unit" },
          { qualityCheckKind: "integration" },
        ],
      },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheckKind: "unit", claimCode: "CLM-LDG-004", status: "failed" },
    ];

    const balance = reconcile(scenarios, evidenceObservations);
    const scenario = balance.claimReconciliations.find((s) => s.claim === "CLM-LDG-004");

    expect(scenario?.verdict).toBe("out-of-balance");
    expect(reconcilingItemsOf(scenario!)).toEqual(
      expect.arrayContaining([
        { qualityCheckKind: "unit", outcome: "failing", evidenceObligation: { qualityCheckKind: "unit" }, evidenceObservation: { qualityCheckKind: "unit", claimCode: "CLM-LDG-004", status: "failed", outcome: "failing" } },
        { qualityCheckKind: "integration", outcome: "missing", evidenceObligation: { qualityCheckKind: "integration" } },
      ])
    );
    expect(reconcilingItemsOf(scenario!)).toHaveLength(2);
  });
});

describe("[CLM-LDG-005] an out-of-balance scenario carries its reconciling items as a list", () => {
  it("carries the non-balanced reconciling item among the claim's reconciling items, read through reconcilingItemsOf, not a single picked scenario outcome", () => {
    const scenarios: Scenario[] = [
      { claimCode: "CLM-LDG-005", evidenceObligations: [{ qualityCheckKind: "unit" }] },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheckKind: "unit", claimCode: "CLM-LDG-005", status: "failed" },
    ];

    const balance = reconcile(scenarios, evidenceObservations);
    const scenario = balance.claimReconciliations.find((s) => s.claim === "CLM-LDG-005");

    expect(scenario?.verdict).toBe("out-of-balance");
    expect(Array.isArray(reconcilingItemsOf(scenario!))).toBe(true);
    expect(reconcilingItemsOf(scenario!)).toEqual([
      { qualityCheckKind: "unit", outcome: "failing", evidenceObligation: { qualityCheckKind: "unit" }, evidenceObservation: { qualityCheckKind: "unit", claimCode: "CLM-LDG-005", status: "failed", outcome: "failing" } },
    ]);
  });
});

describe("[CLM-LDG-027] a quality-check reconciliation carries every evidence observation of its kind of quality check on its claim", () => {
  const REMOVED_KEYS = ["evidenceObservation", "locator", "message", "notes", "fitnessFunction"];

  const first: EvidenceObservation = { qualityCheckKind: "unit", claimCode: "CLM-LDG-027", status: "passed", locator: "a.test.ts" };
  const second: EvidenceObservation = { qualityCheckKind: "unit", claimCode: "CLM-LDG-027", status: "passed", locator: "b.test.ts" };
  const third: EvidenceObservation = { qualityCheckKind: "unit", claimCode: "CLM-LDG-027", status: "passed", locator: "c.test.ts" };
  const integrationOne: EvidenceObservation = { qualityCheckKind: "integration", claimCode: "CLM-LDG-027", status: "passed", locator: "d.feature" };
  const integrationTwo: EvidenceObservation = { qualityCheckKind: "integration", claimCode: "CLM-LDG-027", status: "failed", locator: "e.feature", message: "boom" };
  const uncitedOne: EvidenceObservation = { qualityCheckKind: "unit", claimCode: null, status: "passed", locator: "f.test.ts", message: "said" };
  const uncitedTwo: EvidenceObservation = { qualityCheckKind: "unit", claimCode: null, status: "failed", locator: "g.test.ts" };

  function ledger() {
    const scenarios: Scenario[] = [{ claimCode: "CLM-LDG-027", evidenceObligations: [{ qualityCheckKind: "unit" }] }];
    return reconcile(scenarios, [third, integrationTwo, uncitedTwo, first, integrationOne, uncitedOne, second]);
  }

  function qcrsOf(claim: string, qualityCheckKind: string) {
    const row = ledger().claimReconciliations.find((s) => s.claim === claim);
    return row!.qualityCheckReconciliations.filter((r) => r.qualityCheckKind === qualityCheckKind);
  }

  it("holds all three unit tests citing the scenario's unit obligation in one unit reconciliation, in evidence order", () => {
    const unit = qcrsOf("CLM-LDG-027", "unit");
    expect(unit).toHaveLength(1);
    expect(unit[0]!.evidenceObligation).toEqual({ qualityCheckKind: "unit" });
    expect(unit[0]!.evidenceObservations).toEqual([first, second, third].map((o) => ({ ...o, outcome: "satisfied" })));
  });

  it("holds both integration observations the scenario raises no obligation for in one integration reconciliation", () => {
    const integration = qcrsOf("CLM-LDG-027", "integration");
    expect(integration).toHaveLength(1);
    expect(integration[0]!.evidenceObligation).toBeUndefined();
    expect(integration[0]!.evidenceObservations).toEqual([integrationOne, integrationTwo].map((o) => ({ ...o, outcome: "not-asked-for" })));
  });

  it("holds both uncited unit observations in one unit reconciliation on the unnamed claim", () => {
    const unnamed = qcrsOf(UNNAMED_CLAIM_ID, "unit");
    expect(unnamed).toHaveLength(1);
    expect(unnamed[0]!.evidenceObservations).toEqual([uncitedOne, uncitedTwo].map((o) => ({ ...o, outcome: "cites-no-claim" })));
  });

  it("carries no copy of an observation's keys on any reconciliation", () => {
    const keys = ledger().claimReconciliations.flatMap((row) =>
      row.qualityCheckReconciliations.flatMap((r) => Object.keys(r))
    );
    expect(keys.filter((key) => REMOVED_KEYS.includes(key))).toEqual([]);
  });
});

describe("[CLM-LDG-010] a zero-evidence obligation scenario cited by a stray evidence observation is not-asked-for, not no-quality-check", () => {
  it("emits a not-asked-for row (NOT a warning, NOT no-quality-check) when a zero-evidence obligation scenario is cited by a stray evidence observation", () => {
    const scenarios: Scenario[] = [
      { claimCode: "CLM-LDG-010", evidenceObligations: [] },
    ];
    const evidenceObservations: EvidenceObservation[] = [
      { qualityCheckKind: "unit", claimCode: "CLM-LDG-010", status: "passed" },
    ];

    const balance = reconcile(scenarios, evidenceObservations);

    const row = balance.claimReconciliations.find((s) => s.claim === "CLM-LDG-010");
    expect(row?.kind).toBe("scenario");
    expect(row?.verdict).toBe("out-of-balance");
    expect(reconcilingItemsOf(row!)).toEqual([
      { qualityCheckKind: "unit", outcome: "not-asked-for", evidenceObservation: { qualityCheckKind: "unit", claimCode: "CLM-LDG-010", status: "passed", outcome: "not-asked-for" } },
    ]);
    expect(reconcilingItemsOf(row!).some((r) => r.outcome === "no-quality-check")).toBe(false);
  });
});

describe("[CLM-LDG-009] a scenario with zero rows on both sides is reported as no-quality-check, out of balance", () => {

  it("does NOT emit no-quality-check when the scenario names an evidence obligation (a one-sided row is a debit, not no-quality-check)", () => {
    const scenarios: Scenario[] = [
      { claimCode: "CLM-LDG-009", evidenceObligations: [{ qualityCheckKind: "unit" }] },
    ];
    const evidenceObservations: EvidenceObservation[] = [];

    const balance = reconcile(scenarios, evidenceObservations);
    const row = balance.claimReconciliations.find((s) => s.claim === "CLM-LDG-009");

    expect(row?.verdict).toBe("out-of-balance");
    expect(reconcilingItemsOf(row!)).toEqual([{ qualityCheckKind: "unit", outcome: "missing", evidenceObligation: { qualityCheckKind: "unit" } }]);
    expect(reconcilingItemsOf(row!).some((r) => r.outcome === "no-quality-check")).toBe(false);
  });
});
