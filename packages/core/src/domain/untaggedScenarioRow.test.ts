import { describe, it, expect } from "vitest";
import { observationsOf } from "./claimReconciliation.js";

import { reconcile } from "./evidenceReconciliation.js";
import type { Scenario, EvidenceObservation } from "../model.js";

const postedOf = <T extends { readonly outcome: unknown }>({ outcome: _outcome, ...posted }: T) => posted;

const UNTAGGED = "beta must never lose the money";

const namedScenarios: Scenario[] = [
  { claimCode: "CLM-AAA-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
  { claimCode: "CLM-AAA-002", evidenceObligations: [{ qualityCheckKind: "integration", pending: true }] },
];

const observed: EvidenceObservation[] = [
  { claimCode: "CLM-AAA-001", qualityCheckKind: "unit", status: "passed" },
];

describe("[CLM-LDG-021] the untagged scenario's row carries no evidence observation and no Pending Item", () => {
  const ledger = () => reconcile(namedScenarios, observed, [UNTAGGED]);
  const rowFor = (claimCode: string) =>
    ledger().claimReconciliations.find((r) => r.claim === claimCode);

  it("routes the run's one evidence observation to the account its citation names, not to the untagged row", () => {
    expect(observationsOf(rowFor("CLM-AAA-001")!).map(postedOf)).toStrictEqual([observed[0]]);
    expect(observationsOf(rowFor(UNTAGGED)!)).toStrictEqual([]);
  });
});
