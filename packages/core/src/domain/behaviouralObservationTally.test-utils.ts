import { behaviouralObservationTally } from "./ledger.js";
import { reconcile } from "./evidenceReconciliation.js";
import type { EvidenceObservation, Ledger, Scenario } from "../model.js";

export const tallyOfEveryObservationKind = () => {
  const scenarios: Scenario[] = [{ scnId: "SCN-A", evidenceObligations: [{ qualityCheckKind: "unit" }] }];
  const observations: EvidenceObservation[] = [
    { qualityCheckKind: "unit", scnId: "SCN-A", status: "passed" },
    { qualityCheckKind: "unit", scnId: "SCN-A", status: "passed" },
    { qualityCheckKind: "integration", scnId: "SCN-A", status: "passed" },
    { qualityCheckKind: "unit", scnId: "SCN-PHX-999", status: "passed" },
    { qualityCheckKind: "integration", scnId: null, status: "passed" },
    { qualityCheckKind: "e2e", scnId: "SCN-A", status: "failed", broken: true, locator: "features/x.feature" },
    { qualityCheckKind: "fitness", fitnessFunction: "guard-x", exists: true, enforcedOverRealSource: true },
  ];
  const ledger: Ledger = reconcile(scenarios, observations);
  return behaviouralObservationTally(ledger);
};
