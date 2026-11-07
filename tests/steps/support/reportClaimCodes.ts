import type { ScenarioName } from "./scenarioName.js";

const SECTION = "claimCodes";

// Where a refusal names the section, from the report's top.
export const CLAIM_CODES_PATH: string = `summary.${SECTION}`;

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

export function withClaimCodesOnReport<Report extends { readonly summary: object }>(report: Report, claimCodes: unknown): Report {
  return { ...report, summary: { ...report.summary, [SECTION]: claimCodes } };
}
