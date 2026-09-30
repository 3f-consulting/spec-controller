import { featureCodeOf, type Allocation, type UnknownPart } from "@3f-consulting/spec-controller-core";
import type { HistoryBoundary } from "./readHistory.js";

export function historyBoundaryLine(boundary: HistoryBoundary, allocation: Allocation): string | null {
  if (boundary.kind === "complete") return null;
  const unread = boundary.kind === "shallow" ? `shallow clone — history before ${boundary.before} unread` : "not a git repository — none read";
  const risk = allocation.highest === null ? `a code of ${featureCodeOf(allocation.code) ?? ""}` : `a code above ${allocation.highest.code}`;
  return `history: ${unread}; ${risk} may have been used before`;
}

export function highestSeenLine(allocation: Allocation): string {
  const highest = allocation.highest;
  if (highest === null) return "highest seen: none";
  const { path, line, commit } = highest.sighting;
  return `highest seen: ${highest.code}, ${path}:${line}${commit === undefined ? "" : ` in ${commit}`}`;
}

export function unknownPartRefusal(refusal: UnknownPart): string {
  const parts = refusal.headerCodes.length === 0 ? "none" : refusal.headerCodes.join(", ");
  return (
    `spec-controller allocate: unknown part — no feature file's header carries ${refusal.part}.\n` +
    `The parts this corpus's feature files carry: ${parts}.`
  );
}

export function alreadyHeadedNote(allocation: Allocation): string | null {
  if (allocation.alreadyHeaded !== true) return null;
  return `note: a feature file's header already carries ${featureCodeOf(allocation.code) ?? ""}, so --new was not needed`;
}
