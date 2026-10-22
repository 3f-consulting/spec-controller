import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";
import { unitTestsCi as ci, nightly, feature, discoveryScopePackageJson as packageJson } from "../evidenceReconciliation.test-utils.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { parsedWorkflows } from "../parse/parsedWorkflows.test-utils.js";

function reconcile(
  workflowSources: readonly string[],
  files?: readonly string[],
  manifest: typeof packageJson = packageJson
): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    packageJson: manifest,
    ciWorkflows: parsedWorkflows(workflowSources, files),
    behaviouralObservations: [],
    deferralTags: [],
  });
}

describe("[SCN-RMD-012] the report names the workflows, the jobs and the step count discovery ranged over", () => {
  it("names every workflow and every job it read, with its steps and candidates, in one settled order", () => {
    const { summary } = reconcile([nightly, ci], ["nightly.yml", "ci.yml"]);
    expect(summary.discoveryScope).toStrictEqual([
      { source: "ci.yml", job: "quality", steps: 3, candidates: 1 },
      { source: "nightly.yml", job: "audit", steps: 1, candidates: 1 },
      { source: "nightly.yml", job: "sweep", steps: 2, candidates: 2 },
    ]);
  });

  it("counts no step the target calls a non-check among the candidates", () => {
    const { summary } = reconcile([nightly, ci], ["nightly.yml", "ci.yml"], {
      ...packageJson,
      specController: { runners: { unit: "vitest" }, notChecks: ["ci.yml:quality:Install"] },
    });
    expect(summary.discoveryScope).toStrictEqual([
      { source: "ci.yml", job: "quality", steps: 3, candidates: 0 },
      { source: "nightly.yml", job: "audit", steps: 1, candidates: 1 },
      { source: "nightly.yml", job: "sweep", steps: 2, candidates: 2 },
    ]);
  });

  it("carries no discovery scope for a target with no pipeline", () => {
    const { summary } = reconcile([], []);
    expect(summary).not.toHaveProperty("discoveryScope");
  });
});
