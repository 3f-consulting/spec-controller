import type { RenderInput } from "../domain/renderInput.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";

type StepAccounting = NonNullable<RenderInput["summary"]["stepAccounting"]>;

const verdictOf = ({ everyStepAccountedFor, total }: StepAccounting): string =>
  everyStepAccountedFor
    ? `- ${CORE_MESSAGES[CoreMessage.EveryStepAccountedFor]}`
    : `- ${CORE_MESSAGES[CoreMessage.StepsNotAccountedFor](total.stepsRead, total.accountedFor)}`;

export const stepAccountingSection = (report: RenderInput): string[] => {
  const accounting = report.summary.stepAccounting;
  if (accounting === undefined) return [];
  const { stepsRead, candidates, runners, reconciler, excluded, plumbing, accountedFor } = accounting.total;
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
