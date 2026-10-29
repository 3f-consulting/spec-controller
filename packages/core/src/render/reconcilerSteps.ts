import type { RenderInput } from "../domain/renderInput.js";
import type { ReconcilerStep } from "../domain/evidenceReconciliation.js";
import { CORE_MESSAGES, CoreMessage } from "./messages.js";

const WHAT_IT_IS: Readonly<Record<ReconcilerStep["role"], string>> = {
  reconciles: CORE_MESSAGES[CoreMessage.ReconcilerReconciles],
  records: CORE_MESSAGES[CoreMessage.ReconcilerRecords],
};

export const reconcilerSection = (report: RenderInput): string[] => {
  const steps = report.summary.stepAccounting?.steps.reconciler ?? [];
  if (steps.length === 0) return [];
  return [
    CORE_MESSAGES[CoreMessage.ReconcilerHeading],
    "",
    ...steps.map(({ step, role }) => `- ${CORE_MESSAGES[CoreMessage.ReconcilerStep](step, WHAT_IT_IS[role])}`),
    "",
  ];
};
