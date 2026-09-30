/**
 * The `scnId → feature-code` grammar helper — the pure core of the feature-code
 * registry (split out of the old spec/featureCodes.ts). Per Evidence
 * Manifesto §9A a scenario id is `SCN-<FFF>-<NNN>` where `<FFF>` is 2–5 uppercase
 * alphanumerics. This is the ONE engine-side owner of parsing the `<FFF>` off a bare
 * scenario id; the impure feature-file discovery (`discoverFeatures`) lives in
 * ingest/ingestScenarios.ts. The duplicate-code lint was product-side in
 * tests/checks/featureCodes.ts and is now one of `balance`'s scenario
 * code errors in parse/scenarioCodeErrors.ts.
 *
 * Reused by the by-feature report grouping.
 */

/**
 * Parse the feature code (the `<FFF>`) from a bare scenario id of the form
 * `SCN-<FFF>-<NNN>` (no leading `@`). Returns null when the id is malformed — which no reader in
 * the tool now hands it, since every one reads by this same grammar. The
 * single owner of `scnId → feature-code` parsing — callers reuse this rather than
 * re-deriving a regex (Evidence Manifesto §9A: a scenario id is `SCN-<FFF>-<NNN>`
 * where `<FFF>` is 2–5 uppercase alphanumerics).
 */
export function featureCodeOf(scnId: string): string | null {
  const match = FEATURE_CODE_OF.exec(scnId);
  return match ? match[1]! : null;
}

/** The `<FFF>` of §9A: two to five uppercase alphanumerics. */
const FEATURE_PART_SOURCE = "[A-Z0-9]{2,5}";

/**
 * THE ONE @SCN GRAMMAR, as a `RegExp` source with no anchors (evidence-manifesto §9A):
 * `SCN-<FFF>-<NNN>`, the feature part two to five characters, the number any width. Every reader
 * in the tree builds its pattern from this — the tag, the Vitest citation, the Cucumber tag, the CI
 * step id and the prose mention — adding only its own anchors, sigil or brackets. Six copies of this answer are how the readers drifted from canon
 * and from `featureCodeOf`, one character class at a time.
 */
export const SCN_ID_SOURCE = `SCN-${FEATURE_PART_SOURCE}-\\d+`;

const FEATURE_CODE_OF = new RegExp(`^SCN-(${FEATURE_PART_SOURCE})-\\d+$`);

const FEATURE_PART = new RegExp(`^${FEATURE_PART_SOURCE}$`);

/** Whether `text` is a feature part in canon's form, the `<FFF>` of §9A: two to five of A-Z and 0-9. */
export function isFeaturePart(text: string): boolean {
  return FEATURE_PART.test(text);
}
