import type { ClaimReconciliation, QualityCheckReconciliation } from "../domain/claimReconciliation.js";
import type { EvidenceObservation } from "../domain/postEvidenceObservation.js";
import { coreText } from "./coreText.js";
import { heading } from "./heading.js";
import type { ClaimCode } from "../domain/claimCodes.js";
import { labelled } from "./labelled.js";
import { inCell, quoted } from "./quoted.js";
import { table } from "./table.js";

const codeText = ({ featureCode, number }: ClaimCode): string => `CLM-${featureCode}-${number}`;

export function whereToLook({ place, name }: EvidenceObservation): string {
  return [place, ...(name === undefined ? [] : [name])].map(inCell).join(" ");
}

export function said({ message, notes }: EvidenceObservation): string {
  const firstLine = message?.split(/\r?\n/)[0];
  return [...(firstLine === undefined ? [] : [firstLine]), ...notes].map(inCell).join(" ");
}

function lineOf({ outcome, kind, observation }: QualityCheckReconciliation): string[] {
  return [outcome, kind ?? "", observation ? whereToLook(observation) : "", observation ? said(observation) : ""];
}

function claimHeading({ claim }: ClaimReconciliation): string[] {
  if ("title" in claim) {
    const code = claim.claimCode === undefined ? quoted(claim.title) : codeText(claim.claimCode);
    return [`### ${code}`, [labelled("title-label", quoted(claim.title)), labelled("file-label", quoted(claim.file))].join("\n")];
  }
  if (claim.claimCode !== undefined) return [`### ${codeText(claim.claimCode)}`, labelled("phantom-claim-label", coreText("phantom-claim"))];
  return [`### ${coreText("unnamed-claim")}`];
}

function claimSection(claimReconciliation: ClaimReconciliation): string[] {
  const header = [coreText("outcome-column"), coreText("kind-column"), coreText("where-column"), coreText("said-column")];
  return [
    ...claimHeading(claimReconciliation),
    labelled("verdict-label", claimReconciliation.verdict),
    coreText("claim-reconciliations-key"),
    table(header, claimReconciliation.qualityCheckReconciliations.map(lineOf)),
  ];
}

export function claimReconciliationsSection(claimReconciliations: readonly ClaimReconciliation[]): string[] {
  if (claimReconciliations.length === 0) return [heading(2, "claim-reconciliations-heading"), coreText("claim-reconciliations-none")];
  return [heading(2, "claim-reconciliations-heading"), ...claimReconciliations.flatMap(claimSection)];
}
