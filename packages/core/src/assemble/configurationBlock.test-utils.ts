import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";
import { unitTestsAndTypesCi as ci, feature } from "../evidenceReconciliation.test-utils.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { parsedWorkflows } from "../parse/parsedWorkflows.test-utils.js";

export const block = {
  runners: { unit: "vitest", performance: null },
  notChecks: ["ci.yml:quality:Checkout", "ci.yml:quality:Install"],
  deferralTags: ["deferred"],
};

const scripts = { test: "vitest run", typecheck: "tsc --noEmit" };

export function reconcileConfiguration(specController: unknown): EvidenceReconciliation {
  const packageJson = (specController === undefined ? { scripts } : { scripts, specController }) as Parameters<
    typeof evidenceReconciliationFromSources
  >[0]["packageJson"];
  return evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    packageJson,
    ciWorkflows: parsedWorkflows([ci]),
    behaviouralObservations: [],
    deferralTags: [],
  });
}
