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
// since an absent key is a legitimate reading everywhere it is asked for (3F-2976). The app's own
// hand-authoring ports — a target's configured deferral tags, and the identity a measurement row is
// de-duplicated by — reach it here rather than re-deriving it, which is what makes the artefact
// producer's agreement with `parseMeasuredEvidenceObservations` true by construction instead of by
// a comment saying it must be. Internal, not public — the sigil convention is spec-controller's own
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
// (`parse/scenarios`, @SCN-LNT-018). Shared because the corpus check's grammar and one-check
// rules (@SCN-STG-005, @SCN-STG-007) must admit exactly the scenarios the obligation rule raises
// against, and this word is now the third source of what names a check on a corpus — the two
// resolvers beside it answer for a target's registry and its ceilings, and neither can ever carry
// this one: a converted check has no runnable script handle and no authored ceiling, only a
// configured row. A second spelling in `tests/checks/` would be a word the floor admitted while
// the engine raised nothing for it, or the reverse — the seam 3F-3126 spent a slice closing.
// A LITERAL RATHER THAN A RESOLVED SET, and deliberately: which words name a CHECK is the
// target's answer, which AXIS a scenario is on is the model's, exactly as `unit` is. Internal,
// not public — the `.` barrel carries the v1 contract and this is not one.
export { FITNESS_AXIS_TAG } from "./parse/scenarios.js";

// `thresholdsOf` / `measuredCheckTags` / `thresholdFor` — the ONE reading of a target's authored
// BARS (`domain/thresholds`, @SCN-CIP-001; the bar carries the comparison it is read with per
// @SCN-MUT-001). Shared because `measuredCheckTags` is the whole of the obligation-raising tag set
// now the registry route retired (3F-3161): a measured check has no runnable script handle, so it
// can never be registered, and no second reading is left for this one to be a union with. Any
// second reader deciding independently which words name a measured check — the tier-tag floor
// being the next one to need it (3F-2236) — would admit a tag the engine raises nothing for, or
// refuse one it does. Internal, not public — where this configuration is AUTHORED moves with the
// registry-home question.
export { thresholdsOf, measuredCheckTags, thresholdFor } from "./domain/thresholds.js";
export type { ThresholdIndex, ThresholdBar } from "./domain/thresholds.js";

// `parseMeasuredEvidenceObservations` — the measurement artefact read into citing Evidence
// Observations (`parse/measurements`, @SCN-CIP-003). Shared because the balance command is the edge
// that reads a target's files, and this is one of them. Internal, not public — where a measurement
// artefact is AUTHORED is as open as the registry-home question the two entries above are parked
// on, and the v1 surface is not the place to settle it.
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

// `ciRunSteps` / `CiRunStep` — the CI walk `ciRunCommands` projects, carrying each `run:` step's
// `id:` and whether its red would abort the job. Shared because the local-ladder derivation must
// not open a second YAML walk to see `continue-on-error`: that key is on the same step mapping this
// walk already visits, and a second reader would be free to disagree with the first about which
// steps a workflow even runs — which is the silent disagreement the one-place rule exists to
// prevent (3F-3042). Its only consumer OUTSIDE the engine is `tests/checks/localLadder.ts`;
// `runningStaticChecks` reads the same walk in-engine for the `id:` (3F-3261). Internal, not
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

// The `resolve*` family — a target's `specController.*` configuration read into the rows, bars
// and mints the reconciler takes (`parse/targetManifest`). Shared because they moved INTO the
// engine and the tree's own gates still read a target's config through them: the corpus check
// (@SCN-STG-005) and the characteristic roster resolve the same rows, bars and mints the
// reconciler does, and a second reader deciding independently which words a manifest names would
// admit a tag the engine raises nothing for. They sat at the app's ingest edge until 3F-3087,
// where they were the reason a PUBLISHED module imported this unpublished subpath — the fault
// 3F-3086 repairs. Internal, not public: where a target's rows, bars and mints are AUTHORED
// is the registry-home question (increment D), so the shape of what these read is not a v1
// contract yet. Nothing under `tests/checks/`
// travels in a tarball (`tsconfig.build.json` emits `src` alone), so reaching them here is the
// seam working as 3F-2837 intended.
export {
  resolveDeferralTags,
  resolveFitnessChecks,
  resolveThresholds,
} from "./parse/targetManifest.js";
// The TYPES beside the values: the app edge builds the `KillFloorReader` closure `resolveThresholds`
// takes, over the reference shape a manifest states, so it needs both shapes to name them.
export type { KillFloorReader, MutationGateReference } from "./parse/targetManifest.js";

// `readTargetCorpus` HAS LEFT THIS SEAM (3F-3089), and the removal is the point rather than tidying.
// It was shared here for exactly one consumer — the app's ingest edge, which composed the
// reconciliation itself — and the composition moved into the engine
// (`assemble/evidenceReconciliationFromSources`), which is what takes the last crossing off the
// published path. Nothing in this workspace reaches the corpus read any more, and this file
// re-exports only what the app genuinely shares.

// `fitnessChecksOf` / `FitnessCheck` / `FitnessCheckIndex` — the ONE reading of a target's
// CONVERTED rows (`domain/fitnessChecks`, @SCN-LNT-018). Shared because a measured row's own
// COMMAND must cite the characteristic its row names when it writes the number down
// (@SCN-LNT-024), and that word is the same word the obligation side raises the Evidence
// Obligation against. A second reader in `tests/checks/` deciding independently what
// characteristic a row names would post a credit under one spelling while the debit was raised
// under another — an obligation with no credit and a credit with no obligation, from one row, and
// loud nowhere. The pass reads only `characteristic` here; the BAR stays the ledger's
// (@SCN-LNT-019, 3F-2509) and nothing on the command side reaches for it. Internal, not public —
// where these rows are AUTHORED moves with the registry-home question the entries above are
// parked on.
//
// `carriesBar` IS THE SHAPE QUESTION AND NEVER THE VALUE, and the two are not the same crossing
// (3F-3164). The bar's NUMBER stays the ledger's, as above; whether a row carries one at all is
// what says which KIND of check it is — the static sentence asserts an exit code, the measured one
// asserts that a number arrived. THE CONSUMER THAT MADE THIS CROSSING WAS A GENERATOR AND IS GONE
// (3F-3244): the corpus is authored now, so nothing derives a scenario's sentence from this answer
// and the two sides can disagree, which is what makes the disagreement reportable. It is shared for
// the reason `fitnessChecksOf` is — a second reader answering "is this row measured" its own way
// would put the credit side and the obligation rule at odds about which evidence one row produces.
// The header on `carriesBar` states the one-spelling rule this export serves.
//
// AND NOTHING THROWS ON THIS PATH, WHICH IS DELIBERATE. `fitnessChecksOf` is what `balance` reads a
// CONSUMER'S manifest through, and a throw there turns one bad character in a stranger's
// `package.json` into a run with no verdict at all — loud nowhere. A malformed row is dropped and
// the obligation it would have raised is simply not raised, which the ledger reports.
export {
  carriesBar,
  fitnessChecksOf,
} from "./domain/fitnessChecks.js";
export type { FitnessCheck, FitnessCheckIndex } from "./domain/fitnessChecks.js";
