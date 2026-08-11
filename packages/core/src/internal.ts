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
