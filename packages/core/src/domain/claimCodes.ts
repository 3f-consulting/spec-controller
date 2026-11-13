// A claim code as written: CLM, a feature code, and a number kept as written, so 001 stays 001.
export interface ClaimCode {
  readonly featureCode: string;
  readonly number: string;
}

export type ClaimCodeError =
  | {
      readonly kind: "foreign-claim-code";
      readonly claimCode: ClaimCode;
      readonly file: string;
      // The files tagged with the code's feature code: none, one, or several where the feature code is duplicated.
      readonly filesWithItsFeatureCode: readonly string[];
    }
  | { readonly kind: "no-feature-code"; readonly file: string }
  | { readonly kind: "duplicate-feature-code"; readonly featureCode: string; readonly files: readonly string[] }
  | {
      readonly kind: "several-claim-codes";
      readonly file: string;
      readonly title: string;
      readonly claimCodes: readonly ClaimCode[];
    }
  | { readonly kind: "claim-code-beside-clm-column"; readonly file: string; readonly title: string; readonly claimCode: ClaimCode };

// What the Repository port reads for allocate: a code-shaped word, where it was, and the commit when it came from history.
export interface ClaimCodeOccurrence {
  readonly text: string;
  readonly path: string;
  readonly line: number;
  readonly commit?: string;
}

export type HistoryBoundary =
  | { readonly kind: "complete" }
  | { readonly kind: "not-a-repository" }
  | { readonly kind: "shallow"; readonly before: string };

export interface AllocationAsked {
  readonly featureCode: string;
  readonly asNewFeatureCode: boolean;
}

export type Allocation =
  | {
      readonly kind: "allocated";
      readonly claimCode: ClaimCode;
      readonly highestSeen?: ClaimCodeOccurrence;
      readonly featureCodeAlreadyOnAFile: boolean;
    }
  | { readonly kind: "unknown-feature-code"; readonly featureCode: string; readonly featureCodes: readonly string[] };
