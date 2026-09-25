/**
 * What the allocator says beside its answer, on stderr, so stdout carries the code alone.
 */
import { featureCodeOf, type Allocation, type UnknownPart } from "@3f-consulting/spec-controller-core";
import type { HistoryBoundary } from "./readHistory.js";

/** What was left unread, and what that means for the answer; nothing when history was read whole. */
export function historyBoundaryLine(boundary: HistoryBoundary, allocation: Allocation): string | null {
  if (boundary.kind === "complete") return null;
  const unread = boundary.kind === "shallow" ? `shallow clone — history before ${boundary.before} unread` : "not a git repository — none read";
  const risk = allocation.highest === null ? `a code of ${featureCodeOf(allocation.code) ?? ""}` : `a code above ${allocation.highest.code}`;
  return `history: ${unread}; ${risk} may have been used before`;
}

/** Where the highest code was seen: a file and line, and the commit when only history carries it. */
export function highestSeenLine(allocation: Allocation): string {
  const highest = allocation.highest;
  if (highest === null) return "highest seen: none";
  const { path, line, commit } = highest.sighting;
  return `highest seen: ${highest.code}, ${path}:${line}${commit === undefined ? "" : ` in ${commit}`}`;
}

/** The refusal for a part no feature file's header carries: the part, and the parts that are. */
export function unknownPartRefusal(refusal: UnknownPart): string {
  const parts = refusal.headerCodes.length === 0 ? "none" : refusal.headerCodes.join(", ");
  return (
    `spec-controller allocate: unknown part — no feature file's header carries ${refusal.part}.\n` +
    `The parts this corpus's feature files carry: ${parts}.`
  );
}

/** The note for a part asked for as new that a header already carries; nothing otherwise. */
export function alreadyHeadedNote(allocation: Allocation): string | null {
  if (allocation.alreadyHeaded !== true) return null;
  return `note: a feature file's header already carries ${featureCodeOf(allocation.code) ?? ""}, so --new was not needed`;
}
