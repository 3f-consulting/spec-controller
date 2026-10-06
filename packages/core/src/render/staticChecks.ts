import type { RenderInput } from "../assemble/renderInput.js";
import { CORE_MESSAGES, CoreMessage } from "../domain/messages.js";

export const staticChecksSection = (report: RenderInput): string[] => {
  const { staticChecks: counts } = report.summary;
  if (!counts) return [];
  return [
    CORE_MESSAGES[CoreMessage.StaticChecksHeading], "",
    CORE_MESSAGES[CoreMessage.StaticChecksCounts](counts.runningStaticCheckCount, counts.uncitedStaticCheckCount),
    "",
  ];
};
