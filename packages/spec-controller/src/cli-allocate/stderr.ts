import { featureCodeOf, type Allocation, type UnknownPart } from "@3f-consulting/spec-controller-core";
import { APP_MESSAGES, AppMessage } from "../messages.js";
import type { HistoryBoundary } from "./readHistory.js";

export function historyBoundaryLine(boundary: HistoryBoundary, allocation: Allocation): string | null {
  if (boundary.kind === "complete") return null;
  const unread =
    boundary.kind === "shallow"
      ? APP_MESSAGES[AppMessage.ShallowHistoryUnread](boundary.before)
      : APP_MESSAGES[AppMessage.NoRepositoryHistoryRead]();
  const risk =
    allocation.highest === null
      ? APP_MESSAGES[AppMessage.RiskOfPartCode](featureCodeOf(allocation.code) ?? "")
      : APP_MESSAGES[AppMessage.RiskAboveCode](allocation.highest.code);
  return APP_MESSAGES[AppMessage.HistoryBoundary](unread, risk);
}

export function highestSeenLine(allocation: Allocation): string {
  const highest = allocation.highest;
  if (highest === null) return APP_MESSAGES[AppMessage.HighestSeenNone]();
  const { path, line, commit } = highest.occurrence;
  return commit === undefined
    ? APP_MESSAGES[AppMessage.HighestSeenInTree](highest.code, path, line)
    : APP_MESSAGES[AppMessage.HighestSeenInCommit](highest.code, path, line, commit);
}

export function unknownPartRefusal(refusal: UnknownPart): string {
  const parts = refusal.headerCodes.length === 0 ? APP_MESSAGES[AppMessage.NoPartsCarried]() : refusal.headerCodes.join(", ");
  return APP_MESSAGES[AppMessage.UnknownPartRefused](refusal.part, parts);
}

export function alreadyHeadedNote(allocation: Allocation): string | null {
  if (allocation.alreadyHeaded !== true) return null;
  return APP_MESSAGES[AppMessage.PartAlreadyHeaded](featureCodeOf(allocation.code) ?? "");
}
