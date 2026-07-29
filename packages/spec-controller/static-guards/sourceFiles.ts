/**
 * The ONE source-tree walk the static-guard tests share, and the ONE anti-vacuity floor for the
 * core-src population (3F-2266).
 *
 * Three guard tests — `noParallelStore` (@SCN-NPS-001), `enginePurity` (@SCN-EPG-001) and
 * `domainPurity` (@SCN-DPG-001) — each carried a byte-identical copy of this walk, differing only
 * in the recursive-call name, the element type, and the root. The same rule written three times
 * agrees by COINCIDENCE, not by construction: change one walk, or bump one floor and not the
 * others, and they drift apart silently with nothing to red it. That is the agreeing-by-copy the
 * domain-model work spent five slices removing from the domain; this removes it from the guards'
 * scaffolding.
 *
 * WHY IT LIVES HERE AND NOT IN THE ENGINE. It imports `node:fs`, and @SCN-EPG-001 reds any file
 * under `packages/core/src` that imports a node IO builtin — siting it in the engine would make the
 * purity guard fail on its own scaffolding. It must also stay OUT of the walked population, or it
 * would shift the very counts it is used to assert. `static-guards/` satisfies both by
 * construction; it is where the guards it serves already live (product-not-app, reads the tree).
 *
 * WHAT IS SHARED AND WHAT IS NOT. The WALK is shared three ways — all three guards collect the same
 * way, differing only in root. The FLOOR is shared TWO ways: only `noParallelStore` and
 * `enginePurity` walk the same population (`CORE_SRC_ROOT`), so only they can share a floor.
 * `domainPurity` walks a smaller subtree and keeps its own floor locally — a different population
 * is a different floor, and unifying them would be a behaviour change dressed as a tidy-up. The
 * asymmetry is deliberate; do not "finish the job" by moving the domain floor here.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * A file the walk collected — its repo-relative path and its raw source.
 *
 * THE element type the guards take, being collapsed onto one guard at a time (3F-2274 — the DRY
 * completion tidy-kiwi deferred, because it changes guard modules' public signatures and that is a
 * different change with a different risk profile from moving test scaffolding). `noParallelStore`
 * and `enginePurity` take it directly as of that ticket's first two sub-issues.
 *
 * `domainPurity` still declares its own structurally-identical alias (`DomainFile`), so a
 * `CollectedFile[]` still passes into `checkDomainPurity` with no cast until its sub-issue lands.
 *
 * A guard imports it with `import type`, never a value import: this module reads `node:fs`, and the
 * guards are pure by construction. The type import erases at compile, so no `check…()` acquires a
 * runtime edge to the collector — observed per sub-issue via an esbuild emit, not assumed.
 */
export interface CollectedFile {
  path: string;
  source: string;
}

/** The core engine's source root — the population `noParallelStore` and `enginePurity` share. */
export const CORE_SRC_ROOT = join(process.cwd(), "packages", "core", "src");

/**
 * The domain subtree — DERIVED from `CORE_SRC_ROOT` rather than re-spelled, so "where core src is"
 * is stated exactly once.
 */
export const DOMAIN_ROOT = join(CORE_SRC_ROOT, "domain");

/**
 * The anti-vacuity floor for the `CORE_SRC_ROOT` population: how many production files the walk
 * must find before a clean verdict counts as a scan at all (a check that scanned nothing isn't a
 * check).
 *
 * It sits well BELOW the real count, not just under it — a broken walk yields ~0, so catching that
 * needs no tight margin, while a tight one reds on ordinary deletion and blames a parallel store
 * for it (3F-2201). The required headroom is asserted, not merely intended.
 */
export const MIN_CORE_SRC_FILES_SCANNED = 10;

/** The headroom the floor must keep below the real tree, in files (3F-2201). */
export const REQUIRED_FLOOR_HEADROOM = 10;

/**
 * Walk a source tree, collecting every PRODUCTION file (`.ts`, excluding `*.test.ts`) beneath it,
 * in directory-sorted order, with repo-relative paths.
 *
 * Parameterised by root — that is the whole of the difference the three copies used to encode.
 */
export function collectSourceFiles(dir: string): CollectedFile[] {
  const out: CollectedFile[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectSourceFiles(abs));
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      out.push({ path: abs.slice(process.cwd().length + 1), source: readFileSync(abs, "utf8") });
    }
  }
  return out;
}
