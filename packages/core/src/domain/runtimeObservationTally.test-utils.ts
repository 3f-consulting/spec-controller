import { runtimeObservationTally } from "./ledger.js";
import { reconcile } from "./evidenceReconciliation.js";
import type { EvidenceObservation, Ledger, Scenario } from "../model.js";

export const tallyOfEveryObservationKind = () => {
  const scenarios: Scenario[] = [{ scnId: "SCN-A", evidenceObligations: [{ qualityCheck: "unit" }] }];
  const observations: EvidenceObservation[] = [
    { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
    { qualityCheck: "integration", scnId: "SCN-A", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-PHX-999", status: "passed" },
    { qualityCheck: "integration", scnId: null, status: "passed" },
    { qualityCheck: "e2e", scnId: "SCN-A", status: "failed", broken: true, locator: "features/x.feature" },
    { qualityCheck: "fitness", fitnessFunction: "guard-x", exists: true, enforcedOverRealSource: true },
  ];
  const ledger: Ledger = reconcile(scenarios, observations);
  return runtimeObservationTally(ledger);
};
