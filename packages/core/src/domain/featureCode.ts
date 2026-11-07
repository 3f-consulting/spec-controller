export function featureCodeOf(scnId: string): string | null {
  const match = FEATURE_CODE_OF.exec(scnId);
  return match ? match[1]! : null;
}

const FEATURE_PART_SOURCE = "[A-Z0-9]{2,5}";

const PREFIX_SOURCE = "(?:CLM|SCN)";

export const SCN_ID_SOURCE = `${PREFIX_SOURCE}-${FEATURE_PART_SOURCE}-\\d+`;

export const SCN_CODE = new RegExp(`^${SCN_ID_SOURCE}$`);

const FEATURE_CODE_OF = new RegExp(`^${PREFIX_SOURCE}-(${FEATURE_PART_SOURCE})-\\d+$`);

const FEATURE_PART = new RegExp(`^${FEATURE_PART_SOURCE}$`);

export function isFeaturePart(text: string): boolean {
  return FEATURE_PART.test(text);
}

export function headerFeatureCode(featureTags: readonly string[]): string | null {
  return featureTags.find(isFeaturePart) ?? null;
}
