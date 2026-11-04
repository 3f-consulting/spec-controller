import type { RenderInput } from "../domain/renderInput.js";
import type { ReconcilerStep } from "../domain/evidenceReconciliation.js";
import { accountedForOf } from "../domain/uncitedFitnessFunctions.js";
import { CoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";
import { markdownHeading } from "./heading.js";
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
  return [`| ${coreMessage(CoreMessage.StepAccountingTotal)} | ${counts}`];
};

const STEP_ACCOUNTING_TERMS = [
  CoreMessage.StepAccountingCandidatesTerm,
  CoreMessage.StepAccountingReconcilerTerm,
  CoreMessage.StepAccountingNonChecksTerm,
  CoreMessage.StepAccountingPlumbingTerm,
  CoreMessage.StepAccountingAccountedForTerm,
] as const;

const tableOf = (accounting: StepAccounting): string[] => {
  if (accounting.byJob.length === 0) return [];
  return [
    ...STEP_ACCOUNTING_TERMS.map((term) => `- ${coreMessage(term)}`),
    "",
    coreMessage(CoreMessage.StepAccountingTableHeader),
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...jobRowsOf(accounting),
    ...totalRowOf(accounting),
    "",
  ];
};

const WHAT_IT_IS = {
  reconciles: CoreMessage.ReconcilerReconciles,
  records: CoreMessage.ReconcilerRecords,
} as const satisfies Readonly<Record<ReconcilerStep["role"], CoreMessage>>;

const runnersListOf = ({ steps }: StepAccounting): string[] => {
  const runners = steps.runners ?? [];
  if (runners.length === 0) return [];
  return [coreMessage(CoreMessage.StepAccountingRunnersLabel), ...runners.map((step) => `- ${codeSpan(step)}`), ""];
};

const reconcilerListOf = ({ steps }: StepAccounting): string[] => {
  const reconciler = steps.reconciler ?? [];
  if (reconciler.length === 0) return [];
  return [
    coreMessage(CoreMessage.StepAccountingReconcilerLabel),
    ...reconciler.map(({ step, role }) => `- ${coreMessage(CoreMessage.ReconcilerStep, { step: codeSpan(step), whatItIs: coreMessage(WHAT_IT_IS[role]) })}`),
    "",
  ];
};

const nonChecksListOf = ({ steps }: StepAccounting): string[] => {
  const nonChecks = steps.nonChecks ?? [];
  if (nonChecks.length === 0) return [];
  return [
    coreMessage(CoreMessage.StepAccountingNonChecksLabel),
    ...nonChecks.map((step) => `- ${coreMessage(CoreMessage.StepNonCheck, { entry: codeSpan(step) })}`),
    "",
  ];
};

type WorkflowsReadView = { readonly kind: "none" } | { readonly kind: "read"; readonly files: readonly [string, ...(readonly string[])] };

const workflowsReadOf = ({ workflowsRead, byJob }: StepAccounting): WorkflowsReadView => {
  const [first, ...rest] = new Set(workflowsRead ?? byJob.map(({ workflow }) => workflow));
  if (first === undefined) return { kind: "none" };
  return { kind: "read", files: [first, ...rest] };
};

const NOT_CHECKS_KEY = "`specController.notChecks`";

const notAppliedLeadOf = (view: WorkflowsReadView): string => {
  switch (view.kind) {
    case "none":
      return coreMessage(CoreMessage.StepAccountingNotAppliedNoWorkflowReadLabel, { key: NOT_CHECKS_KEY });
    case "read":
      return coreMessage(CoreMessage.StepAccountingNotAppliedWorkflowsReadLabel, {
        key: NOT_CHECKS_KEY,
        workflows: view.files.map((workflow) => codeSpan(workflow)).join(", "),
      });
  }
};

const notAppliedListOf = (accounting: StepAccounting): string[] => {
  const notApplied = accounting.nonChecksNamingAWorkflowNotRead;
  if (notApplied === undefined) return [];
  return [notAppliedLeadOf(workflowsReadOf(accounting)), ...notApplied.map((entry) => `- ${codeSpan(entry)}`), ""];
};

const plumbingListOf = ({ steps }: StepAccounting): string[] => {
  const plumbing = steps.plumbing ?? [];
  if (plumbing.length === 0) return [];
  return [coreMessage(CoreMessage.StepAccountingPlumbingLabel), ...plumbing.map((step) => `- ${codeSpan(step)}`), ""];
};

export const stepAccountingSection = (report: RenderInput): string[] => {
  const accounting = report.summary.stepAccounting;
  if (accounting === undefined) return [];
  return [
    markdownHeading(3, coreMessage(CoreMessage.StepAccountingHeading)),
    "",
    ...tableOf(accounting),
    ...runnersListOf(accounting),
    ...reconcilerListOf(accounting),
    ...nonChecksListOf(accounting),
    ...notAppliedListOf(accounting),
    ...plumbingListOf(accounting),
  ];
};
