import type { RenderInput } from "../domain/renderInput.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";

type ConcludedAccounting = NonNullable<RenderInput["summary"]["stepAccounting"]>;

const verdictOf = (accounting: ConcludedAccounting): string =>
  accounting.everyStepAccountedFor
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
