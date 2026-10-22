import { describe, it, expect } from "vitest";
import { evidenceReconciliationOf } from "./evidenceReconciliation.js";
import { fitnessObservationsOf, workflowObservationsOf } from "./fitnessReconciliation.js";
import type { Scenario } from "./journal.js";
import type { PipelineStep } from "./pipelineStep.js";
import { stepDispositions } from "./uncitedFitnessFunctions.js";

const scenarios: Scenario[] = [
  { scnId: "SCN-CVT-001", evidenceObligations: [{ qualityCheck: "fitness" }] },
  { scnId: "SCN-CVT-002", evidenceObligations: [{ qualityCheck: "fitness" }] },
  { scnId: "SCN-CVT-003", evidenceObligations: [{ qualityCheck: "fitness" }] },
  { scnId: "SCN-CVT-004", evidenceObligations: [{ qualityCheck: "fitness" }] },
  { scnId: "SCN-CVT-005", evidenceObligations: [{ qualityCheck: "fitness" }] },
];

const severedSteps: PipelineStep[] = [
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
    identity: "Complexity",
    id: "SCN-CVT-001",
    writesStepRecord: false,
    abortsJob: false,
    plumbing: false,
    command: "pnpm lint:alpha",
  },
  {
    workflow: "ci.yml",
    job: "quality",
    identity: "Anemic domain",
    id: "SCN-CVT-003",
    writesStepRecord: false,
    abortsJob: true,
    plumbing: false,
    command: "pnpm lint:gamma",
  },
  {
    workflow: "ci.yml",
    job: "quality",
    identity: "Module size",
    id: "SCN-CVT-004",
    writesStepRecord: false,
    abortsJob: true,
    plumbing: false,
    command: "pnpm lint:delta",
  },
  {
    workflow: "ci.yml",
    job: "advisory",
    identity: "Scenario sub-issue match",
    id: "SCN-CVT-002",
    writesStepRecord: false,
    abortsJob: false,
    plumbing: false,
    command: "pnpm lint:beta",
  },
  {
    workflow: "ci.yml",
    job: "allowlist",
    identity: "Dependency allowlist",
    id: "SCN-CVT-005",
    writesStepRecord: false,
    abortsJob: true,
    plumbing: false,
    command: "pnpm lint:epsilon",
  },
];

function reconcileSevered() {
  const dispositionOf = stepDispositions({
    isReconciler: () => false,
    isNamedANonCheck: (step) => step.identity === "Checkout",
    runsARunner: () => false,
  });
  const rows = new Set(scenarios.map((scenario) => scenario.scnId));
  const workflow = workflowObservationsOf(
    severedSteps,
    (step) => dispositionOf(step) === "candidate",
    (step) => ("command" in step ? step.command.replace("pnpm ", "") : step.identity),
    (_handle, citedByStep) => (citedByStep !== undefined && rows.has(citedByStep) ? { scnId: citedByStep } : null)
  );
  return evidenceReconciliationOf(scenarios, fitnessObservationsOf(workflow, undefined), [], false, true);
}

describe("[SCN-LNT-032] a check its job's verdict does not depend on reconciles as the watermelon, beside a sibling check whose red is the job's verdict", () => {
  it("reconciles each severed check as the watermelon and leaves the siblings satisfied", () => {
    expect(
      reconcileSevered().ledger.claimReconciliations.map((row) => [
        row.scnId,
        row.kind,
        row.verdict,
        row.qualityCheckReconciliations.map((item) => [item.fitnessFunction, item.outcome]),
      ])
    ).toEqual([
      ["SCN-CVT-001", "scenario", "out-of-balance", [[undefined, "watermelon"]]],
      ["SCN-CVT-002", "scenario", "out-of-balance", [[undefined, "watermelon"]]],
      ["SCN-CVT-003", "scenario", "balanced", [[undefined, "satisfied"]]],
      ["SCN-CVT-004", "scenario", "balanced", [[undefined, "satisfied"]]],
      ["SCN-CVT-005", "scenario", "balanced", [[undefined, "satisfied"]]],
    ]);
  });

  it("still OBSERVES a severed check, as one that exists and enforces nothing", () => {
    const observed = reconcileSevered()
      .ledger.claimReconciliations.filter((row) => row.scnId === "SCN-CVT-001" || row.scnId === "SCN-CVT-002")
      .flatMap((row) => row.evidenceObservations);
    expect(observed).toEqual([
      {
        qualityCheck: "fitness",
        fitnessFunction: "lint:alpha",
        exists: true,
        enforcedOverRealSource: false,
        scnId: "SCN-CVT-001",
      },
      {
        qualityCheck: "fitness",
        fitnessFunction: "lint:beta",
        exists: true,
        enforcedOverRealSource: false,
        scnId: "SCN-CVT-002",
      },
    ]);
  });
});
