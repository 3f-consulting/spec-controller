import { describe, it, expect } from "vitest";
import { obligationsOf } from "./claimReconciliation.js";
import { reconcile } from "./evidenceReconciliation.js";
import type {
  Scenario,
  EvidenceObservation,
} from "../model.js";

describe("[SCN-LDG-029] a no-claim-code reconciliation carries a scenario-scope obligation and no observation", () => {

  it("the untagged scenario's one reconciliation is the no-claim-code outcome and its scenario-scope obligation, whose kind of quality check is null, with no observation list, and the row's obligation census stays empty", () => {
    const namedScenarios: Scenario[] = [
      { claimCode: "SCN-AAA-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
    ];
    const observed: EvidenceObservation[] = [
      { claimCode: "SCN-AAA-001", qualityCheckKind: "unit", status: "passed" },
    ];

    const reconciliation = reconcile(namedScenarios, observed, ["beta must never lose the money"]);
    const row = reconciliation.claimReconciliations.find(
      (r) => r.claim === "beta must never lose the money",
    );
    expect(row?.qualityCheckReconciliations).toStrictEqual([
      { outcome: "no-claim-code", evidenceObligation: { qualityCheckKind: null } },
    ]);
    expect(obligationsOf(row!)).toEqual([]);
  });
});
