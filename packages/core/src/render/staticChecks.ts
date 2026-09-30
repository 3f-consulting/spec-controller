import type { RenderInput } from "../assemble/renderInput.js";

export const staticChecksSection = (report: RenderInput): string[] => {
  const { staticChecks: counts } = report.summary;
  if (!counts) return [];
  return [
    "### Static checks", "",
    `${counts.runningStaticCheckCount} static check(s) run, ${counts.uncitedStaticCheckCount} uncited static check(s).`,
    "",
  ];
};
