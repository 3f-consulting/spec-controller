import { describe, it, expect } from "vitest";
import { evidenceReconciliationOf } from "./evidenceReconciliation.js";
import { fitnessObservationsOf, workflowObservationsOf } from "./fitnessReconciliation.js";
import type { Scenario } from "./journal.js";
import type { PipelineStep } from "./pipelineStep.js";
import { stepDispositions } from "./uncitedFitnessFunctions.js";

const scenarios: Scenario[] = [
  { scnId: "SCN-CVT-001", evidenceObligations: [{ qualityCheck: "fitness" }] },
  { scnId: "SCN-CVT-002", evidenceObligations: [{ qualityCheck: "fitness" }] },
];

const annotatedSteps: PipelineStep[] = [
  {
    sourceIndex: 0,
    job: "quality",
    identity: "Checkout",
    writesStepRecord: false,
    abortsJob: true,
    action: { name: "actions/checkout@v4", owner: "actions", repository: "checkout" },
  },
  {
    sourceIndex: 0,
    job: "quality",
    identity: "Complexity",
    id: "SCN-CVT-001",
    writesStepRecord: false,
    abortsJob: true,
    command: "pnpm lint:alpha",
  },
  { sourceIndex: 0, job: "quality", identity: "Traceability", writesStepRecord: false, abortsJob: true, command: "pnpm lint:beta" },
];

function reconcileAnnotated() {
  const dispositionOf = stepDispositions({
    isReconciler: () => false,
    isNamedANonCheck: (step) => step.identity === "Checkout",
    runsARunner: () => false,
  });
  const rows = new Set(scenarios.map((scenario) => scenario.scnId));
  const workflow = workflowObservationsOf(
    annotatedSteps,
    (step) => dispositionOf(step) === "candidate",
    (step) => ("command" in step ? step.command.replace("pnpm ", "") : step.identity),
    (_handle, citedByStep) => (citedByStep !== undefined && rows.has(citedByStep) ? { scnId: citedByStep } : null)
  );
  return evidenceReconciliationOf(scenarios, fitnessObservationsOf(workflow, undefined), [], false, true);
}

describe("[SCN-LNT-031] a check step stating its row's code supplies that row's citation", () => {
  it("answers the obligation on the row the annotated step names and leaves the unannotated check in suspense", () => {
    expect(
      reconcileAnnotated().ledger.scenarioReconciliations.map((row) => [
        row.scnId,
        row.kind,
        row.verdict,
        row.qualityCheckReconciliations.map((item) => [item.fitnessFunction, item.outcome]),
      ])
    ).toEqual([
      ["SCN-CVT-001", "scenario", "balanced", [[undefined, "satisfied"]]],
      ["SCN-CVT-002", "scenario", "out-of-balance", [[undefined, "missing"]]],
      ["(no scenario)", "suspense-scenario", "out-of-balance", [["lint:beta", "cites-no-scenario"]]],
    ]);
  });
});
