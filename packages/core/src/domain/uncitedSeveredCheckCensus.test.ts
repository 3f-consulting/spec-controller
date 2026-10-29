import { describe, it, expect } from "vitest";
import { observationsOf } from "./claimReconciliation.js";
import { evidenceReconciliationOf } from "./evidenceReconciliation.js";
import { fitnessObservationsOf, workflowObservationsOf } from "./fitnessReconciliation.js";
import type { PipelineStep } from "./pipelineStep.js";
import { stepDispositions } from "./uncitedFitnessFunctions.js";

const postedOf = <T extends { readonly outcome: unknown }>({ outcome: _outcome, ...posted }: T) => posted;

const uncitedSteps: PipelineStep[] = [
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
    identity: "Advisory analysis",
    writesStepRecord: false,
    abortsJob: false,
    plumbing: false,
    command: "pnpm lint:advisory",
  },
  {
    workflow: "ci.yml",
    job: "quality",
    identity: "Enforced analysis",
    writesStepRecord: false,
    abortsJob: true,
    plumbing: false,
    command: "pnpm lint:enforced",
  },
];

function reconcileUncited() {
  const dispositionOf = stepDispositions({
    isReconciler: () => false,
    isNamedANonCheck: (step) => step.identity === "Checkout",
    runsARunner: () => false,
  });
  const workflow = workflowObservationsOf(
    uncitedSteps,
    (step) => dispositionOf(step) === "candidate",
    (step) => ("command" in step ? step.command.replace("pnpm ", "") : step.identity),
    () => null
  );
  return evidenceReconciliationOf(
    [{ scnId: "SCN-TSC-001", evidenceObligations: [{ qualityCheck: "unit" }] }],
    fitnessObservationsOf(workflow, undefined),
    [],
    false,
    true
  );
}

describe("[SCN-LNT-033] the fitness-function census counts a check whose red its job survives as a check that ran", () => {
  it("still POSTS both checks to the unnamed claim's row, the severed one included", () => {
    const unnamedClaimRows = reconcileUncited().ledger.claimReconciliations.filter(
      (row) => row.kind === "unnamed-claim"
    );
    expect(unnamedClaimRows.flatMap((row) => observationsOf(row).map(postedOf))).toEqual([
      {
        qualityCheck: "fitness",
        fitnessFunction: "lint:advisory",
        exists: true,
        enforcedOverRealSource: false,
      },
      {
        qualityCheck: "fitness",
        fitnessFunction: "lint:enforced",
        exists: true,
        enforcedOverRealSource: true,
      },
    ]);
  });
});
