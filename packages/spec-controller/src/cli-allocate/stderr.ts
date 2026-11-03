import {
  featureCodeOf,
  unknownPartCarried,
  type Allocation,
  type UnknownPart,
  type UnknownPartCarried,
} from "@3f-consulting/spec-controller-core";
import { APP_MESSAGES, AppError, AppMessage } from "../messages.js";
import { message } from "../appText.js";
import { refusal, type Refusal } from "../refusal.js";
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

type CarriedPartsWording = {
  readonly [K in UnknownPartCarried["kind"]]: (carried: Extract<UnknownPartCarried, { readonly kind: K }>) => string;
};

const CARRIED_PARTS: CarriedPartsWording = {
  none: () => message(AppMessage.NoPartsCarried),
  some: ({ headerCodes }) => headerCodes.join(", "),
};

function carriedParts<K extends UnknownPartCarried["kind"]>(carried: Extract<UnknownPartCarried, { readonly kind: K }>): string {
  return CARRIED_PARTS[carried.kind](carried);
}

export function unknownPartRefusal(unknown: UnknownPart): Refusal {
  return refusal(AppError.UnknownPartRefused, { part: unknown.part, parts: carriedParts(unknownPartCarried(unknown)) });
}

export function alreadyHeadedNote(allocation: Allocation): string | null {
  if (allocation.alreadyHeaded !== true) return null;
  return APP_MESSAGES[AppMessage.PartAlreadyHeaded](featureCodeOf(allocation.code) ?? "");
}
