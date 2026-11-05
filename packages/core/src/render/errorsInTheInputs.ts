import type { RenderInput } from "../domain/renderInput.js";
import { configurationNotReadSection } from "./configurationNotRead.js";
import { scenarioCodeErrorsSection } from "./scenarioCodeErrorsSection.js";
import { CoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";
import { markdownHeading } from "./heading.js";

export const errorsInTheInputsSection = (report: RenderInput): string[] => {
  const parts = [...scenarioCodeErrorsSection(report), ...configurationNotReadSection(report)];
  if (parts.length === 0) return [];
  return [markdownHeading(2, coreMessage(CoreMessage.ErrorsInTheInputsHeading)), "", ...parts];
};
