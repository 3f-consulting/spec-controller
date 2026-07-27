/**
 * Unit test for the no-parallel-store static guard (@SCN-NPS-001) — the capstone lock of the DDD
 * retrofit (Slice 8): the Ledger is the ONE source of truth; nothing re-represents its entries in
 * a parallel store.
 *
 * Bidirectional evidence (Evidence Manifesto §9 / the discipline): the describe/it strings carry
 * the @SCN-NPS-001 id matching features/no-parallel-store.feature, so a grep of the id returns both
 * halves of the pair. `@unit`-only — Cucumber skips it; this Vitest test IS the observed evidence,
 * mirroring @SCN-DPG-001 / @SCN-EPG-001 exactly. CI-gated via `pnpm test` (NO npm script, NO added
 * CI step, NO @lint tag — that would self-trip the USG guard).
 *
 * Teeth are proven over PLANTED violating sources (each arm reds — a re-added
 * `census/evidenceObservations.ts` file; a re-declared `interface AttributedCount`; a re-added
 * `attributed` credit-list field), so a no-op checker fails the planted cases; then GREEN over the
 * REAL packages/core/src tree (the dogfood assertion that the lock holds today — the census modules
 * stay retired, their counting a Ledger fold), with a >N-files-scanned floor so an empty walk can't
 * masquerade as green.
 *
 * Parent: @SCN-NPS-001 — the no-parallel-store static guard (3F-2199, DDD retrofit Slice 8 ①).
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { checkNoParallelStore, type SourceFile } from "./noParallelStore.js";

const CORE_SRC_ROOT = join(process.cwd(), "packages", "core", "src");

/** Walk the real core src tree, collecting every PRODUCTION file (excluding *.test.ts). */
function collectCoreFiles(dir: string): SourceFile[] {
  const out: SourceFile[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectCoreFiles(abs));
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      out.push({ path: abs.slice(process.cwd().length + 1), source: readFileSync(abs, "utf8") });
    }
  }
  return out;
}

describe("[SCN-NPS-001] no parallel store re-represents the Ledger's entries", () => {
  it("flags a re-added retired census module file (evidenceObservations.ts / staticEvidenceObservations.ts)", () => {
    // Teeth (retired-module-file arm): the retired runtime/static evidence-observation census
    // modules stay deleted — re-adding either (their counting is now a Ledger fold) must red.
    const planted: SourceFile[] = [
      { path: "packages/core/src/census/evidenceObservations.ts", source: `export const x = 1;` },
      { path: "packages/core/src/census/staticEvidenceObservations.ts", source: `export const y = 2;` },
    ];
    const violations = checkNoParallelStore(planted);
    expect(violations.map((v) => v.kind)).toEqual(["retired-module-file", "retired-module-file"]);
    expect(violations.map((v) => v.detail)).toEqual(["evidenceObservations.ts", "staticEvidenceObservations.ts"]);
  });

  it("flags a re-declared retired credit-list / section symbol (AttributedCount, EvidenceObservationsSection, …)", () => {
    // Teeth (retired-declaration arm): a real DECLARATION of any retired symbol must red — the
    // parallel-store types the census used to carry. Comment-stripped, so a doc-comment NAMING the
    // symbol (as the real retirement notes do) does not self-trip.
    const planted: SourceFile[] = [
      { path: "packages/core/src/assemble/report.ts", source: `export interface AttributedCount { qualityCheck: string; count: number; }` },
      { path: "packages/core/src/assemble/report.ts", source: `export interface EvidenceObservationsSection { kinds: number[]; }` },
      { path: "packages/core/src/census/x.ts", source: `export interface RuntimeEvidenceObservationKindCounts { unit: number; }` },
      { path: "packages/core/src/census/y.ts", source: `export type StaticEvidenceObservationKindCounts = { missing: number };` },
      { path: "packages/core/src/census/z.ts", source: `export function countStaticEvidenceObservationKinds() { return 0; }` },
    ];
    const violations = checkNoParallelStore(planted);
    expect(violations.map((v) => v.kind)).toEqual([
      "retired-declaration",
      "retired-declaration",
      "retired-declaration",
      "retired-declaration",
      "retired-declaration",
    ]);
    expect(violations.map((v) => v.detail)).toEqual([
      "AttributedCount",
      "EvidenceObservationsSection",
      "RuntimeEvidenceObservationKindCounts",
      "StaticEvidenceObservationKindCounts",
      "countStaticEvidenceObservationKinds",
    ]);
  });

  it("flags a re-added `attributed` parallel credit-list field on the assembled model", () => {
    // Teeth (parallel-store-field arm): the per-(scnId, quality-check) `attributed[]` credit-list
    // the retired section re-represented must red — the posted credits live on the Ledger rows
    // (`evidenceObservations`, @SCN-LDG-022), the ONE source; a parallel `attributed` re-represents.
    const planted: SourceFile[] = [
      { path: "packages/core/src/assemble/report.ts", source: `export interface SectionModel { attributed: { qualityCheck: string; count: number }[]; }` },
    ];
    const violations = checkNoParallelStore(planted);
    expect(violations.map((v) => v.kind)).toEqual(["parallel-store-field"]);
    expect(violations[0]?.detail).toBe("attributed");
  });

  it("does NOT flag the legitimate `evidenceObservations` Ledger-row field, nor a comment naming a retired symbol", () => {
    // The lock's real shape: the Ledger row legitimately carries `evidenceObservations` (the ONE
    // store, @SCN-LDG-022); a retirement doc-comment legitimately NAMES the retired symbols. Neither
    // is a parallel store — the field arm targets `attributed`, and comments are stripped.
    const clean: SourceFile[] = [
      {
        path: "packages/core/src/domain/scenarioReconciliation.ts",
        source: `export interface ScenarioReconciliation {\n  evidenceObservations: EvidenceObservation[];\n}\n// EvidenceObservationsSection + AttributedCount are RETIRED (3F-2104); their counting folds onto the Ledger.\n/* countStaticEvidenceObservationKinds is gone; see staticObservationTally. */`,
      },
    ];
    expect(checkNoParallelStore(clean)).toEqual([]);
  });

  it("passes clean over the REAL packages/core/src tree (the lock holds today)", () => {
    // The dogfood green: the census modules stay retired, no retired symbol is re-declared, no
    // parallel `attributed` field exists. Any future resurrection reds this.
    const coreFiles = collectCoreFiles(CORE_SRC_ROOT);
    // Sanity: we actually scanned the tree (not an empty walk masquerading as green). The core has
    // dozens of production modules; a floor well above any accidental under-count.
    expect(coreFiles.length).toBeGreaterThan(20);
    expect(checkNoParallelStore(coreFiles)).toEqual([]);
  });
});
