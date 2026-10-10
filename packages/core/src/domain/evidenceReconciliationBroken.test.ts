import { describe, it, expect } from "vitest";
import { reconcile } from "./evidenceReconciliation.js";
import type {
  Scenario,
  EvidenceObservation,
} from "../model.js";

describe("[SCN-LDG-029] a no-scn-code reconciliation carries a scenario-scope obligation and no observation", () => {

  it("leaves the scenario-level evidenceObligations empty — the synthesized {} is item-scope, census untouched", () => {
    const namedScenarios: Scenario[] = [
      { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    ];
    const observed: EvidenceObservation[] = [
      { scnId: "SCN-AAA-001", qualityCheck: "unit", status: "passed" },
    ];

    const reconciliation = reconcile(namedScenarios, observed, ["beta must never lose the money"]);
    const row = reconciliation.scenarioReconciliations.find(
      (r) => r.scnId === "beta must never lose the money",
    );
    expect(row).toBeDefined();
    expect(row!.evidenceObligations).toEqual([]);
  });
});
