import type { RunIntegrity } from "../domain/evidenceReconciliation.js";
import { coreText } from "../messages/catalogue.js";
import { quoted } from "./quoted.js";

// Each piece of evidence that never ran: its kind, where it is, and its name when it has one.
export function runIntegritySection({ neverRan }: RunIntegrity): string[] {
  return [
    `## ${coreText("run-integrity-heading")}`,
    "",
    ...neverRan.map(({ kind, place, name }) => `- ${kind}: ${[place, ...(name === undefined ? [] : [name])].map(quoted).join(", ")}`),
  ];
}
