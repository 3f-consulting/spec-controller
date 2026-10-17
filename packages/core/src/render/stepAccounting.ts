import type { RenderInput } from "../domain/renderInput.js";
import type { StepAccounting } from "../domain/evidenceReconciliation.js";
import { everyStepAccountedFor } from "../domain/uncitedFitnessFunctions.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";

const verdictOf = (accounting: StepAccounting): string =>
  everyStepAccountedFor(accounting)
    ? `- ${CORE_MESSAGES[CoreMessage.EveryStepAccountedFor]}`
    : `- ${CORE_MESSAGES[CoreMessage.StepsNotAccountedFor](accounting.stepsRead, accounting.accountedFor)}`;

export const stepAccountingSection = (report: RenderInput): string[] => {
  const accounting = report.summary.stepAccounting;
  if (accounting === undefined) return [];
  const { stepsRead, candidates, runners, reconciler, excluded, plumbing = 0, accountedFor } = accounting;
  return [
    CORE_MESSAGES[CoreMessage.StepAccountingHeading],
    "",
    CORE_MESSAGES[CoreMessage.StepAccountingTableHeader],
    "| --- | --- | --- | --- | --- | --- | --- |",
    `| ${stepsRead} | ${candidates} | ${runners} | ${reconciler} | ${excluded} | ${plumbing} | ${accountedFor} |`,
    "",
    verdictOf(accounting),
    "",
  ];
};
