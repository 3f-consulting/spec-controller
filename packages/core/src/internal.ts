/**
 * The MONOREPO-INTERNAL shared surface of `@3f-consulting/spec-controller-core`
 * — reached by the sibling `spec-controller` app via the package's `/internal`
 * subpath export (`@3f-consulting/spec-controller-core/internal`).
 *
 * NOT THE PUBLIC v1 CONTRACT. The frozen v1 surface is the `.` barrel
 * (`index.ts`) alone — `@SCN-API-001` builds its drift-guard Program over
 * `index.ts` only, so this entry is deliberately OUT of its scope. Do NOT put
 * public API here: a symbol an external consumer should depend on belongs on the
 * `.` barrel (and must then be added to `@SCN-API-001`'s frozen enumeration).
 * This file exists solely so in-repo consumers get a SANCTIONED seam for a
 * core-internal helper instead of reaching into `core/src` by a deep relative
 * path.
 *
 * Kept deliberately small: it re-exports only the internal helpers the app
 * genuinely shares, one at a time, each with the reason it is shared here rather
 * than promoted to the public contract.
 */


// `parseScnCitation` / `parseScnCitations` — the ONE definition of the bracketed citation
// form. Shared because the two citation readers previously carried their own sigil-optional
// regexes and drifted from canon and from each other (3F-2368): the runtime reader minted a
// phantom scenario from fixture data, the scn-subissue gate let a prose mention vouch for a
// changed block. A second copy is exactly the fault, so the gate imports this one. Internal,
// not public — the form is spec-controller's own reading convention, not a v1 contract.
export { parseScnCitation, parseScnCitations } from "./lib/scnCitation.js";

// `bareTerm` — the ONE reading of what a term BARE is: whitespace around it is not part of it, and
// only a LEADING @ is a sigil. Shared because it was hand-copied seven times and the copies carried
// the same anchored-strip-before-trim ordering, so a term a target typed with a stray space in
// front of its @ was stored still carrying the @ and no bare lookup ever found it again — silently,
// since an absent key is a legitimate reading everywhere it is asked for (3F-2976). The app's own
// hand-authoring ports — a target's configured deferral tags, and the identity a measurement row is
// de-duplicated by — reach it here rather than re-deriving it, which is what makes the artefact
// producer's agreement with `parseMeasuredEvidenceObservations` true by construction instead of by
// a comment saying it must be. Internal, not public — the sigil convention is spec-controller's own
// reading of a term, not a v1 contract, and @SCN-API-001 freezes that barrel exactly.
export { bareTerm } from "./lib/bareTerm.js";

// `checkRegistryOf` / `registeredCheckTags` — the ONE reading of a target's check registry
// (`domain/checkRegistry`). Shared because the tier-tag floor (@SCN-STG-005) must admit exactly
// the bare tags the obligation rule raises against: a second reader in `static-checks/` would
// decide independently which words name a check, and a scenario the floor accepted while the
// engine raised nothing for it would be tier-named and evidence-free. Internal, not public — where
// a registry is AUTHORED is still open (the registry-home question, increment D).
export { checkRegistryOf, registeredCheckTags } from "./domain/checkRegistry.js";
export type { CheckRegistry } from "./domain/checkRegistry.js";

// `fitnessCitations` / `citationOfScript` — the citation seam's corpus hop and the two hops
// composed. Shared because the balance command is where a run and a corpus are BOTH in hand, and
// the cross-repo read (@SCN-LNT-005) makes which corpus load-bearing: the scenario carrying a
// target's check is the TARGET's, so the hop has to be applied to the corpus that run read, not to
// whichever one the resolver happened to be built beside. Internal, not public — the seam's shape
// moves with the registry-home question (increment D).
export { fitnessCitations, citationOfScript } from "./parse/fitnessCitations.js";
export type { FitnessCitations, ScriptCitation } from "./parse/fitnessCitations.js";

// `parseTaggedScenarios` — the corpus read BEFORE any obligation rule is applied, and the input
// the corpus hop above takes. Shared rather than re-derived at the edge: it is the single
// tag-inheritance walk both of `parseScenarios`' historical false-greens lived in, and a caller
// that rebuilt "which tags does this scenario carry" would be free to reproduce either one
// silently. Internal, not public — `parseScenarios` remains the v1 corpus surface.
export { parseTaggedScenarios } from "./parse/scenarios.js";
// The TYPE beside the value (@SCN-SSM-010): a caller reading a scenario's EXTENT off this walk
// needs the shape to name it. Shared for the same reason the walk is — a second reader deriving
// "where does this scenario start and stop" is the second reading this seam exists to prevent.
export type { TaggedScenario } from "./parse/scenarios.js";

// `thresholdsOf` / `measuredCheckTags` / `thresholdFor` — the ONE reading of a target's authored
// BARS (`domain/thresholds`, @SCN-CIP-001; the bar carries the comparison it is read with per
// @SCN-MUT-001). Shared for the reason the check registry above is,
// and one more: a measured check has no runnable script handle, so `registeredCheckTags` cannot see
// it and the obligation-raising tag set is the UNION of the two readings. Any second reader deciding
// independently which words name a measured check — the tier-tag floor being the next one to need
// it (3F-2236) — would admit a tag the engine raises nothing for, or refuse one it does. Internal,
// not public — where this configuration is AUTHORED moves with the registry-home question.
export { thresholdsOf, measuredCheckTags, thresholdFor } from "./domain/thresholds.js";
export type { ThresholdRegistry, ThresholdBar } from "./domain/thresholds.js";

// `parseMeasuredEvidenceObservations` — the measurement artefact read into citing Evidence
// Observations (`parse/measurements`, @SCN-CIP-003). Shared because the balance command is the edge
// that reads a target's files, and this is one of them. Internal, not public — where a measurement
// artefact is AUTHORED is as open as the registry-home question the two entries above are parked
// on, and the frozen v1 surface is not the place to settle it (@SCN-API-001 freezes that barrel
// exactly, both directions).
export { parseMeasuredEvidenceObservations } from "./parse/measurements.js";
export type { MeasurementReport } from "./parse/measurements.js";
export type { MeasuredEvidenceObservation } from "./domain/journal.js";

// `isMeasuredObservation` / `isStaticCheckObservation` — the sub-discriminators within the `lint`
// axis (@SCN-CIP-003). Shared because `qualityCheck === "lint"` stopped narrowing to one interface
// when the measured member joined the union, and every in-repo reader that wants a static check's
// OWN fields — its runnable handle, its `exists`, its `enforcedOverRealSource` — now has to say
// which of the two it means. A caller re-spelling the discriminator inline would be free to spell
// it differently. Internal, not public — the union's third member is not on the frozen v1 surface.
export { isMeasuredObservation, isStaticCheckObservation } from "./domain/journal.js";
export type { FitnessEvidenceObservation } from "./domain/journal.js";
