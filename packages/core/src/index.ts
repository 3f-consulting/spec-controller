/**
 * The public core barrel — the single entrypoint of the
 * `@3f-consulting/spec-controller-core` package.
 *
 * This re-exports the v1 contract surface — what a downstream consumer builds
 * on.
 *
 * NOTHING HOLDS IT TO A LIST, AND THAT IS NEW. Until that commit a
 * `@unit` drift guard reconciled this barrel's actual exports against a surface
 * written down for it in the repository's check tree, both directions, so a
 * symbol added here or dropped reds CI. The list and its arm are gone, with the
 * rest of the packaging checks this repository wrote for itself, and no
 * replacement runs: the community's instrument is a generated `api-extractor`
 * report, adopted at the 1.0 boundary where a stability promise exists again.
 * SO AN EXPORT ADDED TO OR REMOVED FROM THIS FILE IS A DECISION NOBODY IS
 * FORCED TO NOTICE. Treat a change here as a contract change on the strength of
 * where you are typing it, because no gate will say so — and `0.x` promises
 * nothing (`doc/compatibility.md`).
 *
 * SELECTIVE re-exports, NOT `export *`: the pure boundary is deliberate. The
 * core surface is filtered to pure symbols — no `fs` / `process.cwd` /
 * `child_process`. The impure application layer (file reading, git-derived
 * provenance, output routing, run-store, the CLI itself) lives in the
 * `spec-controller` package, not here.
 *
 * Groups + order are this file's own, kept because a reader uses them; they no
 * longer mirror an enumeration held elsewhere, because there is no longer one.
 * Values are re-exported with `export { … }`; types with `export type { … }`,
 * so the runtime namespace carries only the value bindings.
 */

// --- Model (`model.ts`) — all types ---
export type {
  QualityCheck,
  RuntimeQualityCheck,
  EvidenceStatus,
  EvidenceObligation,
  Scenario,
  RuntimeEvidenceObservation,
  FitnessEvidenceObservation,
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
export type { EvidenceObligations, SharedScnCode, UntaggedScenario } from "./census/evidenceObligations.js";
// The codes more than one scenario carries: a published module — the CLI's
// ingest edge — names them from the file bytes it already holds, and the tag-inheritance walk that
// reads them stays internal, as it does for `evidenceReconciliationFromSources`.
export { sharedScnCodesOf } from "./census/evidenceObligations.js";

// --- Evidence Reconciliation (`domain/evidenceReconciliation.ts`) + the Ledger predicates ---
export { reconcile, evidenceReconciliationOf } from "./domain/evidenceReconciliation.js";
// The scenario code errors: the whole-run predicate the CLI ladder asks, and the shape.
export { hasScenarioCodeErrors } from "./domain/scenarioCodeError.js";
export type { ScenarioCodeError, ScenarioCodeErrorKind, ScenarioCodePopulation } from "./domain/scenarioCodeError.js";
// The whole-run predicates come DIRECT from the concept that OWNS them. They used to
// be re-exported through `reconcile/reconcile.js` — a shell kept alive purely to preserve importer
// paths after the behaviour was sent home. No symbol is re-exported through a module that does
// not own it.
export {
  isBalanced,
  hasPendingItems,
  hasBrokenEvidence,
  hasNothingToReconcile,
} from "./domain/ledger.js";
// The one verdict ladder the exit and the headline both read.
export { verdictCode } from "./domain/verdictCode.js";
export type { VerdictCode, VerdictInputs } from "./domain/verdictCode.js";

// The runtime evidence-observation census (`census/evidenceObservations.ts`) is RETIRED:
// its counting folds onto the Ledger (`runtimeObservationTally`, an internal domain fold), and its
// 6 symbols + `EvidenceObservationsSection` left this frozen-in-intent surface. Pre-freeze, no
// external consumer (unpublished package; only workspace dependents, all rewired).

// The static evidence-observation census (`census/staticEvidenceObservations.ts`) is RETIRED:
// its counting folds onto the Ledger (`staticObservationTally`, an internal domain fold),
// and its 2 symbols (`countStaticEvidenceObservationKinds` value / `StaticEvidenceObservationKindCounts`
// type) left this frozen-in-intent surface. `StaticCheckTotals` (the materialised headline, now
// Ledger-fold-sourced) STAYS on the barrel. Pre-freeze, no external consumer (unpublished package;
// only workspace dependents, all rewired).

// --- The next scenario code for a feature part (`domain/scnAllocation.ts`) ---
// On the root barrel because the published CLI reaches it, and `./internal` is not published.
export { nextScnCode } from "./domain/scnAllocation.js";
export type { Allocation, AllocationRequest, ScnSighting, UnknownPart } from "./domain/scnAllocation.js";

// --- Parse — result/CI readers (`parse/*`) ---
export { parseVitestEvidenceObservations } from "./parse/vitest.js";
export type { VitestJsonReport } from "./parse/vitest.js";
export { parseCucumberEvidenceObservations } from "./parse/cucumber.js";
export type { CucumberJsonReport } from "./parse/cucumber.js";
export { runningStaticChecks } from "./parse/runningStaticChecks.js";
export { ciRunCommands, commandInvokesScript } from "./parse/checkScriptsRunInCI.js";
export type { PackageJsonScripts } from "./parse/checkScriptsRunInCI.js";

// --- Evidence Reconciliation (the concept, `domain/evidenceReconciliation.ts`) + the RENDER
// INPUT the adapters frame around it (`assemble/renderInput.ts`). `RenderInput` is deliberately
// NOT a canon word: canon reserves "the report" for the RENDERED ARTEFACT, so the payload a
// renderer consumes must not borrow it. ---
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
  FitnessTally,
  EvidenceObligationsSection,
} from "./assemble/renderInput.js";

// --- The RECONCILE COMPOSITION over a target's already-read sources
// (`assemble/evidenceReconciliationFromSources.ts`) ---
// THE ONE ENTRY POINT THIS BARREL GAINS, and the reason it is here rather than on
// `./internal`: a published module — the CLI's ingest edge — has to reach the composition, and
// `./internal` is not published. The nine symbols it composes stay internal,
// so the surface a consumer's v1 contract carries widens by one name and nothing else.
export { evidenceReconciliationFromSources } from "./assemble/evidenceReconciliationFromSources.js";

// --- Render — model→string (`render/*`) ---
export { renderJson } from "./render/json.js";
export { renderMarkdown, renderReport, renderReportFromJson } from "./render/markdown.js";
export type { FeatureNames } from "./render/markdown.js";

// --- Provenance — pure subset (`provenance/provenance.ts`) ---
export { provenanceObject, projectProvenance, projectProvenanceObject } from "./provenance/provenance.js";
export type { RunContext, RunInputs, ProvenanceObject, ProvenanceFacts, ProvenanceInput } from "./provenance/provenance.js";

// --- Pure helpers ---
export { featureCodeOf, isFeaturePart } from "./domain/featureCode.js";
export { relativizeToRoot } from "./lib/portablePath.js";
