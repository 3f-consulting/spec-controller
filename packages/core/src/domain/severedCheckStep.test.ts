import { describe, it, expect } from "vitest";
import { observationsOf } from "./claimReconciliation.js";
import type { PipelineStep } from "./pipelineStep.js";
import { lineReadingsOf } from "./qualityCheckReconciliation.test-utils.js";
import { CHECKOUT, FITNESS_SCENARIOS, IN_THE_QUALITY_JOB, reconcileTheWorkflow } from "./checkStep.test-utils.js";

const postedOf = <T extends { readonly outcome: unknown }>({ outcome: _outcome, ...posted }: T) => posted;

const severedSteps: PipelineStep[] = [
  CHECKOUT,
  { ...IN_THE_QUALITY_JOB, identity: "Complexity", id: "CLM-CVT-001", abortsJob: false, command: "pnpm lint:alpha" },
  { ...IN_THE_QUALITY_JOB, identity: "Anemic domain", id: "CLM-CVT-003", command: "pnpm lint:gamma" },
  { ...IN_THE_QUALITY_JOB, identity: "Module size", id: "CLM-CVT-004", command: "pnpm lint:delta" },
  { ...IN_THE_QUALITY_JOB, job: "advisory", identity: "Changelog entry match", id: "CLM-CVT-002", abortsJob: false, command: "pnpm lint:beta" },
  { ...IN_THE_QUALITY_JOB, job: "allowlist", identity: "Dependency allowlist", id: "CLM-CVT-005", command: "pnpm lint:epsilon" },
];

function reconcileSevered() {
  return reconcileTheWorkflow(FITNESS_SCENARIOS, severedSteps);
}

describe("[CLM-LNT-032] a check its job's verdict does not depend on reconciles as the watermelon, beside a sibling check whose red is the job's verdict", () => {
  it("reconciles each severed check as the watermelon and leaves the siblings satisfied", () => {
    expect(
      reconcileSevered().ledger.claimReconciliations.map((row) => [
        row.claim,
        row.kind,
        row.verdict,
        lineReadingsOf(row.qualityCheckReconciliations),
      ])
    ).toEqual([
      ["CLM-CVT-001", "scenario", "out-of-balance", [[["lint:alpha"], "watermelon"]]],
      ["CLM-CVT-002", "scenario", "out-of-balance", [[["lint:beta"], "watermelon"]]],
      ["CLM-CVT-003", "scenario", "balanced", [[["lint:gamma"], "satisfied"]]],
      ["CLM-CVT-004", "scenario", "balanced", [[["lint:delta"], "satisfied"]]],
      ["CLM-CVT-005", "scenario", "balanced", [[["lint:epsilon"], "satisfied"]]],
    ]);
  });

  it("still OBSERVES a severed check, as one that exists and enforces nothing", () => {
    const observed = reconcileSevered()
      .ledger.claimReconciliations.filter((row) => row.claim === "CLM-CVT-001" || row.claim === "CLM-CVT-002")
      .flatMap((row) => observationsOf(row).map(postedOf));
    const withoutStep = ({ step: _step, ...rest }: (typeof observed)[number] & { step?: string }) => rest;
    expect(observed.map(withoutStep)).toEqual([
      {
        qualityCheckKind: "fitness",
        fitnessFunction: "lint:alpha",
        exists: true,
        enforcedOverRealSource: false,
        claimCode: "CLM-CVT-001",
      },
      {
        qualityCheckKind: "fitness",
        fitnessFunction: "lint:beta",
        exists: true,
        enforcedOverRealSource: false,
        claimCode: "CLM-CVT-002",
      },
    ]);
  });
});
