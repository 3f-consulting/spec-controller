import { describe, it, expect } from "vitest";
import { evidenceReconciliationOf } from "./evidenceReconciliation.js";
import { fitnessObservationsOf, workflowObservationsOf, type RecordedCheckStep } from "./fitnessReconciliation.js";
import type { Scenario } from "./journal.js";
import type { PipelineStep } from "./pipelineStep.js";
import { stepDispositions } from "./uncitedFitnessFunctions.js";
import { lineReadingsOf } from "./qualityCheckReconciliation.test-utils.js";

const scenarios: Scenario[] = [
  { claimCode: "CLM-AAA-001", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
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
    id: "CLM-AAA-001",
    writesStepRecord: false,
    abortsJob: true,
    plumbing: false,
    command: "pnpm lint:alpha",
  },
  { workflow: "ci.yml", job: "quality", identity: "Traceability", writesStepRecord: false, abortsJob: true, plumbing: false, command: "pnpm lint:beta" },
  { workflow: "ci.yml", job: "quality", identity: "Types", writesStepRecord: false, abortsJob: true, plumbing: false, command: "pnpm typecheck" },
];

const recorded: RecordedCheckStep[] = [{ citedClaimCode: "CLM-AAA-001", report: "succeeded" }];

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
    (step) => step.identity,
    (_handle, citedByStep) => (citedByStep === "CLM-AAA-001" ? { claimCode: citedByStep } : null)
  );
  return evidenceReconciliationOf(scenarios, fitnessObservationsOf(workflow, recorded), []);
}

describe("[CLM-LNT-029] a check step citing no claim code posts to the unnamed claim, which is the unannotated consumer's whole report", () => {
  it("keeps every uncited check on the unnamed claim's row where the run's step record answers the cited ones", () => {
    const unnamedClaimRows = reconcileWithRecord()
      .ledger.claimReconciliations.filter((row) => row.claim === "(unnamed claim)")
      .map((row) => [
        row.claim,
        row.kind,
        row.verdict,
        lineReadingsOf(row.qualityCheckReconciliations),
      ]);
    expect(unnamedClaimRows).toEqual([
      [
        "(unnamed claim)",
        "unnamed-claim",
        "out-of-balance",
        [
          [["lint:beta"], "cites-no-scenario"],
          [["typecheck"], "cites-no-scenario"],
        ],
      ],
    ]);
  });
});
