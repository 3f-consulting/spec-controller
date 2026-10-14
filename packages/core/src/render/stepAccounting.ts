import type { RenderInput } from "../domain/renderInput.js";
import type { StepAccounting } from "../domain/evidenceReconciliation.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";

const verdictOf = ({ stepsRead, accountedFor }: StepAccounting): string =>
  accountedFor === stepsRead
    ? `- ${CORE_MESSAGES[CoreMessage.EveryStepAccountedFor]}`
    : `- ${CORE_MESSAGES[CoreMessage.StepsNotAccountedFor](stepsRead, accountedFor)}`;

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
