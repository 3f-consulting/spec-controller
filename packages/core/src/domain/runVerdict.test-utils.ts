import type { EvidenceObservation, Scenario } from "../model.js";

export const scenario: Scenario = { scnId: "SCN-VRD-001", evidenceObligations: [{ qualityCheckKind: "unit" }] };
export const pendingScenario: Scenario = {
  scnId: "SCN-VRD-001",
  evidenceObligations: [{ qualityCheckKind: "unit" }, { qualityCheckKind: "integration", pending: true }],
};
export const passed: EvidenceObservation = { qualityCheckKind: "unit", scnId: "SCN-VRD-001", status: "passed" };
