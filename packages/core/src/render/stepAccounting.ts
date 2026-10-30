import type { RenderInput } from "../domain/renderInput.js";
import type { ReconcilerStep } from "../domain/evidenceReconciliation.js";
import { accountedForOf } from "../domain/uncitedFitnessFunctions.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";

type StepAccounting = NonNullable<RenderInput["summary"]["stepAccounting"]>;

const rowOf = (cells: readonly (string | number)[]): string => `| ${cells.join(" | ")} |`;

const jobRowsOf = ({ byJob }: StepAccounting): string[] =>
  byJob.map((row) =>
    rowOf([
      row.workflow,
      row.job,
      row.stepsRead,
      row.candidates,
      row.runners,
      row.reconciler,
      row.excluded,
      row.plumbing,
      accountedForOf(row),
    ])
  );

const totalRowOf = ({ byJob, total }: StepAccounting): string[] => {
  if (byJob.length < 2) return [];
  const { stepsRead, candidates, runners, reconciler, excluded, plumbing, accountedFor } = total;
  const counts = rowOf([stepsRead, candidates, runners, reconciler, excluded, plumbing, accountedFor]);
  return [`| ${CORE_MESSAGES[CoreMessage.StepAccountingTotal]} | ${counts}`];
};

const WHAT_IT_IS: Readonly<Record<ReconcilerStep["role"], string>> = {
  reconciles: CORE_MESSAGES[CoreMessage.ReconcilerReconciles],
  records: CORE_MESSAGES[CoreMessage.ReconcilerRecords],
};

const runnersListOf = ({ steps }: StepAccounting): string[] => {
  const runners = steps.runners ?? [];
  if (runners.length === 0) return [];
  return [CORE_MESSAGES[CoreMessage.StepAccountingRunnersLabel], ...runners.map((step) => `- ${step}`), ""];
};

const reconcilerListOf = ({ steps }: StepAccounting): string[] => {
  const reconciler = steps.reconciler ?? [];
  if (reconciler.length === 0) return [];
  return [
    CORE_MESSAGES[CoreMessage.StepAccountingReconcilerLabel],
    ...reconciler.map(({ step, role }) => `- ${CORE_MESSAGES[CoreMessage.ReconcilerStep](step, WHAT_IT_IS[role])}`),
    "",
  ];
};

const excludedListOf = ({ steps }: StepAccounting): string[] => {
  const excluded = steps.excluded ?? [];
  if (excluded.length === 0) return [];
  return [
    CORE_MESSAGES[CoreMessage.StepAccountingExcludedLabel],
    ...excluded.map((step) => `- ${CORE_MESSAGES[CoreMessage.StepExcluded](step)}`),
    "",
  ];
};

const plumbingListOf = ({ steps }: StepAccounting): string[] => {
  const plumbing = steps.plumbing ?? [];
  if (plumbing.length === 0) return [];
  return [CORE_MESSAGES[CoreMessage.StepAccountingPlumbingLabel], ...plumbing.map((step) => `- ${step}`), ""];
};

export const stepAccountingSection = (report: RenderInput): string[] => {
  const accounting = report.summary.stepAccounting;
  if (accounting === undefined) return [];
  return [
    CORE_MESSAGES[CoreMessage.StepAccountingHeading],
    "",
    CORE_MESSAGES[CoreMessage.StepAccountingTableHeader],
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...jobRowsOf(accounting),
    ...totalRowOf(accounting),
    "",
    ...runnersListOf(accounting),
    ...reconcilerListOf(accounting),
    ...excludedListOf(accounting),
    ...plumbingListOf(accounting),
  ];
};
