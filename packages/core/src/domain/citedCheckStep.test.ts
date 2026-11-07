import { describe, it, expect } from "vitest";
import type { Scenario } from "./journal.js";
import type { PipelineStep } from "./pipelineStep.js";
import { lineReadingsOf } from "./qualityCheckReconciliation.test-utils.js";
import { CHECKOUT, IN_THE_QUALITY_JOB, reconcileTheWorkflow } from "./checkStep.test-utils.js";

const scenarios: Scenario[] = [
  { claimCode: "CLM-CVT-001", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
  { claimCode: "CLM-CVT-002", evidenceObligations: [{ qualityCheckKind: "fitness" }] },
];

const annotatedSteps: PipelineStep[] = [
  CHECKOUT,
  { ...IN_THE_QUALITY_JOB, identity: "Complexity", id: "CLM-CVT-001", command: "pnpm lint:alpha" },
  { ...IN_THE_QUALITY_JOB, identity: "Traceability", command: "pnpm lint:beta" },
];

function reconcileAnnotated() {
  return reconcileTheWorkflow(scenarios, annotatedSteps);
}

describe("[CLM-LNT-031] a check step stating its row's code supplies that row's citation", () => {
  it("answers the obligation on the row the annotated step names and leaves the unannotated check on the unnamed claim", () => {
    expect(
      reconcileAnnotated().ledger.claimReconciliations.map((row) => [
        row.claim,
        row.kind,
        row.verdict,
        lineReadingsOf(row.qualityCheckReconciliations),
      ])
    ).toEqual([
      ["CLM-CVT-001", "scenario", "balanced", [[["lint:alpha"], "satisfied"]]],
      ["CLM-CVT-002", "scenario", "out-of-balance", [[[], "missing"]]],
      ["(unnamed claim)", "unnamed-claim", "out-of-balance", [[["lint:beta"], "cites-no-scenario"]]],
    ]);
  });
});
