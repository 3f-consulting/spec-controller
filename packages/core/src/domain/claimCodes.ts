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

const FEATURE_CODE_FORM = "[A-Z0-9]{2,5}";

const FEATURE_CODE = new RegExp(`^${FEATURE_CODE_FORM}$`);

const CITATION = new RegExp(`\\[CLM-(${FEATURE_CODE_FORM})-(\\d+)\\]`, "g");

const CLAIM_CODE = new RegExp(`^CLM-(${FEATURE_CODE_FORM})-(\\d+)$`);

const RETIRED_SCENARIO_CODE = new RegExp(`^SCN-(${FEATURE_CODE_FORM})-(\\d+)$`);

export function claimCodeCitationsIn(text: string): ClaimCode[] {
  return [...text.matchAll(CITATION)].map(([, featureCode, number]) => ({ featureCode: featureCode!, number: number! }));
}

function codeIn(form: RegExp, word: string): ClaimCode | undefined {
  const [, featureCode, number] = form.exec(word) ?? [];
  return featureCode === undefined || number === undefined ? undefined : { featureCode, number };
}

export const claimCodeFrom = (word: string): ClaimCode | undefined => codeIn(CLAIM_CODE, word);

export const retiredScenarioCodeFrom = (word: string): ClaimCode | undefined => codeIn(RETIRED_SCENARIO_CODE, word);

export const isFeatureCode = (word: string): boolean => FEATURE_CODE.test(word);

export const featureCodeOfFile = ({ fileTags }: { readonly fileTags: readonly string[] }): string | undefined => fileTags.find(isFeatureCode);

export const sameCode = (one: ClaimCode, other: ClaimCode): boolean => one.featureCode === other.featureCode && one.number === other.number;
