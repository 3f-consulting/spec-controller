import type { RenderInput } from "../domain/renderInput.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";

export const excludedStepsSection = (report: RenderInput): string[] => {
  const excluded = report.summary.stepAccounting?.steps.excluded ?? [];
  const unmatched = report.errors?.configuration?.nonChecksMatchingNoStep ?? [];
  if (excluded.length === 0 && unmatched.length === 0) return [];
  return [
    CORE_MESSAGES[CoreMessage.ExcludedStepsHeading],
    "",
    ...excluded.map((entry) => `- ${CORE_MESSAGES[CoreMessage.StepExcluded](entry)}`),
    ...unmatched.map((entry) => `- ${CORE_MESSAGES[CoreMessage.NotChecksEntryMatchesNoStep](entry)}`),
    "",
  ];
};
