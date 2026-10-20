import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";
import { unitTestsAndTypesCi as ci, feature } from "../evidenceReconciliation.test-utils.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { parsedWorkflows } from "../parse/parsedWorkflows.test-utils.js";

const scripts = { test: "vitest run", typecheck: "tsc --noEmit" };

function reconcile(notChecks?: readonly string[]): EvidenceReconciliation {
  const specController = notChecks === undefined ? {} : { notChecks };
  const packageJson = { scripts, specController } as Parameters<
    typeof evidenceReconciliationFromSources
  >[0]["packageJson"];
  return evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    untaggedScenarios: [],
    packageJson,
    ciWorkflows: parsedWorkflows([ci]),
    behaviouralObservations: [],
    deferralTags: [],
  });
}

describe("[SCN-RMD-013] a step named in `notChecks` is not a candidate, and is reported as excluded rather than dropped", () => {
  it("carries neither account for a target that names no step a non-check", () => {
    const { summary } = reconcile();
    expect(summary).not.toHaveProperty("excludedSteps");
    expect(summary).not.toHaveProperty("nonChecksMatchingNoStep");
  });
});
