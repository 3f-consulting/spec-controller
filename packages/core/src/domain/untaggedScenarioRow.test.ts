import { describe, it, expect } from "vitest";
import { observationsOf } from "./claimReconciliation.js";

import { reconcile } from "./evidenceReconciliation.js";
import type { Scenario, EvidenceObservation } from "../model.js";

const postedOf = <T extends { readonly outcome: unknown }>({ outcome: _outcome, ...posted }: T) => posted;

const UNTAGGED = "beta must never lose the money";

const namedScenarios: Scenario[] = [
  { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "unit" }] },
  { scnId: "SCN-AAA-002", evidenceObligations: [{ qualityCheck: "integration", pending: true }] },
];

const observed: EvidenceObservation[] = [
  { scnId: "SCN-AAA-001", qualityCheck: "unit", status: "passed" },
];

describe("[SCN-LDG-021] the untagged scenario's row carries no evidence observation and no Pending Item", () => {
  const ledger = () => reconcile(namedScenarios, observed, [UNTAGGED]);
  const rowFor = (scnId: string) =>
    ledger().claimReconciliations.find((r) => r.claim === scnId);

  it("routes the run's one evidence observation to the account its citation names, not to the untagged row", () => {
    expect(observationsOf(rowFor("SCN-AAA-001")!).map(postedOf)).toStrictEqual([observed[0]]);
    expect(observationsOf(rowFor(UNTAGGED)!)).toStrictEqual([]);
  });
});
