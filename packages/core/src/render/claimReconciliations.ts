import type { ClaimReconciliation, QualityCheckReconciliation } from "../domain/claimReconciliation.js";
import type { EvidenceObservation } from "../domain/postEvidenceObservation.js";
import { coreText } from "./coreText.js";
import { heading } from "./heading.js";
import { inCell } from "./quoted.js";
import { table } from "./table.js";

export function whereToLook({ place, name }: EvidenceObservation): string {
  return [place, ...(name === undefined ? [] : [name])].map(inCell).join(" ");
}

function lineOf({ outcome, kind, observation }: QualityCheckReconciliation): string[] {
  return [outcome, kind ?? "", observation ? whereToLook(observation) : "", ""];
}

function claimSection({ qualityCheckReconciliations }: ClaimReconciliation): string[] {
  const header = [coreText("outcome-column"), coreText("kind-column"), coreText("where-column"), coreText("said-column")];
  return [table(header, qualityCheckReconciliations.map(lineOf))];
}

export function claimReconciliationsSection(claimReconciliations: readonly ClaimReconciliation[]): string[] {
  if (claimReconciliations.length === 0) return [heading(2, "claim-reconciliations-heading"), coreText("claim-reconciliations-none")];
  return [heading(2, "claim-reconciliations-heading"), ...claimReconciliations.flatMap(claimSection)];
}
