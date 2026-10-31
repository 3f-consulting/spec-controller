import type { EvidenceObservation, Scenario } from "../model.js";

export const scenario: Scenario = { scnId: "SCN-VRD-001", evidenceObligations: [{ qualityCheck: "unit" }] };
export const pendingScenario: Scenario = {
  scnId: "SCN-VRD-001",
  evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration", pending: true }],
};
export const passed: EvidenceObservation = { qualityCheck: "unit", scnId: "SCN-VRD-001", status: "passed" };
