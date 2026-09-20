/**
 * The MONOREPO-INTERNAL shared surface of `@3f-consulting/spec-controller-core`
 * — reached by the sibling `spec-controller` app via the package's `/internal`
 * subpath export (`@3f-consulting/spec-controller-core/internal`).
 *
 * NOT THE PUBLIC v1 CONTRACT. The v1 surface is the `.` barrel (`index.ts`)
 * alone, and this entry is deliberately outside it. Do NOT put public API here:
 * a symbol an external consumer should depend on belongs on the `.` barrel, and
 * putting it there is a contract decision NOTHING CHECKS — the drift guard that
 * reconciled that barrel against a written-down enumeration, in both directions,
 * left at 3F-3449 and has no replacement before 1.0.
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
// since an absent key is a legitimate reading everywhere it is asked for (3F-2976). A caller outside
// the engine reaches it here rather than re-deriving it, which is what keeps its reading of a term
// the engine's by construction instead of by a comment saying it must be. Internal, not public — the sigil convention is spec-controller's own
// reading of a term, not a v1 contract, and the `.` barrel is where a v1 contract goes.
export { bareTerm } from "./lib/bareTerm.js";

// `ScriptCitation` — the citation seam's shape, all that is left of it on this barrel now the
// registry route is retired (3F-3161, @SCN-LNT-017 — the last registry-`scn` scenario). Shared
// because `termSpelling.steps.ts` names a check's citation by the `id:` route (@SCN-LNT-031) and
// needs the shape to hold it. `citationOfCitedRow`, the function that produces one, is reached by
// source path rather than promoted here — the app edge composes it through `TargetCorpus`, not by
// calling it directly. Internal, not public — the seam's shape moves with the registry-home
// question (increment D).
export type { ScriptCitation } from "./parse/fitnessCitations.js";

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

// `FITNESS_AXIS_TAG` — the ONE spelling of the word a CONVERTED check's scenario carries
// (`parse/scenarios`, @SCN-LNT-018). Shared because the corpus check's grammar rule (@SCN-STG-005)
// must admit exactly the scenarios the obligation rule raises against, and this word is the one
// source left of what names a check on a corpus — the registry retired (3F-3161) and the measured
// axis's ceilings with it (3F-3516); a converted check has no runnable script handle, only a
// configured row. A second spelling in `tests/checks/` would be a word the floor admitted while
// the engine raised nothing for it, or the reverse — the seam 3F-3126 spent a slice closing.
// A LITERAL RATHER THAN A RESOLVED SET, and deliberately: which words name a CHECK is the
// target's answer, which AXIS a scenario is on is the model's, exactly as `unit` is. Internal,
// not public — the `.` barrel carries the v1 contract and this is not one.
export { FITNESS_AXIS_TAG } from "./parse/scenarios.js";

// `isFitnessObservation` — the predicate every in-repo reader that wants a fitness credit's OWN
// fields — the check that ran, its `exists`, its `enforcedOverRealSource` — asks. The measured
// member it once told apart from left with the measured axis (3F-3516); it stays shared because a
// caller re-spelling the test inline would be free to spell it differently. Internal, not public.
// The type it narrows to is `FitnessEvidenceObservation`, on the `.` barrel (3F-3565).
export { isFitnessObservation } from "./domain/journal.js";

// `ciRunSteps` / `CiRunStep` — the CI walk `ciRunCommands` projects, carrying each `run:` step's
// `id:` and whether its red would abort the job. Shared so that no caller opens a second YAML walk
// to see `continue-on-error`: that key is on the same step mapping this walk already visits, and a
// second reader would be free to disagree with the first about which steps a workflow even runs —
// which is the silent disagreement the one-place rule exists to prevent (3F-3042). Its consumer
// OUTSIDE the engine is `tests/steps/fitnessReconciliation.steps.ts`, at twelve call sites, one of
// which reads `abortsJob`; `runningStaticChecks` reads the same walk in-engine for the `id:`
// (3F-3261). The local-ladder derivation was the other outside consumer until 3F-3475. Internal, not
// public — `ciRunCommands` remains
// the v1 contract for anyone outside, and putting this on the `.` barrel would widen the v1
// contract to buy nothing.
export { ciRunSteps } from "./parse/checkScriptsRunInCI.js";
export type { CiRunStep } from "./parse/checkScriptsRunInCI.js";

// `ciWorkflowSteps` / `CiWorkflowStep` / `CiStepAction` — the SAME walk read whole: `uses:` steps
// as well as `run:` ones, each with the identity GitHub displays for it and the job it belongs to
// (3F-3352). `ciRunSteps` is its projection, so the pair cannot disagree about which steps a
// workflow runs — the third time that one-walk rule has held here, and for the reason it held the
// first two. Internal, not public, on the same footing as `ciRunSteps`: `ciRunCommands` remains
// the v1 contract for anyone outside, and the shape of a whole-pipeline step is a reading the
// discovery inversion (3F-3343) is still settling, so putting it on the v1 contract now would
// widen it for a surface no consumer has yet asked for.
export { ciWorkflowSteps } from "./parse/checkScriptsRunInCI.js";
export type { CiWorkflowStep, CiStepAction } from "./parse/checkScriptsRunInCI.js";

// The `resolve*` family — a target's `specController.*` configuration read into the rows and
// mints the reconciler takes (`parse/targetManifest`). Shared because they moved INTO the
// engine and the tree's own gates still read a target's config through them: the corpus check
// (@SCN-STG-005) resolves the same rows and mints the
// reconciler does, and a second reader deciding independently which words a manifest names would
// admit a tag the engine raises nothing for. They sat at the app's ingest edge until 3F-3087,
// where they were the reason a PUBLISHED module imported this unpublished subpath — the fault
// 3F-3086 repairs. Internal, not public: where a target's rows and mints are AUTHORED
// is the registry-home question (increment D), so the shape of what these read is not a v1
// contract yet. Nothing under `tests/checks/`
// travels in a tarball (`tsconfig.build.json` emits `src` alone), so reaching them here is the
// seam working as 3F-2837 intended.
export {
  resolveDeferralTags,
} from "./parse/targetManifest.js";

// `readTargetCorpus` HAS LEFT THIS SEAM (3F-3089), and the removal is the point rather than tidying.
// It was shared here for exactly one consumer — the app's ingest edge, which composed the
// reconciliation itself — and the composition moved into the engine
// (`assemble/evidenceReconciliationFromSources`), which is what takes the last crossing off the
// published path. Nothing in this workspace reaches the corpus read any more, and this file
// re-exports only what the app genuinely shares.
