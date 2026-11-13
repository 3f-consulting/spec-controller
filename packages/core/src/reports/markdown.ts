import type { RunVerdict } from "../domain/evidenceReconciliation.js";
import { coreText } from "../messages/catalogue.js";

export function markdownReportOf(_runVerdict: RunVerdict): string {
  return `${coreText("balanced-opening")}\n`;
}
