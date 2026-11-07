export function featureCodeOf(claimCode: string): string | null {
  const match = FEATURE_CODE_OF.exec(claimCode);
  return match ? match[1]! : null;
}

const FEATURE_PART_SOURCE = "[A-Z0-9]{2,5}";

export const CLAIM_CODE_PREFIXES: readonly string[] = ["CLM", "SCN"];

const PREFIX_SOURCE = `(?:${CLAIM_CODE_PREFIXES.join("|")})`;

export const CLAIM_CODE_SOURCE = `${PREFIX_SOURCE}-${FEATURE_PART_SOURCE}-\\d+`;

export const CLAIM_CODE = new RegExp(`^${CLAIM_CODE_SOURCE}$`);

const FEATURE_CODE_OF = new RegExp(`^${PREFIX_SOURCE}-(${FEATURE_PART_SOURCE})-\\d+$`);

const FEATURE_PART = new RegExp(`^${FEATURE_PART_SOURCE}$`);

export function isFeaturePart(text: string): boolean {
  return FEATURE_PART.test(text);
}

export function headerFeatureCode(featureTags: readonly string[]): string | null {
  return featureTags.find(isFeaturePart) ?? null;
}
