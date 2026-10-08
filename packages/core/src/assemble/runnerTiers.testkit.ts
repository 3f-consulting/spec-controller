import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";

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
      featureSources: [feature],
      untaggedScenarios: [],
      packageJson,
      ciSources: [ci],
      ciSourceNames: ["ci.yml"],
      runtimeObservations: [],
      deferralTags: [],
    });
  };
}
