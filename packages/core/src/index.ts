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
  EvidenceReconciliation,
} from "./model.js";

// --- Scenario parse (`parse/scenarios.ts`) ---
export { parseScenarios, countScnOccurrences, parseUntaggedScenarios, proseOnlyCodes } from "./parse/scenarios.js";

// --- Evidence-obligation census (`census/evidenceObligations.ts`) ---
export { evidenceObligations } from "./census/evidenceObligations.js";
export type { EvidenceObligations, UntaggedScenario } from "./census/evidenceObligations.js";

// --- Reconcile (`reconcile/reconcile.ts`) ---
export { reconcile, isBalanced } from "./reconcile/reconcile.js";

// --- Runtime observation counter (`census/evidenceObservations.ts`) ---
export {
  countRuntimeEvidenceObservationKinds,
  RUNTIME_QUALITY_CHECKS,
  totalEvidenceObservations,
  attributedTotal,
} from "./census/evidenceObservations.js";
export type { RuntimeEvidenceObservationKindCounts, AttributedCount } from "./census/evidenceObservations.js";

// --- Static observation counter (`census/staticEvidenceObservations.ts`) ---
export { countStaticEvidenceObservationKinds } from "./census/staticEvidenceObservations.js";
export type { StaticEvidenceObservationKindCounts } from "./census/staticEvidenceObservations.js";

// --- Parse — result/CI readers (`parse/*`) ---
export { parseVitestEvidenceObservations } from "./parse/vitest.js";
export type { VitestJsonReport } from "./parse/vitest.js";
export { parseCucumberEvidenceObservations } from "./parse/cucumber.js";
export type { CucumberJsonReport } from "./parse/cucumber.js";
export { checkStaticEvidenceObligations } from "./parse/checkStaticEvidenceObligations.js";
export { runningStaticGuards } from "./parse/runningStaticGuards.js";
export { ciRunCommands, commandInvokesScript } from "./parse/checkScriptsRunInCI.js";
export type { PackageJsonScripts } from "./parse/checkScriptsRunInCI.js";

// --- Report model (`assemble/report.ts`) ---
export { assembleReport } from "./assemble/report.js";
export type {
  Report,
  ReportMetadata,
  Summary,
  ScenarioTotals,
  EvidenceObligationTotals,
  MissingByQualityCheck,
  TestVolumeTotals,
  StaticGuardTotals,
  LintTally,
  EvidenceObligationsSection,
  EvidenceObservationsSection,
} from "./assemble/report.js";

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
