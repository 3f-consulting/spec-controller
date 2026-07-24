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
// @SCN-API-002 — the barrel exposes the TYPE for READING the reconciliation the
// engine produced; there is no exported route to CONSTRUCT one (the nominal brand).
import type { QualityCheckReconciliation } from "./index.js";

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
  "Ledger",
  // Evidence-obligation census (census/evidenceObligations.ts)
  "EvidenceObligations",
  "UntaggedScenario",
  // The runtime observation counter (census/evidenceObservations.ts) is RETIRED (3F-2104) — its
  // types `RuntimeEvidenceObservationKindCounts` / `AttributedCount` left the frozen surface.
  // The static observation counter (census/staticEvidenceObservations.ts) is RETIRED (3F-2119) — its
  // type `StaticEvidenceObservationKindCounts` left the frozen surface (counting folds onto the
  // Ledger, `staticObservationTally`). `StaticGuardTotals` (below) — the materialised headline, now
  // Ledger-fold-sourced — STAYS.
  // Parse — result/CI readers (parse/*)
  "VitestJsonReport",
  "CucumberJsonReport",
  "PackageJsonScripts",
  // Evidence Reconciliation — layer 1, the assembled statement (assemble/report.ts)
  "EvidenceReconciliation",
  "ReportMetadata",
  "Summary",
  "ScenarioReconciliationTotals",
  "EvidenceObligationTotals",
  "MissingByQualityCheck",
  "TestVolumeTotals",
  "StaticGuardTotals",
  "LintTally",
  "EvidenceObligationsSection",
  // `EvidenceObservationsSection` RETIRED (3F-2104) — the section is no longer emitted.
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
  // Evidence-obligation census (census/evidenceObligations.ts)
  "evidenceObligations",
  // Reconcile (reconcile/reconcile.ts)
  "reconcile",
  "isBalanced",
  "hasPendingItems",
  "hasBrokenEvidence",
  // The runtime observation counter (census/evidenceObservations.ts) is RETIRED (3F-2104) — its
  // values `countRuntimeEvidenceObservationKinds` / `RUNTIME_QUALITY_CHECKS` /
  // `totalEvidenceObservations` / `attributedTotal` left the frozen surface.
  // The static observation counter (census/staticEvidenceObservations.ts) is RETIRED (3F-2119) — its
  // value `countStaticEvidenceObservationKinds` left the frozen surface (counting folds onto the
  // Ledger, `staticObservationTally`).
  // Parse — result/CI readers (parse/*)
  "parseVitestEvidenceObservations",
  "parseCucumberEvidenceObservations",
  "checkStaticEvidenceObligations",
  "runningStaticGuards",
  "ciRunCommands",
  "commandInvokesScript",
  // Evidence Reconciliation — layer 1, the assembled statement (assemble/report.ts)
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

  // The manifesto retires "the collection named `scenarios`" — the collection is the Scenario
  // Reconciliations, since a scenario is only the declared thing. @SCN-RMD-002 made that rename
  // at the top level (`report.scenarios` → `report.evidenceReconciliation`, pinned there by
  // `not.toHaveProperty("scenarios")`); 3F-1725 finishes it on the summary. This pins the
  // RETIREMENT by name on the actual surface, so the old spelling cannot creep back re-exported.
  it("[SCN-API-001] retires ScenarioTotals from the actual type surface — the totals are the Scenario Reconciliations'", () => {
    expect(reflectBarrelTypeExports()).not.toContain("ScenarioTotals");
    expect(reflectBarrelTypeExports()).toContain("ScenarioReconciliationTotals");
  });

  // The static evidence-observation census is RETIRED (3F-2119) — its counting folds onto the
  // Ledger (`staticObservationTally`). This pins the RETIREMENT of its 2 public symbols BY NAME on
  // the actual surface (the value `countStaticEvidenceObservationKinds`, the type
  // `StaticEvidenceObservationKindCounts`), so neither can creep back re-exported. `StaticGuardTotals`
  // — the materialised headline type, now Ledger-fold-sourced — STAYS on the frozen surface.
  it("[SCN-API-001] retires the static-census symbols from the actual surface, keeping StaticGuardTotals", () => {
    expect(Object.keys(barrel)).not.toContain("countStaticEvidenceObservationKinds");
    expect(reflectBarrelTypeExports()).not.toContain("StaticEvidenceObservationKindCounts");
    expect(reflectBarrelTypeExports()).toContain("StaticGuardTotals");
  });

  it("names each frozen symbol exactly once (no accidental duplicate in the expected sets)", () => {
    expect(new Set(EXPECTED_VALUE_EXPORTS).size).toBe(EXPECTED_VALUE_EXPORTS.length);
    expect(new Set(EXPECTED_TYPE_EXPORTS).size).toBe(EXPECTED_TYPE_EXPORTS.length);
  });
});

// -----------------------------------------------------------------------------
// @SCN-API-002 — the v1 barrel exposes QualityCheckReconciliation for READING,
// not CONSTRUCTION. The type is exported (a consumer reads the reconciliation the
// engine minted); no constructor is. The module-private nominal brand
// (domain/qualityCheckReconciliation.ts) makes any externally-assembled
// QCR-shaped literal a COMPILE ERROR — the engine is the only mint.
//
// This is a TYPE-LEVEL guard: its evidence is `tsc --noEmit` (the `typecheck` CI
// step), which type-checks this file. The `@ts-expect-error` below asserts the
// assignment is rejected; if the brand ever stopped blocking external
// construction, the assignment would compile, the `@ts-expect-error` would go
// UNUSED, and `tsc` would red on the now-superfluous directive. TEETH proven by
// mutation (removing the directive reds `tsc`) — captured in this scenario's PR.
//
// Bidirectional back-reference: grepping `@SCN-API-002` returns this test AND the
// features/public-api.feature scenario.
// -----------------------------------------------------------------------------

// A plausible, well-formed QCR-shaped object literal — every FIELD of the
// reconciling item, exactly as the engine's own output carries them — but WITHOUT
// the module-private brand (there is no exported route to it).
const externallyAssembledQcr = {
  qualityCheck: "unit" as const,
  outcome: "satisfied" as const,
};

// @SCN-API-002 — the type-level guard. The barrel exports the type, so an external
// consumer can NAME it, but the nominal brand makes assigning a hand-built literal
// to it a compile error. Removing the directive (or supplying the unforgeable
// brand) reds `tsc --noEmit`.
// @ts-expect-error — a QCR-shaped literal is missing the module-private nominal
// brand; only the engine's makeQualityCheckReconciliation (unexported) can mint one.
const _externalMintAttempt: QualityCheckReconciliation = externallyAssembledQcr;

describe("[SCN-API-002] the v1 barrel exposes QualityCheckReconciliation for reading, not construction", () => {
  it("exposes the type for READING — a QCR-shaped literal's fields round-trip through JSON (the phantom brand is omitted)", () => {
    // The runtime companion to the type-level guard: the brand is a phantom (a
    // Symbol key with no runtime presence), so the engine-produced reconciliation
    // a consumer READS is byte-plain over its fields — JSON.stringify omits the
    // brand, exactly as a v1 consumer serialising a Ledger relies on.
    expect(JSON.parse(JSON.stringify(externallyAssembledQcr))).toEqual(externallyAssembledQcr);
    // The type is genuinely on the barrel's surface (@SCN-API-001 pins it in the
    // frozen TYPE set) — reading is fully supported; only construction is closed.
    void (_externalMintAttempt as unknown);
  });
});
