import type { EvidenceReconciliation, StepAccount, StepCounts } from "../domain/evidenceReconciliation.js";
import type { Provenance } from "../domain/provenance.js";
import { coreText } from "../messages/catalogue.js";

const COUNTS = ["stepsRead", "runners", "reconcilerSteps", "nonChecks", "plumbing", "candidates"] as const satisfies readonly (keyof StepCounts)[];
const COLUMNS = ["workflow", "job", "steps-read", "runners", "reconciler-steps", "non-checks", "plumbing", "candidates"];

const row = (cells: readonly (string | number)[]): string => `| ${cells.join(" | ")} |`;

const item = (label: string, value: string): string => `- ${coreText(`provenance-${label}`)}: \`${value}\``;

// The tool's commit only when it ran from its own checkout; an input on a line of its own only when the run read it.
function provenanceSection({ target, sourceSha, toolSha, toolVersion, runTime, inputs }: Provenance): string[] {
  return [
    `## ${coreText("provenance-heading")}`,
    "",
    item("target", target),
    item("source-sha", sourceSha),
    ...(toolSha === undefined ? [] : [item("tool-sha", toolSha)]),
    item("tool-version", toolVersion),
    item("run-time", runTime),
    `- ${coreText("provenance-inputs")}:`,
    ...inputs.flatMap(({ name, path }) => (path === undefined ? [] : [`  ${item(`input-${name}`, path)}`])),
  ];
}

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

export function markdownReportOf({ provenance, stepAccount }: Pick<EvidenceReconciliation, "runVerdict" | "provenance" | "stepAccount">): string {
  const sections = [[coreText("balanced-opening")], provenanceSection(provenance), ...(stepAccount === undefined ? [] : [stepAccountSection(stepAccount)])];
  return `${sections.map((lines) => lines.join("\n")).join("\n\n")}\n`;
}
