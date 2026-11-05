import {
  featureCodeOf,
  unknownPartCarried,
  type Allocation,
  type UnknownPart,
  type UnknownPartCarried,
} from "@3f-consulting/spec-controller-core";
import { AppError, AppMessage } from "../messages.js";
import { message } from "../appText.js";
import { refusal, type Refusal } from "../refusal.js";
import type { HistoryBoundary } from "./readHistory.js";

export function historyBoundaryLine(boundary: HistoryBoundary, allocation: Allocation): string | null {
  switch (boundary.kind) {
    case "complete":
      return null;
    case "shallow":
      return shallowHistoryLine(boundary.before, allocation);
    case "not-a-repository":
      return noRepositoryLine(allocation);
  }
}

function shallowHistoryLine(before: string, allocation: Allocation): string {
  return allocation.highest === null
    ? message(AppMessage.ShallowHistoryRisksPartCode, { before, part: partOf(allocation) })
    : message(AppMessage.ShallowHistoryRisksCodeAbove, { before, code: allocation.highest.code });
}

function noRepositoryLine(allocation: Allocation): string {
  return allocation.highest === null
    ? message(AppMessage.NoRepositoryRisksPartCode, { part: partOf(allocation) })
    : message(AppMessage.NoRepositoryRisksCodeAbove, { code: allocation.highest.code });
}

function partOf(allocation: Allocation): string {
  return featureCodeOf(allocation.code) ?? "";
}

export function highestSeenLine(allocation: Allocation): string {
  const highest = allocation.highest;
  if (highest === null) return message(AppMessage.HighestSeenNone);
  const { path, line, commit } = highest.occurrence;
  return commit === undefined
    ? message(AppMessage.HighestSeenInTree, { code: highest.code, path, line })
    : message(AppMessage.HighestSeenInCommit, { code: highest.code, path, line, commit });
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
  return message(AppMessage.PartAlreadyHeaded, { part: partOf(allocation) });
}
