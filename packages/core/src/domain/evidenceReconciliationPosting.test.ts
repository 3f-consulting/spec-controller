import { describe, it, expect } from "vitest";
import { reconcile } from "./evidenceReconciliation.js";
import { isBalanced } from "./ledger.js";
import { assembleRenderInput } from "../assemble/renderInput.js";
import type { RunContext } from "../provenance/provenance.js";
import type {
  Scenario,
  EvidenceObligation,
  EvidenceObservation,
  RuntimeEvidenceObservation,
  Ledger,
  ScenarioReconciliation,
} from "../model.js";
import { __er } from "../evidenceReconciliation.testkit.js";

describe("[SCN-LDG-022] reconcile — every evidence observation posts to exactly one account, never to none", () => {
  const namedScenarios: Scenario[] = [
    { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    { scnId: "SCN-AAA-002", evidenceObligations: [{ qualityCheck: "unit" }] },
    { scnId: "SCN-AAA-003", evidenceObligations: [{ qualityCheck: "unit", pending: true }] },
  ];

  const accountFor = (ledger: Ledger, scnId: string): ScenarioReconciliation | undefined =>
    ledger.scenarioReconciliations.find((r) => r.scnId === scnId);

  it.each([
    ["posts a matched credit to the account it cites", "SCN-AAA-001"],
    ["posts a credit citing an unknown @SCN to that phantom account", "SCN-ZZZ-999"],
  ] as const)("%s", (_title, scnId) => {
    const credit: EvidenceObservation = { scnId, qualityCheck: "unit", status: "passed" };
    const ledger = reconcile(namedScenarios, [credit]);
    expect(accountFor(ledger, scnId)?.evidenceObservations).toEqual([credit]);
  });

  it("posts a no-evidence-obligation credit to the real account it cites, not to suspense", () => {
    const credit: EvidenceObservation = { scnId: "SCN-AAA-002", qualityCheck: "integration", status: "passed" };
    const ledger = reconcile(namedScenarios, [credit]);
    expect(accountFor(ledger, "SCN-AAA-002")?.evidenceObservations).toEqual([credit]);
    expect(accountFor(ledger, "(no scenario)")).toBeUndefined();
  });

  it("posts a credit citing a PENDING quality-check", () => {
    const credit: EvidenceObservation = { scnId: "SCN-AAA-003", qualityCheck: "unit", status: "passed" };
    const account = accountFor(reconcile(namedScenarios, [credit]), "SCN-AAA-003");
    expect(account?.evidenceObservations).toEqual([credit]);
  });

  it("posts an uncited credit to suspense", () => {
    const credit: EvidenceObservation = { scnId: null, qualityCheck: "unit", status: "passed" };
    const ledger = reconcile(namedScenarios, [credit]);
    expect(accountFor(ledger, "(no scenario)")?.evidenceObservations).toEqual([credit]);
  });

  it("posts a broken credit to suspense, whatever scnId it structurally carries", () => {
    const credit: RuntimeEvidenceObservation = {
      scnId: "SCN-AAA-001", qualityCheck: "unit", status: "failed", broken: true,
    };
    const ledger = reconcile(namedScenarios, [credit]);
    expect(accountFor(ledger, "(no scenario)")?.evidenceObservations).toEqual([credit]);
    expect(accountFor(ledger, "SCN-AAA-001")?.evidenceObservations).toEqual([]);
  });

  it("posts a CITED fitness credit to the one account it cites — the same rule as a runtime credit", () => {
    const fitness: Scenario[] = [
      { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "fitness" }] },
    ];
    const credit: EvidenceObservation = {
      scnId: "SCN-AAA-001", qualityCheck: "fitness", fitnessFunction: "lint:x", exists: true, enforcedOverRealSource: true,
    };
    const ledger = reconcile(fitness, [credit]);
    expect(accountFor(ledger, "SCN-AAA-001")?.evidenceObservations).toEqual([credit]);
    expect(accountFor(ledger, "(no scenario)")).toBeUndefined();
  });

  it("posts an UNCITED fitness credit to suspense — it cites no scenario", () => {
    const credit: EvidenceObservation = {
      qualityCheck: "fitness", fitnessFunction: "lint:nobody-cites-this", exists: true, enforcedOverRealSource: false,
    };
    const ledger = reconcile(namedScenarios, [credit]);
    expect(accountFor(ledger, "(no scenario)")?.evidenceObservations).toEqual([credit]);
  });

  it("sets evidenceObservations explicitly on every account, even when nothing posts", () => {
    const ledger = reconcile(namedScenarios, []);
    for (const account of ledger.scenarioReconciliations) {
      expect(account.evidenceObservations).toEqual([]);
    }
  });
});

describe("[SCN-LDG-025] reconcile — a balanced fitness-only corpus keeps outOfBalance agreeing with the verdict", () => {
  const accountFor = (ledger: Ledger, scnId: string): ScenarioReconciliation | undefined =>
    ledger.scenarioReconciliations.find((r) => r.scnId === scnId);
  const ctx: RunContext = { target: "obligations-only", inputs: {}, runStart: new Date("2026-07-20T00:00:00.000Z"), sourceSha: null };

  it("a satisfied citation-routed check as the only credit → balanced, no suspense, summary.outOfBalance 0", () => {
    const fitness: Scenario[] = [
      { scnId: "SCN-DEM-001", evidenceObligations: [{ qualityCheck: "fitness" }] },
    ];
    const credit: EvidenceObservation = {
      scnId: "SCN-DEM-001", qualityCheck: "fitness", fitnessFunction: "lint:obligations-only", exists: true, enforcedOverRealSource: true,
    };
    const ledger = reconcile(fitness, [credit]);

    expect(accountFor(ledger, "SCN-DEM-001")?.qualityCheckReconciliations).toEqual([
      { qualityCheck: "fitness", outcome: "satisfied", evidenceObligation: { qualityCheck: "fitness" }, evidenceObservation: { scnId: "SCN-DEM-001", qualityCheck: "fitness", fitnessFunction: "lint:obligations-only", exists: true, enforcedOverRealSource: true } },
    ]);
    expect(accountFor(ledger, "SCN-DEM-001")?.verdict).toBe("balanced");
    expect(accountFor(ledger, "(no scenario)")).toBeUndefined();
    expect(isBalanced(ledger)).toBe(true);
    expect(assembleRenderInput(__er(ledger), ctx).summary.scenarioReconciliations.outOfBalance).toBe(0);
  });
});

describe("[SCN-LDG-023] reconcile — the evidence obligations a scenario names post to its ledger account", () => {
  const accountFor = (ledger: Ledger, scnId: string): ScenarioReconciliation | undefined =>
    ledger.scenarioReconciliations.find((r) => r.scnId === scnId);

  it("posts a named runtime obligation to its own scenario's account, keyed by quality-check", () => {
    const obligation: EvidenceObligation = { qualityCheck: "unit" };
    const namedScenarios: Scenario[] = [{ scnId: "SCN-AAA-001", evidenceObligations: [obligation] }];
    const ledger = reconcile(namedScenarios, [
      { scnId: "SCN-AAA-001", qualityCheck: "unit", status: "passed" },
    ]);
    expect(accountFor(ledger, "SCN-AAA-001")?.evidenceObligations).toEqual([obligation]);
  });

  it("posts a fitness obligation carrying its bare check", () => {
    const obligation: EvidenceObligation = { qualityCheck: "fitness" };
    const namedScenarios: Scenario[] = [{ scnId: "SCN-AAA-001", evidenceObligations: [obligation] }];
    const ledger = reconcile(namedScenarios, []);
    expect(accountFor(ledger, "SCN-AAA-001")?.evidenceObligations).toEqual([obligation]);
  });

  it("posts a PENDING obligation, though it earns no reconciled row", () => {
    const obligation: EvidenceObligation = { qualityCheck: "unit", pending: true };
    const namedScenarios: Scenario[] = [{ scnId: "SCN-AAA-003", evidenceObligations: [obligation] }];
    const account = accountFor(reconcile(namedScenarios, []), "SCN-AAA-003");
    expect(account?.evidenceObligations).toEqual([obligation]);
    expect(account?.qualityCheckReconciliations).toEqual([]);
  });

  it("posts every named obligation of a multi-obligation scenario, in document order", () => {
    const unit: EvidenceObligation = { qualityCheck: "unit" };
    const fitness: EvidenceObligation = { qualityCheck: "fitness" };
    const namedScenarios: Scenario[] = [{ scnId: "SCN-AAA-001", evidenceObligations: [unit, fitness] }];
    const ledger = reconcile(namedScenarios, []);
    expect(accountFor(ledger, "SCN-AAA-001")?.evidenceObligations).toEqual([unit, fitness]);
  });

  it("posts each scenario's debits to ITS OWN account — never another's", () => {
    const aaa: EvidenceObligation = { qualityCheck: "unit" };
    const bbb: EvidenceObligation = { qualityCheck: "integration" };
    const namedScenarios: Scenario[] = [
      { scnId: "SCN-AAA-001", evidenceObligations: [aaa] },
      { scnId: "SCN-AAA-002", evidenceObligations: [bbb] },
    ];
    const ledger = reconcile(namedScenarios, []);
    expect(accountFor(ledger, "SCN-AAA-001")?.evidenceObligations).toEqual([aaa]);
    expect(accountFor(ledger, "SCN-AAA-002")?.evidenceObligations).toEqual([bbb]);
  });

  it("posts no debits to the accounts no scenario names — suspense and phantom", () => {
    const namedScenarios: Scenario[] = [{ scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "unit" }] }];
    const ledger = reconcile(namedScenarios, [
      { scnId: "SCN-ZZZ-999", qualityCheck: "unit", status: "passed" },
      { scnId: null, qualityCheck: "unit", status: "passed" },
    ]);
    expect(accountFor(ledger, "SCN-ZZZ-999")?.evidenceObligations).toEqual([]);
    expect(accountFor(ledger, "(no scenario)")?.evidenceObligations).toEqual([]);
  });

  it("sets evidenceObligations explicitly on every account, even when nothing is named", () => {
    const namedScenarios: Scenario[] = [{ scnId: "SCN-AAA-001", evidenceObligations: [] }];
    const ledger = reconcile(namedScenarios, []);
    for (const account of ledger.scenarioReconciliations) {
      expect(account.evidenceObligations).toEqual([]);
    }
  });
});
