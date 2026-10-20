import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";
import { reconcilerCi as ci, ciWithoutReconciler, feature, reconcilerPackageJson as packageJson } from "../evidenceReconciliation.test-utils.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { parsedWorkflows } from "../parse/parsedWorkflows.test-utils.js";

function reconcile(
  workflowSources: readonly string[],
  ciSourceNames?: readonly string[]
): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    untaggedScenarios: [],
    packageJson,
    ciWorkflows: parsedWorkflows(workflowSources),
    ...(ciSourceNames === undefined ? {} : { ciSourceNames }),
    reconcilerInvocation: "spec-controller balance",
    behaviouralObservations: [],
    deferralTags: [],
  });
}

describe("[SCN-RMD-014] the balance step and its step-record dump are not candidates, and no configuration says so", () => {

  it("labels each reconciler step by its identity when the target gives no workflow names", () => {
    const { summary } = reconcile([ci]);
    expect(summary.reconcilerSteps).toStrictEqual([
      { step: "Dump this run's step record", role: "records" },
      { step: "Self-reconciliation balance", role: "reconciles" },
    ]);
  });

  it("carries no reconciler account for a pipeline that runs no reconciliation", () => {
    const { summary } = reconcile([ciWithoutReconciler], ["ci.yml"]);
    expect(summary).not.toHaveProperty("reconcilerSteps");
  });
});
