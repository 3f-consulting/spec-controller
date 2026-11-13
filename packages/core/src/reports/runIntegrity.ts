import type { RunIntegrity } from "../domain/evidenceReconciliation.js";
import { coreText } from "../messages/catalogue.js";
import { firstLineOf, quoted } from "./quoted.js";

// Each piece of evidence that never ran: its kind, where it is, its name when it has one, and its message's first line.
export function runIntegritySection({ neverRan }: RunIntegrity): string[] {
  return [
    `## ${coreText("run-integrity-heading")}`,
    "",
    ...neverRan.map(
      ({ kind, place, name, message }) =>
        `- ${kind}: ${[place, ...(name === undefined ? [] : [name])].map(quoted).join(", ")}${message === undefined ? "" : ` — ${quoted(firstLineOf(message))}`}`,
    ),
  ];
}
