import type { RenderInput } from "../domain/renderInput.js";
import type { ReconcilerStep } from "../domain/evidenceReconciliation.js";
import { accountedForOf } from "../domain/uncitedFitnessFunctions.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";
import { cellSafe } from "./cellSafe.js";
import { codeSpan } from "./codeSpan.js";

type StepAccounting = NonNullable<RenderInput["summary"]["stepAccounting"]>;

const rowOf = (cells: readonly (string | number)[]): string => `| ${cells.join(" | ")} |`;

const jobRowsOf = ({ byJob }: StepAccounting): string[] =>
  byJob.map((row) =>
    rowOf([
      cellSafe(row.workflow),
      cellSafe(row.job),
      row.stepsRead,
      row.candidates,
      row.runners,
      row.reconciler,
      row.nonChecks,
      row.plumbing,
      accountedForOf(row),
    ])
  );

const totalRowOf = ({ byJob, total }: StepAccounting): string[] => {
  if (byJob.length < 2) return [];
  const { stepsRead, candidates, runners, reconciler, nonChecks, plumbing } = total;
  const counts = rowOf([stepsRead, candidates, runners, reconciler, nonChecks, plumbing, accountedForOf(total)]);
  return [`| ${CORE_MESSAGES[CoreMessage.StepAccountingTotal]} | ${counts}`];
};

const tableOf = (accounting: StepAccounting): string[] => {
  if (accounting.byJob.length === 0) return [];
  return [
    CORE_MESSAGES[CoreMessage.StepAccountingTableHeader],
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...jobRowsOf(accounting),
    ...totalRowOf(accounting),
    "",
  ];
};

const WHAT_IT_IS: Readonly<Record<ReconcilerStep["role"], string>> = {
  reconciles: CORE_MESSAGES[CoreMessage.ReconcilerReconciles],
  records: CORE_MESSAGES[CoreMessage.ReconcilerRecords],
};

const runnersListOf = ({ steps }: StepAccounting): string[] => {
  const runners = steps.runners ?? [];
  if (runners.length === 0) return [];
  return [CORE_MESSAGES[CoreMessage.StepAccountingRunnersLabel], ...runners.map((step) => `- ${codeSpan(step)}`), ""];
};

const reconcilerListOf = ({ steps }: StepAccounting): string[] => {
  const reconciler = steps.reconciler ?? [];
  if (reconciler.length === 0) return [];
  return [
    CORE_MESSAGES[CoreMessage.StepAccountingReconcilerLabel],
    ...reconciler.map(({ step, role }) => `- ${CORE_MESSAGES[CoreMessage.ReconcilerStep](codeSpan(step), WHAT_IT_IS[role])}`),
    "",
  ];
};

const nonChecksListOf = ({ steps }: StepAccounting): string[] => {
  const nonChecks = steps.nonChecks ?? [];
  if (nonChecks.length === 0) return [];
  return [
    CORE_MESSAGES[CoreMessage.StepAccountingExcludedLabel],
    ...nonChecks.map((step) => `- ${CORE_MESSAGES[CoreMessage.StepExcluded](codeSpan(step))}`),
    "",
  ];
};

const workflowsReadOf = ({ workflowsRead, byJob }: StepAccounting): string => {
  const workflows = [...new Set(workflowsRead ?? byJob.map(({ workflow }) => workflow))];
  if (workflows.length === 0) return CORE_MESSAGES[CoreMessage.StepAccountingNoWorkflowRead];
  return workflows.map((workflow) => codeSpan(workflow)).join(", ");
};

const notAppliedListOf = (accounting: StepAccounting): string[] => {
  const notApplied = accounting.nonChecksNamingAWorkflowNotRead;
  if (notApplied === undefined) return [];
  return [
    CORE_MESSAGES[CoreMessage.StepAccountingNotAppliedLabel]("`specController.notChecks`", workflowsReadOf(accounting)),
    ...notApplied.map((entry) => `- ${codeSpan(entry)}`),
    "",
  ];
};

const plumbingListOf = ({ steps }: StepAccounting): string[] => {
  const plumbing = steps.plumbing ?? [];
  if (plumbing.length === 0) return [];
  return [CORE_MESSAGES[CoreMessage.StepAccountingPlumbingLabel], ...plumbing.map((step) => `- ${codeSpan(step)}`), ""];
};

export const stepAccountingSection = (report: RenderInput): string[] => {
  const accounting = report.summary.stepAccounting;
  if (accounting === undefined) return [];
  return [
    CORE_MESSAGES[CoreMessage.StepAccountingHeading],
    "",
    ...tableOf(accounting),
    ...runnersListOf(accounting),
    ...reconcilerListOf(accounting),
    ...nonChecksListOf(accounting),
    ...notAppliedListOf(accounting),
    ...plumbingListOf(accounting),
  ];
};
