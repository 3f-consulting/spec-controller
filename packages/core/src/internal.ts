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

// `staticCheckEvidenceObligationsOf` — the NAMED-static-check derivation, the static-axis
// twin of `evidenceObligationPairsOf`. It lives ONCE on the journal (the model's
// rule for what a scenario names); the balance command's static-check ingest reads
// it rather than rebuilding the derivation inline. Shared internally — NOT public API,
// so it stays off the frozen `.` barrel and is reached here instead.
export { staticCheckEvidenceObligationsOf } from "./domain/journal.js";

// `parseScnCitation` / `parseScnCitations` — the ONE definition of the bracketed citation
// form. Shared because the two citation readers previously carried their own sigil-optional
// regexes and drifted from canon and from each other (3F-2368): the runtime reader minted a
// phantom scenario from fixture data, the scn-subissue gate let a prose mention vouch for a
// changed block. A second copy is exactly the fault, so the gate imports this one. Internal,
// not public — the form is spec-controller's own reading convention, not a v1 contract.
export { parseScnCitation, parseScnCitations } from "./lib/scnCitation.js";
