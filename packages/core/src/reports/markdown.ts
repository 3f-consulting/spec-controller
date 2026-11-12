import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { claimReconciliationsSection } from "./claimReconciliations.js";
import { errorsInTheInputsSection } from "./errorsInTheInputs.js";
import { heading } from "./heading.js";
import { provenanceSection } from "./provenance.js";
import { runIntegritySection } from "./runIntegrity.js";
import { summarySection } from "./summary.js";

export function renderMarkdown(evidenceReconciliation: EvidenceReconciliation): string {
  const { provenance, errorsInTheInputs, runIntegrity, claimReconciliations } = evidenceReconciliation;
  return `${[
    heading(1, "report-title"),
    ...provenanceSection(provenance),
    ...(errorsInTheInputs === undefined ? [] : errorsInTheInputsSection(errorsInTheInputs)),
    ...(runIntegrity === undefined ? [] : runIntegritySection(runIntegrity)),
    ...summarySection(evidenceReconciliation),
    ...claimReconciliationsSection(claimReconciliations),
  ].join("\n\n")}\n`;
}
