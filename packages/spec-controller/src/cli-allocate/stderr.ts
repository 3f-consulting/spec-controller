import type { Allocation, UnknownFeatureCode } from "@3f-consulting/spec-controller-core";
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
  return allocation.highest === undefined
    ? message(AppMessage.ShallowHistoryRisksPartCode, { before, part: allocation.featureCode })
    : message(AppMessage.ShallowHistoryRisksCodeAbove, { before, code: allocation.highest.code });
}

function noRepositoryLine(allocation: Allocation): string {
  return allocation.highest === undefined
    ? message(AppMessage.NoRepositoryRisksPartCode, { part: allocation.featureCode })
    : message(AppMessage.NoRepositoryRisksCodeAbove, { code: allocation.highest.code });
}

export function highestSeenLine(allocation: Allocation): string {
  const highest = allocation.highest;
  if (highest === undefined) return message(AppMessage.HighestSeenNone);
  const { path, line, commit } = highest.occurrence;
  return commit === undefined
    ? message(AppMessage.HighestSeenInTree, { code: highest.code, path, line })
    : message(AppMessage.HighestSeenInCommit, { code: highest.code, path, line, commit });
}

function featureCodesListed({ featureCodes }: UnknownFeatureCode): string {
  return featureCodes.length === 0 ? message(AppMessage.NoPartsCarried) : featureCodes.join(", ");
}

export function unknownFeatureCodeRefusal(unknown: UnknownFeatureCode): Refusal {
  return refusal(AppError.UnknownPartRefused, { part: unknown.featureCode, parts: featureCodesListed(unknown) });
}

export function alreadyHeadedNote(allocation: Allocation): string | null {
  if (allocation.alreadyHeaded !== true) return null;
  return message(AppMessage.PartAlreadyHeaded, { part: allocation.featureCode });
}
