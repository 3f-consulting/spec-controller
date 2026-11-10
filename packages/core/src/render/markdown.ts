import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { coreText, type CoreTextCode } from "./coreText.js";

const heading = (level: number, code: CoreTextCode): string => `${"#".repeat(level)} ${coreText(code)}`;

export function renderMarkdown({ claimReconciliations, errorsInTheInputs, runIntegrity, totals, stepAccount }: EvidenceReconciliation): string {
  return [
    heading(1, "report-title"),
    heading(2, "provenance-heading"),
    ...(errorsInTheInputs
      ? [
          heading(2, "errors-in-the-inputs-heading"),
          ...(errorsInTheInputs.claimCodeErrors ? [heading(3, "claim-code-errors-heading")] : []),
          ...(errorsInTheInputs.configurationErrors ? [heading(3, "configuration-errors-heading")] : []),
        ]
      : []),
    ...(runIntegrity ? [heading(2, "run-integrity-heading")] : []),
    heading(2, "summary-heading"),
    ...(totals.outOfBalanceByFeature ? [heading(3, "out-of-balance-by-feature-heading")] : []),
    ...(stepAccount ? [heading(3, "step-account-heading")] : []),
    heading(2, "claim-reconciliations-heading"),
    ...(claimReconciliations.length === 0 ? [coreText("claim-reconciliations-none")] : []),
  ].join("\n\n");
}
