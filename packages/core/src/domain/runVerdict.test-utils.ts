import type { EvidenceObservation, Scenario } from "../model.js";

export const scenario: Scenario = { claimCode: "SCN-VRD-001", evidenceObligations: [{ qualityCheckKind: "unit" }] };
export const pendingScenario: Scenario = {
  claimCode: "SCN-VRD-001",
  evidenceObligations: [{ qualityCheckKind: "unit" }, { qualityCheckKind: "integration", pending: true }],
};
export const passed: EvidenceObservation = { qualityCheckKind: "unit", claimCode: "SCN-VRD-001", status: "passed" };
