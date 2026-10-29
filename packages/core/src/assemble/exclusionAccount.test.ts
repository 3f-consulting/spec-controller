import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";
import { errorsOf } from "../domain/renderInput.js";
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
    packageJson,
    ciWorkflows: parsedWorkflows([ci], ["ci.yml"]),
    behaviouralObservations: [],
    deferralTags: [],
  });
}

describe("[SCN-RMD-013] the step accounting names the steps the target calls non-checks, and none for a target that names no step a non-check", () => {
  it("names each step the target calls a non-check under its workflow, job and name, in step order", () => {
    const { summary } = reconcile(["ci.yml:quality:Types", "ci.yml:quality:Install"]);
    expect(summary.stepAccounting).toHaveProperty("steps.excluded");
    expect(summary.stepAccounting?.steps.excluded).toStrictEqual([
      "ci.yml:quality:Install",
      "ci.yml:quality:Types",
    ]);
  });

  it("reports an entry that names no step as a configuration error, and never names it among the non-checks", () => {
    const { summary } = reconcile(["ci.yml:quality:Types", "ci.yml:quality:Deploy"]);
    expect(summary.stepAccounting?.steps.excluded).toStrictEqual(["ci.yml:quality:Types"]);
    expect(errorsOf(undefined, summary)?.configuration?.nonChecksMatchingNoStep).toStrictEqual([
      "ci.yml:quality:Deploy",
    ]);
  });

  it("names no non-check for a target that names no step a non-check", () => {
    const { summary } = reconcile();
    expect(summary.stepAccounting).toHaveProperty("steps");
    expect(summary.stepAccounting?.steps).not.toHaveProperty("excluded");
    expect(summary).not.toHaveProperty("nonChecksMatchingNoStep");
  });
});
