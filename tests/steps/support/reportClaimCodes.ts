import type { ScenarioName } from "./scenarioName.js";

const SECTION = "claimCodes";

export interface ClaimCodesOnReport {
  readonly featureFiles?: number;
  readonly featureCodes?: number;
  readonly excludedOccurrences: number;
  readonly untaggedScenarios: ScenarioName[];
  readonly sharedClaimCodes?: unknown[];
}

interface WithSummary {
  readonly summary: { readonly [SECTION]: ClaimCodesOnReport };
}

export function claimCodesOnReport(report: unknown): ClaimCodesOnReport {
  return (report as WithSummary).summary[SECTION];
}
