import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";
import { reconcilerCi as ci, ciWithoutReconciler, feature, reconcilerPackageJson as packageJson } from "../evidenceReconciliation.test-utils.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { parsedWorkflows, workflowSteps } from "../parse/parsedWorkflows.test-utils.js";
import { reconcilerSteps } from "../domain/uncitedFitnessFunctions.js";
import { commandRuns } from "../parse/commandRuns.js";

function reconcile(
  workflowSources: readonly string[],
  workflowNames?: readonly string[]
): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    untaggedScenarios: [],
    packageJson,
    ciWorkflows: parsedWorkflows(workflowSources, workflowNames),
    reconcilerInvocation: "spec-controller balance",
    behaviouralObservations: [],
    deferralTags: [],
  });
}

describe("[SCN-RMD-014] the balance step and its step-record dump are not candidates, and no configuration says so", () => {

  it("labels each reconciler step by its identity when the target gives no workflow names", () => {
    const scripts = packageJson.scripts ?? {};
    const { steps } = reconcilerSteps(workflowSteps([ci]), () => undefined, (command) =>
      commandRuns(command, "spec-controller balance", scripts)
    );
    expect(steps).toStrictEqual([
      { step: "Dump this run's step record", role: "records" },
      { step: "Self-reconciliation balance", role: "reconciles" },
    ]);
  });

  it("carries no reconciler account for a pipeline that runs no reconciliation", () => {
    const { summary } = reconcile([ciWithoutReconciler], ["ci.yml"]);
    expect(summary).not.toHaveProperty("reconcilerSteps");
  });
});
