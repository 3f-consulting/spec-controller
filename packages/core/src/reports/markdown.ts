import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { coreText } from "../messages/catalogue.js";
import { claimReconciliationsSection } from "./claimReconciliations.js";
import { errorsInTheInputsSection } from "./errorsInTheInputs.js";
import { provenanceSection } from "./provenance.js";
import { runIntegritySection } from "./runIntegrity.js";
import { stepAccountSection } from "./stepAccount.js";
import { summarySection } from "./summary.js";

// The title, then each section in its order; a part the run had nothing for is left out.
export function markdownReportOf(reconciliation: EvidenceReconciliation): string {
  const { runVerdict, provenance, errorsInTheInputs, runIntegrity, totals, stepAccount, claimReconciliations } = reconciliation;
  const sections = [
    [`# ${coreText("report-title")}`],
    provenanceSection(provenance),
    ...(errorsInTheInputs.claimCodeErrors.length + errorsInTheInputs.configurationErrors.length === 0 ? [] : [errorsInTheInputsSection(errorsInTheInputs)]),
    ...(runIntegrity.neverRan.length === 0 ? [] : [runIntegritySection(runIntegrity)]),
    summarySection(totals, runVerdict),
    ...(stepAccount.jobs.length === 0 ? [] : [stepAccountSection(stepAccount)]),
    claimReconciliationsSection(claimReconciliations),
  ];
  return `${sections.map((lines) => lines.join("\n")).join("\n\n")}\n`;
}
