import type { ScenarioCodesSection } from "../domain/renderInput.js";

const SECTION = "scenarioCodes";

interface WithSummary {
  readonly summary: { readonly [SECTION]?: ScenarioCodesSection };
}

export function scenarioCodesOnReport(report: unknown): ScenarioCodesSection | undefined {
  return (report as WithSummary).summary[SECTION];
}

export function withScenarioCodesOnReport<Report extends WithSummary>(report: Report, scenarioCodes: ScenarioCodesSection): Report {
  return { ...report, summary: { ...report.summary, [SECTION]: scenarioCodes } };
}
