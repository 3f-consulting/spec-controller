/**
 * Unit test for the no-parallel-store static check (@SCN-NPS-001) — and the shape every check in
 * this tree is being cut to (3F-3218): the check, ONE arm that plants every violation it detects,
 * and the named run that exercises it over the real repository.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe string carries the @SCN-NPS-001 id
 * matching features/no-parallel-store.feature, so a grep of the id returns both halves of the pair.
 * `@unit`-only — Cucumber skips it; this Vitest test IS the observed evidence, mirroring
 * @SCN-EPG-001 / @SCN-DPG-001 exactly.
 *
 * ONE ASSERTION OVER THE WHOLE VERDICT, NOT ONE ARM PER RULE. Separate arms each saying "this kind
 * is detected" leave ORDER and COMPLETENESS unasserted — a checker reporting the same kinds plus a
 * spurious extra, or in another order, satisfies all of them. The single `toEqual` below closes
 * both. It is also the only form that can state this module's WITHIN-FILE ORDER at all: a file's
 * retired-symbol definitions are reported BEFORE its parallel-store fields, whatever order they sit
 * in the source — a claim about which loop ran first, unassertable by an arm that only asks "was
 * something reported?", and untested before this commit.
 *
 * THE CLEAN FILE IS A NEGATIVE CONTROL COSTING A LINE RATHER THAN AN ARM. It is proven clean by its
 * ABSENCE from the pinned array, and it carries the boundaries the real-tree arm below cannot
 * reach — measured, not assumed. Comment-stripping in particular has NO teeth anywhere else in this
 * repository: no production file under `packages/core/src` carries a `<keyword> <retired name>` or
 * an `attributed:` shape, in code or in comment. The one boundary the real tree DOES hold is the
 * legitimate `evidenceObservations` Ledger-row field (@SCN-LDG-022) — eight sites under
 * `domain/`, so a field arm widened to match it reds the real-tree arm. That control is kept as a
 * line for the reader, not because the fixture is the only thing holding it.
 *
 * WHY THE REAL-TREE ARM STAYS (3F-3218 Ruling B, measured at 3F-3221 rather than inherited). All 13
 * rows of package.json's specController.fitnessChecks were read: none runs `checkNoParallelStore`,
 * and no `lint:` / `guard:` script invokes it either. Grepped across the repository, the checker is
 * referenced from exactly ONE file — this one. Unlike engine purity (whose checker
 * sourcePopulation.test.ts borrows as an instrument under @SCN-SRC-001), nothing else reaches this
 * one at all, so the dogfood arm below is not merely the better second half: it is the only contact
 * this guard has with the repository.
 *
 * WHY THAT ARM PINS THE POPULATION EXACTLY AND NOT ONLY BY THE SHARED FLOOR (3F-3221). The floor
 * proves the walk found SOMETHING; the pin proves it found EVERYTHING. Measured by plant, over the
 * whole 1491-test suite: a walk silently dropping ONE core-src file — 38 to 37, twenty-seven clear
 * of the floor of 10 — reds this assertion and NOTHING ELSE in the repository. Every scope-dependent
 * guard, this one and @SCN-EPG-001 both, goes on reporting green over a denominator one file
 * smaller, which is the vacuous green this product is named for. The pin is therefore this arm's own
 * anti-vacuity condition stated exactly, not a foreign claim borrowing its title; the floor is the
 * weaker form of the same sentence, kept because it is SHARED with @SCN-EPG-001 and a literal here
 * would be a second copy of that rule (3F-2266).
 */

import { describe, expect, it } from "vitest";

import { checkNoParallelStore } from "./noParallelStore.js";
import {
  collectSourceFiles,
  coreSrcRoot,
  MIN_CORE_SRC_FILES_SCANNED,
  resolveRepositoryRoot,
  type CollectedFile,
} from "./sourceFiles.js";

/** The repository this lock is asked about, resolved ONCE and passed down (3F-3207). */
const REPOSITORY_ROOT = resolveRepositoryRoot();

/**
 * The production core-src population — the ONE exact pin on it left in this repository (3F-3221).
 *
 * Bump it when a core module is legitimately added or removed; the count moving is the fact this
 * constant exists to make loud, and `git log -S CORE_SRC_FILE_COUNT` carries which slice moved it
 * each time it did. What it must never be is loosened into a floor: the floor is already asserted
 * below, and it is measurably blind to the fault this catches.
 */
const CORE_SRC_FILE_COUNT = 38;

describe("[SCN-NPS-001] no parallel store re-represents the Ledger's entries", () => {
  it("reports every planted violation, in order, and nothing for the clean file beside them", () => {
    const planted: CollectedFile[] = [
      // retired-module-file, both terms — the retired runtime and static census modules, whose
      // counting is now a Ledger fold. This arm reads the PATH, not the source, so the bodies are
      // beside the point and say so.
      { path: "packages/core/src/census/evidenceObservations.ts", source: `export const runtime = 1;` },
      { path: "packages/core/src/assemble/staticEvidenceObservations.ts", source: `export const statics = 2;` },

      // retired-symbol: all five retired credit-list/section names, across all eight definition
      // keywords the module accepts. A checker recognising only the first term of either
      // alternation is caught by the SHAPE of the array below, which no per-kind arm could see.
      {
        path: "packages/core/src/assemble/report.ts",
        source: [
          `export interface AttributedCount { qualityCheck: string; count: number; }`,
          `export type EvidenceObservationsSection = { kinds: number[] };`,
          `export class RuntimeEvidenceObservationKindCounts {}`,
          `export enum StaticEvidenceObservationKindCounts { Missing }`,
          `export function countStaticEvidenceObservationKinds() { return 0; }`,
          `const AttributedCount = 1;`,
          `let EvidenceObservationsSection = 2;`,
          `var RuntimeEvidenceObservationKindCounts = 3;`,
        ].join("\n"),
      },

      // parallel-store-field, both spellings a re-added credit list could take — and the WITHIN-FILE
      // ORDER the module fixes: the fields sit FIRST in this source and are still reported LAST,
      // after the definition below them, because the symbol loop runs before the field loop.
      {
        path: "packages/core/src/render/json.ts",
        source: [
          `export interface SectionModel { attributed: Credit[]; }`,
          `export interface Optional { attributed ?: Credit[]; }`,
          `export type AttributedCount = { n: number };`,
        ].join("\n"),
      },

      // Clean — the lock's real shape, plus the boundaries the real tree cannot state.
      {
        // A DIRECTORY named for a retired module is not the retired MODULE: the basename arm is
        // anchored to `<name>.ts` at the path's END, never a substring of it.
        path: "packages/core/src/evidenceObservations/index.ts",
        source: [
          // The Ledger row legitimately carries `evidenceObservations` — the ONE store
          // (@SCN-LDG-022). The field arm targets `attributed`, so it never touches it.
          `export interface ScenarioReconciliation { evidenceObservations: EvidenceObservation[]; }`,
          // `attributed` is refused as a whole word immediately before `:` — never as a prefix of a
          // longer key, and never inside a longer word.
          `export interface Provenance { attributedTo: string; reattributed: number; }`,
          // A MENTION is not a DEFINITION: without one of the eight keywords directly in front, a
          // retired name is a reference, which is what importing a legacy type looks like.
          `import type { AttributedCount } from "../legacy/attributedCount.js";`,
          // And a comment that DEFINES one is still a comment. These two lines are the only teeth
          // stripComments has anywhere in this repository — measured, no production file under
          // packages/core/src carries either shape, in code or in comment.
          `/* export interface EvidenceObservationsSection { kinds: number[] } */`,
          `// export interface AttributedCount { count: number }`,
        ].join("\n"),
      },
    ];

    expect(checkNoParallelStore(planted)).toEqual([
      { path: "packages/core/src/census/evidenceObservations.ts", kind: "retired-module-file", detail: "evidenceObservations.ts" },
      { path: "packages/core/src/assemble/staticEvidenceObservations.ts", kind: "retired-module-file", detail: "staticEvidenceObservations.ts" },
      { path: "packages/core/src/assemble/report.ts", kind: "retired-symbol", detail: "AttributedCount" },
      { path: "packages/core/src/assemble/report.ts", kind: "retired-symbol", detail: "EvidenceObservationsSection" },
      { path: "packages/core/src/assemble/report.ts", kind: "retired-symbol", detail: "RuntimeEvidenceObservationKindCounts" },
      { path: "packages/core/src/assemble/report.ts", kind: "retired-symbol", detail: "StaticEvidenceObservationKindCounts" },
      { path: "packages/core/src/assemble/report.ts", kind: "retired-symbol", detail: "countStaticEvidenceObservationKinds" },
      { path: "packages/core/src/assemble/report.ts", kind: "retired-symbol", detail: "AttributedCount" },
      { path: "packages/core/src/assemble/report.ts", kind: "retired-symbol", detail: "EvidenceObservationsSection" },
      { path: "packages/core/src/assemble/report.ts", kind: "retired-symbol", detail: "RuntimeEvidenceObservationKindCounts" },
      { path: "packages/core/src/render/json.ts", kind: "retired-symbol", detail: "AttributedCount" },
      { path: "packages/core/src/render/json.ts", kind: "parallel-store-field", detail: "attributed" },
      { path: "packages/core/src/render/json.ts", kind: "parallel-store-field", detail: "attributed" },
    ]);
  });

  it("passes clean over the REAL packages/core/src tree (the lock holds today)", () => {
    // The dogfood green, and this guard's only contact with the repository: any resurrected census
    // module, re-defined retired symbol or re-added `attributed` credit list reds here.
    const coreFiles = collectSourceFiles(coreSrcRoot(REPOSITORY_ROOT), REPOSITORY_ROOT);
    // Sanity, in both directions. The floor is the SHARED one — this guard and @SCN-EPG-001 walk
    // the same population, so a bare literal here would be a second copy of the same rule, drifting
    // the moment either is retuned (3F-2266). The pin is the exact form the floor cannot reach: a
    // walk that quietly returned 37 of these 38 files clears a floor of 10 by twenty-seven, and
    // every guard over this population would then report green about a smaller world.
    expect(coreFiles.length).toBeGreaterThan(MIN_CORE_SRC_FILES_SCANNED);
    expect(coreFiles).toHaveLength(CORE_SRC_FILE_COUNT);
    expect(checkNoParallelStore(coreFiles)).toEqual([]);
  });
});
