import type { EvidenceObservation, Scenario } from "../model.js";

export const scenario: Scenario = { claimCode: "CLM-VRD-001", evidenceObligations: [{ qualityCheckKind: "unit" }] };
export const pendingScenario: Scenario = {
  claimCode: "CLM-VRD-001",
  evidenceObligations: [{ qualityCheckKind: "unit" }, { qualityCheckKind: "integration", pending: true }],
};
export const passed: EvidenceObservation = { qualityCheckKind: "unit", claimCode: "CLM-VRD-001", status: "passed" };
