export interface ClaimCode {
  readonly featureCode: string;
  readonly number: string;
}

interface DuplicateFeatureCodeError {
  readonly kind: "duplicate-feature-code";
  readonly featureCode: string;
  readonly files: readonly string[];
}

interface ForeignClaimCodeError {
  readonly kind: "foreign-claim-code";
  readonly files: readonly string[];
  readonly featureCode: string;
  readonly claimCode: string;
  readonly namedFeatureCode: string;
  readonly namedFeatureFiles: readonly string[];
}

interface NoFeatureCodeError {
  readonly kind: "no-feature-code";
  readonly files: readonly string[];
}

interface SeveralClaimCodesError {
  readonly kind: "several-claim-codes";
  readonly files: readonly string[];
  readonly scenario: string;
  readonly codes: readonly string[];
}

interface ClaimCodeBesideClmColumnError {
  readonly kind: "claim-code-beside-clm-column";
  readonly files: readonly string[];
  readonly scenario: string;
  readonly codes: readonly string[];
}

export type ClaimCodeError =
  | DuplicateFeatureCodeError
  | ForeignClaimCodeError
  | NoFeatureCodeError
  | SeveralClaimCodesError
  | ClaimCodeBesideClmColumnError;
