import type { StepAccount, StepCounts } from "../domain/evidenceReconciliation.js";
import { coreText } from "../messages/catalogue.js";
import { tableOf } from "./table.js";

const COUNTS = ["stepsRead", "runners", "reconcilerSteps", "nonChecks", "plumbing", "candidates"] as const satisfies readonly (keyof StepCounts)[];
const COLUMNS = ["workflow", "job", "steps-read", "runners", "reconciler-steps", "non-checks", "plumbing", "candidates"];

// A Total row is printed only when there is more than one job to total.
export function stepAccountSection({ jobs, total }: StepAccount): string[] {
  return [
    `## ${coreText("step-account-heading")}`,
    "",
    ...tableOf(
      COLUMNS.map((column) => `step-account-${column}`),
      [
        ...jobs.map((job) => [job.workflow, job.job, ...COUNTS.map((count) => job[count])]),
        ...(jobs.length > 1 ? [[coreText("step-account-total"), "", ...COUNTS.map((count) => total[count])]] : []),
      ],
    ),
  ];
}
