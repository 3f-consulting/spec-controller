/**
 * The @unit drift guard for @SCN-API-001 — the core barrel exports EXACTLY the
 * frozen v1 contract surface.
 *
 * Bidirectional evidence: the describe/it below carry the SCN-API-001 id,
 * back-linking to features/public-api.feature's @SCN-API-001 scenario.
 *
 * The expected sets below are transcribed ONCE from the frozen v1 surface — NOT
 * derived from the barrel's own exports (deriving from the barrel would defeat
 * the guard: a drifted barrel would silently redefine its own expectation).
 *
 * The surface is value AND type, and TypeScript types are erased at runtime, so
 * two arms are needed:
 *
 *   1. RUNTIME VALUE arm — `Object.keys(barrel).sort()` sees only the VALUE
 *      exports. Asserted EQUAL (toEqual, both directions) to
 *      EXPECTED_VALUE_EXPORTS, so a value symbol added to OR dropped from the
 *      barrel reds this test.
 *
 *   2. COMPILED-DECLARATION TYPE arm — the TypeScript compiler API
 *      (`typescript`, already a dep) is asked, at test time, for the barrel's
 *      exported TYPE names: it builds a Program over index.ts, resolves each
 *      module export (through its `export type { … }` alias) and keeps the
 *      symbols with TYPE meaning but NOT value meaning. That reflected set is
 *      asserted EQUAL to EXPECTED_TYPE_EXPORTS, both directions — so a type
 *      added, dropped, OR renamed on the barrel reds this test. (Runtime
 *      reflection cannot see type-only exports; reading them off the compiled
 *      declaration surface closes the type-add / type-rename hole a pure
 *      `import type` check leaves open.)
 */

import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

import * as barrel from "./index.js";

// -----------------------------------------------------------------------------
// COMPILED-DECLARATION TYPE arm — reflect the barrel's type-only export names.
// -----------------------------------------------------------------------------

const BARREL_PATH = fileURLToPath(new URL("./index.ts", import.meta.url));

/**
 * Reflect the TYPE-only export names of the core barrel via the TypeScript
 * compiler API — the compiled-declaration surface, independent of any runtime
 * namespace. A Program is built over index.ts with the repo's resolution
 * settings; each module export is resolved through its (`export type { … }`)
 * alias, and the ones carrying TYPE meaning but NOT value meaning are the
 * declared type exports. Deterministic (reads the on-disk source) and fast
 * (bind + symbol resolution only — no full type-check; ~0.3s locally).
 */
function reflectBarrelTypeExports(): string[] {
  const program = ts.createProgram([BARREL_PATH], {
    // Mirror tsconfig.json's resolution surface (ESM + Bundler + .js specifiers).
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ES2022,
    strict: true,
    noEmit: true,
    skipLibCheck: true,
  });
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(BARREL_PATH);
  if (source === undefined) {
    throw new Error(`@SCN-API-001 guard: could not load the barrel source at ${BARREL_PATH}`);
  }
  const moduleSymbol = checker.getSymbolAtLocation(source);
  if (moduleSymbol === undefined) {
    throw new Error("@SCN-API-001 guard: index.ts has no module symbol (is it a module?)");
  }

  const typeNames: string[] = [];
  for (const exported of checker.getExportsOfModule(moduleSymbol)) {
    let symbol = exported;
    if ((symbol.flags & ts.SymbolFlags.Alias) !== 0) {
      symbol = checker.getAliasedSymbol(symbol);
    }
    const hasType = (symbol.flags & ts.SymbolFlags.Type) !== 0;
    const hasValue = (symbol.flags & ts.SymbolFlags.Value) !== 0;
    // "type-but-not-value" — the frozen type surface (interfaces / type aliases).
    if (hasType && !hasValue) {
      typeNames.push(exported.name);
    }
  }
  return typeNames.sort();
}

// Every frozen v1 TYPE export (interfaces + type aliases). Transcribed ONCE from
// the frozen v1 surface — NOT derived from the barrel. Sorted; the arm asserts
// equality both ways (add/drop/rename).
const EXPECTED_TYPE_EXPORTS: readonly string[] = [
  // Model (model.ts)
  "QualityCheck",
  "RuntimeQualityCheck",
  "EvidenceStatus",
  "EvidenceObligation",
  "Scenario",
  "RuntimeEvidenceObservation",
  "GuardEvidenceObservation",
  "EvidenceObservation",
  "Outcome",
  "ScenarioVerdict",
  "ScenarioKind",
  "QualityCheckReconciliation",
  "ScenarioReconciliation",
  "EvidenceReconciliation",
  // Evidence-obligation census (census/evidenceObligations.ts)
  "EvidenceObligations",
  "UntaggedScenario",
  // Runtime observation counter (census/evidenceObservations.ts)
  "RuntimeEvidenceObservationKindCounts",
  "AttributedCount",
  // Static observation counter (census/staticEvidenceObservations.ts)
  "StaticEvidenceObservationKindCounts",
  // Parse — result/CI readers (parse/*)
  "VitestJsonReport",
  "CucumberJsonReport",
  "PackageJsonScripts",
  // Report model (assemble/report.ts)
  "Report",
  "ReportMetadata",
  "Summary",
  "ScenarioTotals",
  "EvidenceObligationTotals",
  "MissingByQualityCheck",
  "TestVolumeTotals",
  "StaticGuardTotals",
  "LintTally",
  "EvidenceObligationsSection",
  "EvidenceObservationsSection",
  // Render (render/*)
  "FeatureNames",
  // Provenance — pure subset (provenance/provenance.ts)
  "RunContext",
  "RunInputs",
  "ProvenanceObject",
  "ProvenanceFacts",
  "ProvenanceInput",
];

// -----------------------------------------------------------------------------
// RUNTIME VALUE arm — reflect the barrel's value export names at runtime.
// -----------------------------------------------------------------------------

// Every frozen v1 VALUE export (functions + consts). Types are erased at
// runtime, so `Object.keys(barrel)` sees only these. Transcribed from the frozen
// v1 surface.
const EXPECTED_VALUE_EXPORTS: readonly string[] = [
  // Scenario parse (parse/scenarios.ts)
  "parseScenarios",
  "countScnOccurrences",
  "parseUntaggedScenarios",
  "proseOnlyCodes",
  "DEFAULT_DEFERRAL_TAGS",
  // Evidence-obligation census (census/evidenceObligations.ts)
  "evidenceObligations",
  // Reconcile (reconcile/reconcile.ts)
  "reconcile",
  "isBalanced",
  // Runtime observation counter (census/evidenceObservations.ts)
  "countRuntimeEvidenceObservationKinds",
  "RUNTIME_QUALITY_CHECKS",
  "totalEvidenceObservations",
  "attributedTotal",
  // Static observation counter (census/staticEvidenceObservations.ts)
  "countStaticEvidenceObservationKinds",
  // Parse — result/CI readers (parse/*)
  "parseVitestEvidenceObservations",
  "parseCucumberEvidenceObservations",
  "checkStaticEvidenceObligations",
  "runningStaticGuards",
  "ciRunCommands",
  "commandInvokesScript",
  // Report model (assemble/report.ts)
  "assembleReport",
  // Render (render/*)
  "renderJson",
  "renderMarkdown",
  "renderReport",
  "renderReportFromJson",
  // Provenance — pure subset (provenance/provenance.ts)
  "provenanceObject",
  "projectProvenance",
  "projectProvenanceObject",
  // Pure helpers
  "featureCodeOf",
  "relativizeToRoot",
];

describe("[SCN-API-001] the core barrel exports exactly the frozen v1 contract surface", () => {
  it("re-exports exactly the frozen VALUE surface — reds on any value symbol added or dropped", () => {
    const actual = Object.keys(barrel).sort();
    expect(actual).toEqual([...EXPECTED_VALUE_EXPORTS].sort());
  });

  it("re-exports exactly the frozen TYPE surface — reds on any type added, dropped, or renamed", () => {
    const actual = reflectBarrelTypeExports();
    expect(actual).toEqual([...EXPECTED_TYPE_EXPORTS].sort());
  });

  it("names each frozen symbol exactly once (no accidental duplicate in the expected sets)", () => {
    expect(new Set(EXPECTED_VALUE_EXPORTS).size).toBe(EXPECTED_VALUE_EXPORTS.length);
    expect(new Set(EXPECTED_TYPE_EXPORTS).size).toBe(EXPECTED_TYPE_EXPORTS.length);
  });
});
