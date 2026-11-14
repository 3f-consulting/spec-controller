import type { EvidenceReconciliation, RunVerdict } from "../domain/evidenceReconciliation.js";
import { coreText } from "../messages/catalogue.js";
import { claimReconciliationsSection } from "./claimReconciliations.js";
import { errorsInTheInputsSection } from "./errorsInTheInputs.js";
import { provenanceSection } from "./provenance.js";
import { runIntegritySection } from "./runIntegrity.js";
import { stepAccountSection } from "./stepAccount.js";
import { summarySection } from "./summary.js";

// The opening sentence: what the run verdict is and what it asks of the reader.
const openingOf = (runVerdict: RunVerdict): string => coreText(`${runVerdict.verdict === "not-reconciled" ? runVerdict.why : runVerdict.verdict}-opening`);

// The title and the opening, then each section in its order, leaving out a part the run had nothing for.
export function markdownReportOf(reconciliation: EvidenceReconciliation): string {
  const { runVerdict, provenance, errorsInTheInputs, runIntegrity, totals, stepAccount, claimReconciliations } = reconciliation;
  const sections = [
    [`# ${coreText("report-title")}`, "", openingOf(runVerdict)],
    provenanceSection(provenance),
    ...(errorsInTheInputs.claimCodeErrors.length + errorsInTheInputs.configurationErrors.length === 0 ? [] : [errorsInTheInputsSection(errorsInTheInputs)]),
    ...(runIntegrity.neverRan.length === 0 ? [] : [runIntegritySection(runIntegrity)]),
    summarySection(totals, runVerdict),
    ...(stepAccount.jobs.length === 0 ? [] : [stepAccountSection(stepAccount)]),
    claimReconciliationsSection(claimReconciliations),
  ];
  return `${sections.map((lines) => lines.join("\n")).join("\n\n")}\n`;
}
