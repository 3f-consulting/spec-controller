/**
 * The public core barrel — the single entrypoint of the
 * `@3f-consulting/spec-controller-core` package.
 *
 * This re-exports EXACTLY the frozen v1 contract surface. The `@unit` drift
 * guard in `index.test.ts` (@SCN-API-001, features/public-api.feature)
 * reconciles this barrel's actual exports against that frozen enumeration, both
 * directions — so a symbol added here OR dropped reds CI. The surface is the
 * contract downstream consumers build on; it cannot drift silently.
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
// The whole-run predicates come DIRECT from the concept that declares them (3F-2232). They used to
// be re-exported through `reconcile/reconcile.js` — a shell kept alive purely to preserve importer
// paths after 3F-1994 sent the behaviour home. No symbol is re-exported through a module that does
// not declare it.
export { isBalanced, hasPendingItems, hasBrokenEvidence } from "./domain/ledger.js";

// The runtime evidence-observation census (`census/evidenceObservations.ts`) is RETIRED (3F-2104):
// its counting folds onto the Ledger (`runtimeObservationTally`, an internal domain fold), and its
// 6 symbols + `EvidenceObservationsSection` left this frozen-in-intent surface. Pre-freeze, no
// external consumer (unpublished package; only workspace dependents, all rewired). See @SCN-API-001.

// The static evidence-observation census (`census/staticEvidenceObservations.ts`) is RETIRED
// (3F-2119): its counting folds onto the Ledger (`staticObservationTally`, an internal domain fold),
// and its 2 symbols (`countStaticEvidenceObservationKinds` value / `StaticEvidenceObservationKindCounts`
// type) left this frozen-in-intent surface. `StaticGuardTotals` (the materialised headline, now
// Ledger-fold-sourced) STAYS on the barrel. Pre-freeze, no external consumer (unpublished package;
// only workspace dependents, all rewired). See @SCN-API-001.

// --- Parse — result/CI readers (`parse/*`) ---
export { parseVitestEvidenceObservations } from "./parse/vitest.js";
export type { VitestJsonReport } from "./parse/vitest.js";
export { parseCucumberEvidenceObservations } from "./parse/cucumber.js";
export type { CucumberJsonReport } from "./parse/cucumber.js";
export { checkStaticEvidenceObligations } from "./parse/checkStaticEvidenceObligations.js";
export { runningStaticGuards } from "./parse/runningStaticGuards.js";
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
  StaticGuardTotals,
  LintTally,
  EvidenceObligationsSection,
} from "./assemble/renderInput.js";

// --- Render — model→string (`render/*`) ---
export { renderJson } from "./render/json.js";
export { renderMarkdown, renderReport, renderReportFromJson } from "./render/markdown.js";
export type { FeatureNames } from "./render/markdown.js";

// --- Provenance — pure subset (`provenance/provenance.ts`) ---
export { provenanceObject, projectProvenance, projectProvenanceObject } from "./provenance/provenance.js";
export type { RunContext, RunInputs, ProvenanceObject, ProvenanceFacts, ProvenanceInput } from "./provenance/provenance.js";

// --- Pure helpers ---
export { featureCodeOf } from "./lib/featureCode.js";
export { relativizeToRoot } from "./lib/portablePath.js";
