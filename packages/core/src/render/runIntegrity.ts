import type { RunIntegrity } from "../domain/evidenceReconciliation.js";
import { said, whereToLook } from "./claimReconciliations.js";
import { coreText } from "./coreText.js";
import { heading } from "./heading.js";
import { table } from "./table.js";

export function runIntegritySection({ neverRan }: RunIntegrity): string[] {
  const header = [coreText("kind-column"), coreText("where-column"), coreText("said-column")];
  return [heading(2, "run-integrity-heading"), table(header, neverRan.map((observation) => [observation.kind, whereToLook(observation), said(observation)]))];
}
