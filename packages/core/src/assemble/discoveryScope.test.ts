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

describe("[SCN-RMD-012] the step accounting carries a row per workflow and job read, with its steps read and each disposition's count, in a settled order, and none for a target with no pipeline", () => {
  it("carries a row for every workflow and job read, with its steps read and each disposition's count, in one settled order", () => {
    const { summary } = reconcile([nightly, ci], ["nightly.yml", "ci.yml"]);
    expect(summary.stepAccounting?.byJob).toStrictEqual([
      { workflow: "ci.yml", job: "quality", stepsRead: 3, candidates: 1, runners: 1, reconciler: 0, excluded: 0, plumbing: 1 },
      { workflow: "nightly.yml", job: "audit", stepsRead: 1, candidates: 1, runners: 0, reconciler: 0, excluded: 0, plumbing: 0 },
      { workflow: "nightly.yml", job: "sweep", stepsRead: 2, candidates: 2, runners: 0, reconciler: 0, excluded: 0, plumbing: 0 },
    ]);
  });

  it("counts a step the target calls a non-check as excluded, not as a candidate, in its row", () => {
    const { summary } = reconcile([nightly, ci], ["nightly.yml", "ci.yml"], {
      ...packageJson,
      specController: { runners: { unit: "vitest" }, notChecks: ["ci.yml:quality:Install"] },
    });
    expect(summary.stepAccounting?.byJob).toStrictEqual([
      { workflow: "ci.yml", job: "quality", stepsRead: 3, candidates: 0, runners: 1, reconciler: 0, excluded: 1, plumbing: 1 },
      { workflow: "nightly.yml", job: "audit", stepsRead: 1, candidates: 1, runners: 0, reconciler: 0, excluded: 0, plumbing: 0 },
      { workflow: "nightly.yml", job: "sweep", stepsRead: 2, candidates: 2, runners: 0, reconciler: 0, excluded: 0, plumbing: 0 },
    ]);
  });

  it("carries no step accounting for a target with no pipeline", () => {
    const { summary } = reconcile([], []);
    expect(summary).not.toHaveProperty("stepAccounting");
  });
});
