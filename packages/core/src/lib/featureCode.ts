/**
 * The `scnId → feature-code` grammar helper — the pure core of the feature-code
 * registry (split out of the old spec/featureCodes.ts). Per Evidence
 * Manifesto §9A a scenario id is `SCN-<FFF>-<NNN>` where `<FFF>` is 2–5 uppercase
 * alphanumerics. This is the ONE engine-side owner of parsing the `<FFF>` off a bare
 * scenario id; the impure feature-file discovery (`discoverFeatures`) lives in
 * ingest/ingestScenarios.ts. The duplicate-code lint was product-side in
 * tests/checks/featureCodes.ts until 3F-3313 and is now @SCN-STG-010, a rule of the shipped
 * `spec-controller tags` command in parse/corpusFaults.ts.
 *
 * Reused by the by-feature report grouping (@SCN-RPT-006).
 */

/**
 * Parse the feature code (the `<FFF>`) from a bare scenario id of the form
 * `SCN-<FFF>-<NNN>` (no leading `@`). Returns null when the id is malformed. The
 * single owner of `scnId → feature-code` parsing — callers reuse this rather than
 * re-deriving a regex (Evidence Manifesto §9A: a scenario id is `SCN-<FFF>-<NNN>`
 * where `<FFF>` is 2–5 uppercase alphanumerics).
 */
export function featureCodeOf(scnId: string): string | null {
  const match = /^SCN-([A-Z0-9]{2,5})-\d+$/.exec(scnId);
  return match ? match[1]! : null;
}
