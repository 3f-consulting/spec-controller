import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { coreText, type CoreTextCode } from "./coreText.js";

const heading = (level: number, code: CoreTextCode): string => `${"#".repeat(level)} ${coreText(code)}`;

export function renderMarkdown(_evidenceReconciliation: EvidenceReconciliation): string {
  return [
    heading(1, "report-title"),
    heading(2, "provenance-heading"),
    heading(2, "errors-in-the-inputs-heading"),
    heading(3, "claim-code-errors-heading"),
    heading(3, "configuration-errors-heading"),
    heading(2, "run-integrity-heading"),
    heading(2, "summary-heading"),
    heading(3, "out-of-balance-by-feature-heading"),
    heading(3, "step-account-heading"),
    heading(2, "claim-reconciliations-heading"),
  ].join("\n\n");
}
