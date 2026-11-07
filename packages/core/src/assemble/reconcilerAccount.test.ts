import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";
import { reconcilerCi as ci, ciWithoutReconciler, feature, reconcilerPackageJson as packageJson } from "../evidenceReconciliation.test-utils.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { parsedWorkflows } from "../parse/parsedWorkflows.test-utils.js";

function reconcile(
  workflowSources: readonly string[],
  files?: readonly string[]
): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    packageJson,
    ciWorkflows: parsedWorkflows(workflowSources, files),
    reconcilerInvocation: "spec-controller balance",
    behaviouralObservations: [],
    deferralTags: [],
  });
}

describe("[CLM-RMD-014] the step accounting names each reconciler step with its role, and none for a pipeline that runs no reconciliation", () => {

  it("names each reconciler step under its workflow, job and name, with its role, in step order", () => {
    const { summary } = reconcile([ci], ["ci.yml"]);
    expect(summary.stepAccounting).toHaveProperty("steps.reconciler");
    expect(summary.stepAccounting?.steps.reconciler).toStrictEqual([
      { step: "ci.yml:ci:Dump this run's step record", role: "records" },
      { step: "ci.yml:ci:Reconciliation", role: "reconciles" },
    ]);
  });

  it("names no reconciler step for a pipeline that runs no reconciliation", () => {
    const { summary } = reconcile([ciWithoutReconciler], ["ci.yml"]);
    expect(summary.stepAccounting).toHaveProperty("steps");
    expect(summary.stepAccounting?.steps).not.toHaveProperty("reconciler");
  });
});
