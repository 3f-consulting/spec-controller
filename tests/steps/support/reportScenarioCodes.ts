import type { ScenarioName } from "./scenarioName.js";

const SECTION = "scenarioCodes";

// Where a refusal names the section, from the report's top.
export const SCENARIO_CODES_PATH: string = `summary.${SECTION}`;

export interface ScenarioCodesOnReport {
  readonly featureFiles?: number;
  readonly featureCodes?: number;
  readonly excludedOccurrences: number;
  readonly untaggedScenarios: ScenarioName[];
  readonly sharedScnCodes?: unknown[];
}

interface WithSummary {
  readonly summary: { readonly [SECTION]: ScenarioCodesOnReport };
}

export function scenarioCodesOnReport(report: unknown): ScenarioCodesOnReport {
  return (report as WithSummary).summary[SECTION];
}

export function withScenarioCodesOnReport<Report extends { readonly summary: object }>(report: Report, scenarioCodes: unknown): Report {
  return { ...report, summary: { ...report.summary, [SECTION]: scenarioCodes } };
}
