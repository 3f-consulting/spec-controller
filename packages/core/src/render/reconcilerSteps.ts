import type { RenderInput } from "../assemble/renderInput.js";
import type { ReconcilerStep } from "../domain/evidenceReconciliation.js";

const WHAT_IT_IS: Readonly<Record<ReconcilerStep["role"], string>> = {
  reconciles: "this step runs the reconciliation this report is",
  records: "this step writes the step record the reconciliation reads",
};

export const reconcilerSection = (report: RenderInput): string[] => {
  const steps = report.summary.reconcilerSteps ?? [];
  if (steps.length === 0) return [];
  return [
    "### The reconciler",
    "",
    ...steps.map(({ step, role }) => `- ${step} — the reconciler: ${WHAT_IT_IS[role]}.`),
    "",
  ];
};
