import {
  allocationOf,
  featureAsWrittenFrom,
  featureCodeOfFile,
  InputDoesNotParse,
  writtenClaimCode,
  type Allocation,
  type AllocationAsked,
  type HistoryBoundary,
} from "@3f-consulting/spec-controller-core";
import { join, relative, resolve } from "node:path";
import { featureSourcesUnder } from "../inputs/readFiles.js";
import type { AllocateNote } from "../output/allocateNotes.js";
import { historyBoundaryOf, historyLines, standingOf, treeLines, type Read } from "../repository/readRepository.js";
import type { Refusal } from "../runEnding/runEnding.js";

// What allocate is asked, and the features folder the developer named, if any.
export type AllocateAsked = AllocationAsked & { readonly features?: string };

export type AllocateOutcome =
  | { readonly answer: string; readonly notes: readonly AllocateNote[] }
  | { readonly refusal: Refusal };

const FEATURES = "features";

// The feature codes the features folder's feature files are tagged with; one that does not parse stops allocate, named.
function featureCodesUnder(top: string, features: string): Read<string[]> {
  const featureCodes: string[] = [];
  let sources: ReturnType<typeof featureSourcesUnder>;
  try {
    sources = featureSourcesUnder(features);
  } catch (error) {
    const path = (error as NodeJS.ErrnoException).path ?? features;
    return { refusal: { key: "unreadable-in-tree", values: { path: relative(top, path), said: (error as Error).message } } };
  }
  for (const { file, source } of sources) {
    try {
      const featureCode = featureCodeOfFile(featureAsWrittenFrom(file, source));
      if (featureCode !== undefined) featureCodes.push(featureCode);
    } catch (error) {
      if (!(error instanceof InputDoesNotParse)) throw error;
      return { refusal: { key: "feature-file-does-not-parse", values: { file: relative(top, file) } } };
    }
  }
  return { read: featureCodes };
}

// A boundary that left history unread is noted with every answer.
function boundaryNotes(boundary: HistoryBoundary): AllocateNote[] {
  switch (boundary.kind) {
    case "complete":
      return [];
    case "not-a-repository":
      return [{ note: "no-history-read" }];
    case "shallow":
      return [{ note: "history-before", commit: boundary.before }];
  }
}

// A new feature code's answer says nothing of what was seen; it notes only a feature file that already has the code.
function notesOf(asked: AllocationAsked, allocation: Extract<Allocation, { kind: "allocated" }>): AllocateNote[] {
  if (asked.asNewFeatureCode) return allocation.featureCodeAlreadyOnAFile ? [{ note: "feature-code-on-a-file", featureCode: asked.featureCode }] : [];
  const seen = allocation.highestSeen;
  return seen === undefined ? [] : [{ note: "highest-seen", code: seen.text, path: seen.path, line: seen.line, commit: seen.commit }];
}

// A named features folder is read from where the developer stands; left out, it is features at the top.
export function allocate(asked: AllocateAsked, standingIn: string): AllocateOutcome {
  const standing = standingOf(standingIn);
  if ("refusal" in standing) return { refusal: standing.refusal };
  const features = asked.features === undefined ? join(standing.read.top, FEATURES) : resolve(standingIn, asked.features);
  const featureCodes = featureCodesUnder(standing.read.top, features);
  if ("refusal" in featureCodes) return { refusal: featureCodes.refusal };
  const tree = treeLines(standing.read, asked.featureCode, relative(standing.read.top, features));
  if ("refusal" in tree) return { refusal: tree.refusal };
  const history = standing.read.in === "repository" ? historyLines(standing.read.top, asked.featureCode) : { read: [] };
  if ("refusal" in history) return { refusal: history.refusal };
  const allocation = allocationOf(asked, featureCodes.read, [...tree.read, ...history.read]);
  if (allocation.kind === "unknown-feature-code") {
    return { refusal: { key: "unknown-feature-code", values: { featureCode: allocation.featureCode, featureCodes: allocation.featureCodes.join(", ") } } };
  }
  return { answer: writtenClaimCode(allocation.claimCode), notes: [...notesOf(asked, allocation), ...boundaryNotes(historyBoundaryOf(standing.read))] };
}
