import { describe, it, expect } from "vitest";
import { renderJson } from "./composers.js";
import type { RenderInput } from "../domain/renderInput.js";
import { stepAccountingCi as ci, reconcileStepAccounting as reconcile } from "../evidenceReconciliation.test-utils.js";
import { sectionCtx as ctx } from "../render/runContext.test-utils.js";

function savedReport(): RenderInput {
  return JSON.parse(renderJson(reconcile([ci]), ctx)) as RenderInput;
}

describe("[SCN-RMD-025] the summary states the CI steps the run read in its step accounting alone, carrying no discovery scope, reconciler or excluded steps beside it", () => {
  it("reads a pipeline with a reconciler, a non-check, a runner and plumbing, each counted and named in the step accounting", () => {
    const accounting = savedReport().summary.stepAccounting!;
    expect(accounting.total).toMatchObject({ runners: 1, reconciler: 2, nonChecks: 3 });
    expect(accounting.total.plumbing).toBeGreaterThan(0);
    expect(Object.keys(accounting.steps).sort()).toStrictEqual(["nonChecks", "plumbing", "reconciler", "runners"]);
  });

  it("carries no discovery scope, reconciler steps or excluded steps on the summary", () => {
    const { summary } = savedReport();
    expect(summary).not.toHaveProperty("discoveryScope");
    expect(summary).not.toHaveProperty("reconcilerSteps");
    expect(summary).not.toHaveProperty("excludedSteps");
  });

  it("holds in the step accounting its rows, its total and the steps behind its counts, with no discovery scope, reconciler steps, excluded steps or verdict on accounting beside them", () => {
    const accounting = savedReport().summary.stepAccounting!;
    expect(Object.keys(accounting)).toEqual(expect.arrayContaining(["byJob", "steps", "total"]));
    expect(Object.keys(accounting).filter((key) => ["discoveryScope", "reconcilerSteps", "excludedSteps", "everyStepAccountedFor"].includes(key))).toStrictEqual([]);
  });
});
