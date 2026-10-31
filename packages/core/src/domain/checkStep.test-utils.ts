import { evidenceReconciliationOf, type EvidenceReconciliation } from "./evidenceReconciliation.js";
import { fitnessObservationsOf, workflowObservationsOf } from "./fitnessReconciliation.js";
import type { Scenario } from "./journal.js";
import type { PipelineStep } from "./pipelineStep.js";
import { stepDispositions } from "./uncitedFitnessFunctions.js";

export const FITNESS_SCENARIOS: Scenario[] = [
  { scnId: "SCN-CVT-001", evidenceObligations: [{ qualityCheck: "fitness" }] },
  { scnId: "SCN-CVT-002", evidenceObligations: [{ qualityCheck: "fitness" }] },
  { scnId: "SCN-CVT-003", evidenceObligations: [{ qualityCheck: "fitness" }] },
  { scnId: "SCN-CVT-004", evidenceObligations: [{ qualityCheck: "fitness" }] },
  { scnId: "SCN-CVT-005", evidenceObligations: [{ qualityCheck: "fitness" }] },
];

export const IN_THE_QUALITY_JOB = { workflow: "ci.yml", job: "quality", writesStepRecord: false, abortsJob: true, plumbing: false } as const;

export const CHECKOUT: PipelineStep = {
  ...IN_THE_QUALITY_JOB,
  identity: "Checkout",
  plumbing: true,
  action: { name: "actions/checkout@v4" },
};

export function reconcileTheWorkflow(scenarios: readonly Scenario[], steps: readonly PipelineStep[]): EvidenceReconciliation {
  const dispositionOf = stepDispositions({
    isReconciler: () => false,
    isNamedANonCheck: (step) => step.identity === "Checkout",
    runsARunner: () => false,
  });
  const rows = new Set(scenarios.map((scenario) => scenario.scnId));
  const workflow = workflowObservationsOf(
    steps,
    (step) => dispositionOf(step) === "candidate",
    (step) => ("command" in step ? step.command.replace("pnpm ", "") : step.identity),
    (step) => step.identity,
    (_handle, citedByStep) => (citedByStep !== undefined && rows.has(citedByStep) ? { scnId: citedByStep } : null)
  );
  return evidenceReconciliationOf(scenarios, fitnessObservationsOf(workflow, undefined), []);
}
