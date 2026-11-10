export interface ClaimCode {
  readonly featureCode: string;
  readonly number: string;
}

const CLAIM_CODE = /^CLM-([A-Z0-9]{2,5})-(\d+)$/;

export function claimCodeFrom(text: string): ClaimCode | undefined {
  const parts = CLAIM_CODE.exec(text);
  return parts ? { featureCode: parts[1]!, number: parts[2]! } : undefined;
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
