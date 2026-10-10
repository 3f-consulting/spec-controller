import type { RenderInput } from "../assemble/renderInput.js";
import { CORE_MESSAGES, CoreMessage } from "../domain/messages.js";

export const fitnessFunctionsSection = (report: RenderInput): string[] => {
  const { fitnessFunctions: counts } = report.summary;
  if (!counts) return [];
  return [
    CORE_MESSAGES[CoreMessage.FitnessFunctionsHeading], "",
    CORE_MESSAGES[CoreMessage.FitnessFunctionsCounts](counts.runningFitnessFunctionCount, counts.uncitedFitnessFunctionCount),
    "",
  ];
};
