import { textFor } from "@3f-consulting/spec-controller-core";
import appCatalogue from "../messages/messages.en.json" with { type: "json" };

// What allocate says beside its answer, never in it.
export type AllocateNote =
  | { readonly note: "highest-seen"; readonly code: string; readonly path: string; readonly line: number; readonly commit?: string }
  | { readonly note: "no-history-read" }
  | { readonly note: "history-before"; readonly commit: string }
  | { readonly note: "feature-code-on-a-file"; readonly featureCode: string };

const where = (path: string, line: number, commit: string | undefined): string => `${path}:${line}${commit === undefined ? "" : `@${commit}`}`;

// A note's words come from the catalogue; what it is about follows them.
export function noteText(note: AllocateNote): string {
  const words = textFor(appCatalogue, note.note);
  if (note.note === "highest-seen") return `${words}: ${note.code}, ${where(note.path, note.line, note.commit)}`;
  if (note.note === "history-before") return `${words}: ${note.commit}`;
  return note.note === "feature-code-on-a-file" ? `${words}: ${note.featureCode}` : words;
}
