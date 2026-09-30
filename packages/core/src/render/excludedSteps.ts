import type { RenderInput } from "../assemble/renderInput.js";

export const excludedStepsSection = (report: RenderInput): string[] => {
  const excluded = report.summary.excludedSteps ?? [];
  const unmatched = report.summary.unmatchedNotChecks ?? [];
  if (excluded.length === 0 && unmatched.length === 0) return [];
  return [
    "### Excluded steps",
    "",
    ...excluded.map((entry) => `- ${entry} — excluded: the target names this step a non-check.`),
    ...unmatched.map(
      (entry) => `- ${entry} — matches no step: the entry names nothing this run read.`
    ),
    "",
  ];
};
