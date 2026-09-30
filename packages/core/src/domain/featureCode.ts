export function featureCodeOf(scnId: string): string | null {
  const match = FEATURE_CODE_OF.exec(scnId);
  return match ? match[1]! : null;
}

const FEATURE_PART_SOURCE = "[A-Z0-9]{2,5}";

export const SCN_ID_SOURCE = `SCN-${FEATURE_PART_SOURCE}-\\d+`;

const FEATURE_CODE_OF = new RegExp(`^SCN-(${FEATURE_PART_SOURCE})-\\d+$`);

const FEATURE_PART = new RegExp(`^${FEATURE_PART_SOURCE}$`);

export function isFeaturePart(text: string): boolean {
  return FEATURE_PART.test(text);
}
