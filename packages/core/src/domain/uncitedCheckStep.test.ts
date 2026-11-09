import { describe, it, expect } from "vitest";
import { evidenceReconciliationOf } from "./evidenceReconciliation.js";
import { fitnessObservationsOf, workflowObservationsOf } from "./fitnessReconciliation.js";
import type { PipelineStep } from "./pipelineStep.js";
import { stepDispositions } from "./uncitedFitnessFunctions.js";
import { lineReadingsOf } from "./qualityCheckReconciliation.test-utils.js";

const unannotatedSteps: PipelineStep[] = [
  {
    workflow: "ci.yml",
    job: "quality",
    identity: "Checkout",
    writesStepRecord: false,
    abortsJob: true,
    plumbing: true,
    action: { name: "actions/checkout@v4" },
  },
  {
    workflow: "ci.yml",
    job: "quality",
    identity: "Set up Node",
    writesStepRecord: false,
    abortsJob: true,
    plumbing: true,
    action: { name: "actions/setup-node@v4" },
  },
  { workflow: "ci.yml", job: "quality", identity: "Install", writesStepRecord: false, abortsJob: true, plumbing: false, command: "pnpm install --frozen-lockfile" },
  { workflow: "ci.yml", job: "quality", identity: "Build", writesStepRecord: false, abortsJob: true, plumbing: false, command: "pnpm build" },
  { workflow: "ci.yml", job: "quality", identity: "Complexity", writesStepRecord: false, abortsJob: true, plumbing: false, command: "pnpm lint:alpha" },
  { workflow: "ci.yml", job: "quality", identity: "Traceability", writesStepRecord: false, abortsJob: true, plumbing: false, command: "pnpm lint:beta" },
  { workflow: "ci.yml", job: "quality", identity: "Types", writesStepRecord: false, abortsJob: true, plumbing: false, command: "pnpm typecheck" },
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
    (step) => step.identity,
    () => null
  );
  return evidenceReconciliationOf([], fitnessObservationsOf(workflow, undefined), []);
}

describe("[CLM-LNT-029] an unannotated pipeline is reported as every check it runs, citing nothing", () => {
  it("puts every check on the unnamed claim's one row and reports the steps that are not checks nowhere", () => {
    expect(
      reconcileUnannotated().ledger.claimReconciliations.map((row) => [
        row.claim,
        row.kind,
        row.verdict,
        lineReadingsOf(row.qualityCheckReconciliations),
      ])
    ).toEqual([
      [
        "(unnamed claim)",
        "unnamed-claim",
        "out-of-balance",
        [
          [["lint:alpha"], "cites-no-claim"],
          [["lint:beta"], "cites-no-claim"],
          [["typecheck"], "cites-no-claim"],
        ],
      ],
    ]);
  });
});
