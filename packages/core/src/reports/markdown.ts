import type { EvidenceReconciliation, StepAccount, StepCounts } from "../domain/evidenceReconciliation.js";
import { coreText } from "../messages/catalogue.js";

const COUNTS = ["stepsRead", "runners", "reconcilerSteps", "nonChecks", "plumbing", "candidates"] as const satisfies readonly (keyof StepCounts)[];
const COLUMNS = ["workflow", "job", "steps-read", "runners", "reconciler-steps", "non-checks", "plumbing", "candidates"];

const row = (cells: readonly (string | number)[]): string => `| ${cells.join(" | ")} |`;

// A Total row is printed only when there is more than one job to total.
function stepAccountSection({ jobs, total }: StepAccount): string[] {
  return [
    `## ${coreText("step-account-heading")}`,
    "",
    row(COLUMNS.map((column) => coreText(`step-account-${column}`))),
    row(COLUMNS.map(() => "---")),
    ...jobs.map((job) => row([job.workflow, job.job, ...COUNTS.map((count) => job[count])])),
    ...(jobs.length > 1 ? [row([coreText("step-account-total"), "", ...COUNTS.map((count) => total[count])])] : []),
  ];
}

export function markdownReportOf({ stepAccount }: Pick<EvidenceReconciliation, "runVerdict" | "stepAccount">): string {
  const sections = [[coreText("balanced-opening")], ...(stepAccount === undefined ? [] : [stepAccountSection(stepAccount)])];
  return `${sections.map((lines) => lines.join("\n")).join("\n\n")}\n`;
}
