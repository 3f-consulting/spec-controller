import { describe, it, expect } from "vitest";
import { evidenceReconciliationOf } from "./evidenceReconciliation.js";
import { fitnessObservationsOf, workflowObservationsOf } from "./fitnessReconciliation.js";
import type { PipelineStep } from "./pipelineStep.js";
import { stepDispositions } from "./uncitedFitnessFunctions.js";

const unannotatedSteps: PipelineStep[] = [
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
    identity: "Set up Node",
    writesStepRecord: false,
    abortsJob: true,
    action: { name: "actions/setup-node@v4", owner: "actions", repository: "setup-node" },
  },
  { sourceIndex: 0, job: "quality", identity: "Install", writesStepRecord: false, abortsJob: true, command: "pnpm install --frozen-lockfile" },
  { sourceIndex: 0, job: "quality", identity: "Build", writesStepRecord: false, abortsJob: true, command: "pnpm build" },
  { sourceIndex: 0, job: "quality", identity: "Complexity", writesStepRecord: false, abortsJob: true, command: "pnpm lint:alpha" },
  { sourceIndex: 0, job: "quality", identity: "Traceability", writesStepRecord: false, abortsJob: true, command: "pnpm lint:beta" },
  { sourceIndex: 0, job: "quality", identity: "Types", writesStepRecord: false, abortsJob: true, command: "pnpm typecheck" },
];

const nonChecks: readonly string[] = ["Install", "Build"];

function reconcileUnannotated() {
  const dispositionOf = stepDispositions({
    isReconciler: () => false,
    isNamedANonCheck: (step) => nonChecks.includes(step.identity),
    runsARunner: () => false,
  });
  const workflow = workflowObservationsOf(
    unannotatedSteps,
    (step) => dispositionOf(step) === "candidate",
    (step) => ("command" in step ? step.command.replace("pnpm ", "") : step.identity),
    () => null
  );
  return evidenceReconciliationOf([], fitnessObservationsOf(workflow, undefined), [], false, true);
}

describe("[SCN-LNT-029] an unannotated pipeline is reported as every check it runs, citing nothing", () => {
  it("puts every check on the unnamed claim's one row and reports the steps that are not checks nowhere", () => {
    expect(
      reconcileUnannotated().ledger.claimReconciliations.map((row) => [
        row.scnId,
        row.kind,
        row.verdict,
        row.qualityCheckReconciliations.map((item) => [item.fitnessFunction, item.outcome]),
      ])
    ).toEqual([
      [
        "(unnamed claim)",
        "unnamed-claim",
        "out-of-balance",
        [
          ["lint:alpha", "cites-no-scenario"],
          ["lint:beta", "cites-no-scenario"],
          ["typecheck", "cites-no-scenario"],
        ],
      ],
    ]);
  });
});
