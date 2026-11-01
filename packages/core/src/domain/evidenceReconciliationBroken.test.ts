import { describe, it, expect } from "vitest";
import { obligationsOf } from "./claimReconciliation.js";
import { reconcile } from "./evidenceReconciliation.js";
import type {
  Scenario,
  EvidenceObservation,
} from "../model.js";

describe("[SCN-LDG-029] a no-scn-code reconciliation carries a scenario-scope obligation and no observation", () => {

  it("the untagged scenario's one reconciliation is the no-scn-code outcome and its scenario-scope obligation {}, with no observation list, and the row's obligation census stays empty", () => {
    const namedScenarios: Scenario[] = [
      { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
    ];
    const observed: EvidenceObservation[] = [
      { scnId: "SCN-AAA-001", qualityCheckKind: "unit", status: "passed" },
    ];

    const reconciliation = reconcile(namedScenarios, observed, ["beta must never lose the money"]);
    const row = reconciliation.claimReconciliations.find(
      (r) => r.claim === "beta must never lose the money",
    );
    expect(row?.qualityCheckReconciliations).toStrictEqual([
      { outcome: "no-scn-code", evidenceObligation: {} },
    ]);
    expect(obligationsOf(row!)).toEqual([]);
  });
});
