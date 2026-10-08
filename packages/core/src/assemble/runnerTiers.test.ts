import { describe, it, expect } from "vitest";
import { runnersReconciler } from "./runnerTiers.testkit.js";
import { unitTestsCi as ci, feature } from "../evidenceReconciliation.testkit.js";

const scripts = { test: "vitest run" };

const reconcile = runnersReconciler(feature, ci, scripts);

describe("[SCN-USG-016] a null runner reports the tier as having none, and an absent key reports it as unnamed", () => {
  it("carries the performance tier as having no runner for a target that says it has none", () => {
    const { summary } = reconcile({ unit: "vitest", performance: null });
    expect(summary.runnerTiers).toStrictEqual({ unit: "vitest", performance: null });
  });

  it("carries no performance tier for a target alike but for saying nothing about performance", () => {
    const { summary } = reconcile({ unit: "vitest" });
    expect(summary.runnerTiers).toStrictEqual({ unit: "vitest" });
    expect(summary.runnerTiers).not.toHaveProperty("performance");
  });

  it("carries no runner tiers for a target with no runners block", () => {
    const { summary } = reconcile();
    expect(summary).not.toHaveProperty("runnerTiers");
  });
});
