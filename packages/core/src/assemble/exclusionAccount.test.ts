import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";
import { unitTestsAndTypesCi as ci, feature } from "../evidenceReconciliation.test-utils.js";

const scripts = { test: "vitest run", typecheck: "tsc --noEmit" };

const excludedStep = "ci.yml:quality:Types";
const strayEntry = "ci.yml:quality:Lint";

function reconcile(notChecks?: readonly string[]): EvidenceReconciliation {
  const specController = notChecks === undefined ? {} : { notChecks };
  const packageJson = { scripts, specController } as Parameters<
    typeof evidenceReconciliationFromSources
  >[0]["packageJson"];
  return evidenceReconciliationFromSources({
    featureSources: [feature],
    untaggedScenarios: [],
    packageJson,
    ciSources: [ci],
    ciSourceNames: ["ci.yml"],
    runtimeObservations: [],
    deferralTags: [],
  });
}

describe("[SCN-USG-015] a step named in `notChecks` is not a candidate, and is reported as excluded rather than dropped", () => {
  it("names the excluded step and the entry that matched no step", () => {
    const { summary } = reconcile([excludedStep, strayEntry]);
    expect(summary.excludedSteps).toEqual([excludedStep]);
    expect(summary.unmatchedNotChecks).toEqual([strayEntry]);
  });

  it("carries neither account for a target that names no step a non-check", () => {
    const { summary } = reconcile();
    expect(summary).not.toHaveProperty("excludedSteps");
    expect(summary).not.toHaveProperty("unmatchedNotChecks");
  });
});
