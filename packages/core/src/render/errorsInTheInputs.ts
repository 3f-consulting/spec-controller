import type { RenderInput } from "../domain/renderInput.js";
import { configurationNotReadSection } from "./configurationNotRead.js";
import { scenarioCodeErrorsSection } from "./scenarioCodeErrorsSection.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";

export const errorsInTheInputsSection = (report: RenderInput): string[] => {
  const parts = [...scenarioCodeErrorsSection(report), ...configurationNotReadSection(report)];
  if (parts.length === 0) return [];
  return [CORE_MESSAGES[CoreMessage.ErrorsInTheInputsHeading], "", ...parts];
};
