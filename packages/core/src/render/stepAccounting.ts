import type { RenderInput } from "../assemble/renderInput.js";
import type { StepAccounting } from "../domain/evidenceReconciliation.js";

const verdictOf = ({ stepsRead, accountedFor }: StepAccounting): string =>
  accountedFor === stepsRead
    ? "- every step this run read is accounted for."
    : `- ${stepsRead} step(s) read, ${accountedFor} accounted for — the four dispositions do not ` +
      `add up to the steps this run read.`;

export const stepAccountingSection = (report: RenderInput): string[] => {
  const accounting = report.summary.stepAccounting;
  if (accounting === undefined) return [];
  const { stepsRead, candidates, runners, reconciler, excluded, accountedFor } = accounting;
  return [
    "### Step accounting",
    "",
    "| Steps read | Candidates | Runners | Reconciler | Excluded | Accounted for |",
    "| --- | --- | --- | --- | --- | --- |",
    `| ${stepsRead} | ${candidates} | ${runners} | ${reconciler} | ${excluded} | ${accountedFor} |`,
    "",
    verdictOf(accounting),
    "",
  ];
};
