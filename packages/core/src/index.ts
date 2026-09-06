/**
 * The public core barrel — the single entrypoint of the
 * `@3f-consulting/spec-controller-core` package.
 *
 * This re-exports EXACTLY the frozen v1 contract surface. The `@unit` drift
 * guard for @SCN-API-001 (features/public-api.feature) reconciles this barrel's
 * actual exports against a surface written down for it, both directions — so a
 * symbol added here OR dropped reds CI. The surface is the contract downstream
 * consumers build on; it cannot drift silently.
 *
 * THE SURFACE IT IS HELD AGAINST IS NOT IN THIS PACKAGE, and following the guard
 * is a two-hop trip worth knowing about before it surprises somebody adding an
 * export. The list lives in `spec-controller`'s
 * `static-checks/publishedSurfaces.ts`, beside the entries for every other
 * subpath these packages publish, and the citing test sits with it in
 * `static-checks/coreBarrelSurface.test.ts`. It cannot live here: `core` is the
 * pure library and `spec-controller` depends on IT, so a test in this package
 * reading that registry would invert the dependency and close a cycle.
 *
 * SELECTIVE re-exports, NOT `export *`: the pure boundary is deliberate. The
 * core surface is filtered to pure symbols — no `fs` / `process.cwd` /
 * `child_process`. The impure application layer (file reading, git-derived
 * provenance, output routing, run-store, the CLI itself) lives in the
 * `spec-controller` package, not here.
 *
 * Groups + order mirror the frozen enumeration. Values are re-exported with
 * `export { … }`; types with `export type { … }` (so the runtime namespace
 * carries only the value bindings — the guard's `Object.keys` surface).
 */

// --- Model (`model.ts`) — all types ---
export type {
  QualityCheck,
  RuntimeQualityCheck,
  EvidenceStatus,
  EvidenceObligation,
  Scenario,
  RuntimeEvidenceObservation,
  GuardEvidenceObservation,
  EvidenceObservation,
  Outcome,
  ScenarioVerdict,
  ScenarioKind,
  QualityCheckReconciliation,
  ScenarioReconciliation,
  Ledger,
} from "./model.js";

// --- Scenario parse (`parse/scenarios.ts`) ---
export { parseScenarios, countScnOccurrences, parseUntaggedScenarios, proseOnlyCodes } from "./parse/scenarios.js";

// --- Evidence-obligation census (`census/evidenceObligations.ts`) ---
export { evidenceObligations } from "./census/evidenceObligations.js";
export type { EvidenceObligations, UntaggedScenario } from "./census/evidenceObligations.js";

// --- Evidence Reconciliation (`domain/evidenceReconciliation.ts`) + the Ledger predicates ---
export { reconcile, evidenceReconciliationOf } from "./domain/evidenceReconciliation.js";
// The whole-run predicates come DIRECT from the concept that OWNS them (3F-2232). They used to
// be re-exported through `reconcile/reconcile.js` — a shell kept alive purely to preserve importer
// paths after 3F-1994 sent the behaviour home. No symbol is re-exported through a module that does
// not own it.
export { isBalanced, hasPendingItems, hasBrokenEvidence } from "./domain/ledger.js";

// The runtime evidence-observation census (`census/evidenceObservations.ts`) is RETIRED (3F-2104):
// its counting folds onto the Ledger (`runtimeObservationTally`, an internal domain fold), and its
// 6 symbols + `EvidenceObservationsSection` left this frozen-in-intent surface. Pre-freeze, no
// external consumer (unpublished package; only workspace dependents, all rewired). See @SCN-API-001.

// The static evidence-observation census (`census/staticEvidenceObservations.ts`) is RETIRED
// (3F-2119): its counting folds onto the Ledger (`staticObservationTally`, an internal domain fold),
// and its 2 symbols (`countStaticEvidenceObservationKinds` value / `StaticEvidenceObservationKindCounts`
// type) left this frozen-in-intent surface. `StaticCheckTotals` (the materialised headline, now
// Ledger-fold-sourced) STAYS on the barrel. Pre-freeze, no external consumer (unpublished package;
// only workspace dependents, all rewired). See @SCN-API-001.

// --- Parse — result/CI readers (`parse/*`) ---
export { parseVitestEvidenceObservations } from "./parse/vitest.js";
export type { VitestJsonReport } from "./parse/vitest.js";
export { parseCucumberEvidenceObservations } from "./parse/cucumber.js";
export type { CucumberJsonReport } from "./parse/cucumber.js";
export { checkStaticEvidenceObligations } from "./parse/checkStaticEvidenceObligations.js";
export { runningStaticChecks } from "./parse/runningStaticChecks.js";
export { ciRunCommands, commandInvokesScript } from "./parse/checkScriptsRunInCI.js";
export type { PackageJsonScripts } from "./parse/checkScriptsRunInCI.js";

// --- Evidence Reconciliation (the concept, `domain/evidenceReconciliation.ts`) + the RENDER
// INPUT the adapters frame around it (`assemble/renderInput.ts`). `RenderInput` is deliberately
// NOT a canon word: canon reserves "the report" for the RENDERED ARTEFACT, so the payload a
// renderer consumes must not borrow it (3F-2234). ---
export { assembleRenderInput } from "./assemble/renderInput.js";
export type {
  EvidenceReconciliation,
  RenderInput,
  ReportMetadata,
  Summary,
  ScenarioReconciliationTotals,
  EvidenceObligationTotals,
  MissingByQualityCheck,
  TestVolumeTotals,
  StaticCheckTotals,
  LintTally,
  EvidenceObligationsSection,
} from "./assemble/renderInput.js";

// --- The RECONCILE COMPOSITION over a target's already-read sources
// (`assemble/evidenceReconciliationFromSources.ts`) ---
// THE ONE ENTRY POINT THIS BARREL GAINS AT 3F-3086, and the reason it is here rather than on
// `./internal`: a published module — the CLI's ingest edge — has to reach the composition, and
// `./internal` is not published (3F-2837, unamended). The nine symbols it composes stay internal,
// so the surface a consumer's v1 contract carries widens by one name and nothing else.
export { evidenceReconciliationFromSources } from "./assemble/evidenceReconciliationFromSources.js";

// --- Render — model→string (`render/*`) ---
export { renderJson } from "./render/json.js";
export { renderMarkdown, renderReport, renderReportFromJson } from "./render/markdown.js";
export type { FeatureNames } from "./render/markdown.js";

// --- Provenance — pure subset (`provenance/provenance.ts`) ---
export { provenanceObject, projectProvenance, projectProvenanceObject } from "./provenance/provenance.js";
export type { RunContext, RunInputs, ProvenanceObject, ProvenanceFacts, ProvenanceInput } from "./provenance/provenance.js";

// --- The portfolio's check characteristics (`domain/checkCharacteristics.ts`) ---
// ON THE PUBLIC BARREL BY DESIGN, NOT ON `./internal` (3F-2996). The roster is what makes the
// check vocabulary SHARED, so it has to be reachable by a product that installs this package and
// never sees spec-controller's `static-checks/` folder; `./internal` is monorepo-scoped and would
// publish it to exactly the one consumer that does not need it. A product derives its legal set
// from its PINNED version and refreshes it on a bump — which is the property a hand-typed
// per-product list cannot have.
//
// AND IT IS A REPORTING VOCABULARY NOW, NOT A GATE (3F-3167). No check in this repository reads
// it any more: the collapse to one `@fitness` tag moved the characteristic onto a configured row
// as a FIELD, and a word that only labels a roll-up needs no parser holding it. Whether the
// portfolio should carry a given word is a question for canon, asked of people. So this export is
// what a consumer's report groups by and what the portfolio says out loud — the two jobs one
// token used to do, with the enforcing half retired rather than moved.
export { PORTFOLIO_CHECK_CHARACTERISTICS, isPortfolioCharacteristic } from "./domain/checkCharacteristics.js";

// --- Pure helpers ---
export { featureCodeOf } from "./lib/featureCode.js";
export { relativizeToRoot } from "./lib/portablePath.js";
