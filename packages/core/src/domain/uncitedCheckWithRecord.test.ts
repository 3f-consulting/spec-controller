import { describe, it, expect } from "vitest";
import { evidenceReconciliationOf } from "./evidenceReconciliation.js";
import { fitnessObservationsOf, workflowObservationsOf, type RecordedCheckStep } from "./fitnessReconciliation.js";
import type { Scenario } from "./journal.js";
import type { PipelineStep } from "./pipelineStep.js";
import { stepDispositions } from "./uncitedFitnessFunctions.js";

const scenarios: Scenario[] = [
  { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "fitness" }] },
];

const partlyAnnotatedSteps: PipelineStep[] = [
  {
    workflow: "ci.yml",
    job: "quality",
    identity: "Checkout",
    writesStepRecord: false,
    abortsJob: true,
    plumbing: true,
    action: { name: "actions/checkout@v4" },
  },
  { workflow: "ci.yml", job: "quality", identity: "Install", writesStepRecord: false, abortsJob: true, plumbing: false, command: "pnpm install --frozen-lockfile" },
  {
    workflow: "ci.yml",
    job: "quality",
    identity: "Complexity",
    id: "SCN-AAA-001",
    writesStepRecord: false,
    abortsJob: true,
    plumbing: false,
    command: "pnpm lint:alpha",
  },
  { workflow: "ci.yml", job: "quality", identity: "Traceability", writesStepRecord: false, abortsJob: true, plumbing: false, command: "pnpm lint:beta" },
  { workflow: "ci.yml", job: "quality", identity: "Types", writesStepRecord: false, abortsJob: true, plumbing: false, command: "pnpm typecheck" },
];

const recorded: RecordedCheckStep[] = [{ citedScn: "SCN-AAA-001", report: "succeeded" }];

function reconcileWithRecord() {
  const dispositionOf = stepDispositions({
    isReconciler: () => false,
    isNamedANonCheck: (step) => step.identity === "Install",
    runsARunner: () => false,
  });
  const workflow = workflowObservationsOf(
    partlyAnnotatedSteps,
    (step) => dispositionOf(step) === "candidate",
    (step) => ("command" in step ? step.command.replace("pnpm ", "") : step.identity),
    (_handle, citedByStep) => (citedByStep === "SCN-AAA-001" ? { scnId: citedByStep } : null)
  );
  return evidenceReconciliationOf(scenarios, fitnessObservationsOf(workflow, recorded), [], false, true);
}

describe("[SCN-LNT-029] a check step citing no @SCN posts to the unnamed claim, which is the unannotated consumer's whole report", () => {
  it("keeps every uncited check on the unnamed claim's row where the run's step record answers the cited ones", () => {
    const unnamedClaimRows = reconcileWithRecord()
      .ledger.claimReconciliations.filter((row) => row.scnId === "(unnamed claim)")
      .map((row) => [
        row.scnId,
        row.kind,
        row.verdict,
        row.qualityCheckReconciliations.map((item) => [item.fitnessFunction, item.outcome]),
      ]);
    expect(unnamedClaimRows).toEqual([
      [
        "(unnamed claim)",
        "unnamed-claim",
        "out-of-balance",
        [
          ["lint:beta", "cites-no-scenario"],
          ["typecheck", "cites-no-scenario"],
        ],
      ],
    ]);
  });
});
