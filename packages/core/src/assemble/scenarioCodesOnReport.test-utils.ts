import type { ClaimCodesSection } from "../domain/renderInput.js";

const SECTION = "claimCodes";

interface WithSummary {
  readonly summary: { readonly [SECTION]?: ClaimCodesSection };
}

export function scenarioCodesOnReport(report: unknown): ClaimCodesSection | undefined {
  return (report as WithSummary).summary[SECTION];
}

export function withScenarioCodesOnReport<Report extends WithSummary>(report: Report, claimCodes: ClaimCodesSection): Report {
  return { ...report, summary: { ...report.summary, [SECTION]: claimCodes } };
}
