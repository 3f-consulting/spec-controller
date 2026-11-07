import type { ClaimCodesSection } from "../domain/renderInput.js";

const SECTION = "claimCodes";

interface WithSummary {
  readonly summary: { readonly [SECTION]?: ClaimCodesSection };
}

export function claimCodesOnReport(report: unknown): ClaimCodesSection | undefined {
  return (report as WithSummary).summary[SECTION];
}

export function withClaimCodesOnReport<Report extends WithSummary>(report: Report, claimCodes: ClaimCodesSection): Report {
  return { ...report, summary: { ...report.summary, [SECTION]: claimCodes } };
}
