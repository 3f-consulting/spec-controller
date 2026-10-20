import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { parsedWorkflows } from "../parse/parsedWorkflows.test-utils.js";

export function runnersReconciler(
  feature: string,
  ci: string,
  scripts: Record<string, string>,
): (runners?: Record<string, string | null>) => EvidenceReconciliation {
  return (runners) => {
    const specController = runners === undefined ? {} : { runners };
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
  };
}
