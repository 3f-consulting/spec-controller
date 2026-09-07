/**
 * The ONE source-tree walk the static checks share, the ONE element type they take (3F-2274), the
 * ONE anti-vacuity floor for the core-src population (3F-2266), and the ONE reading of which roots
 * this repository's own source lives under (3F-2988).
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
 * would shift the very counts it is used to assert. `tests/checks/` satisfies both by
 * construction; it is where the guards it serves already live (product-not-app, reads the tree).
 *
 * WHAT IS SHARED AND WHAT IS NOT. The WALK is shared three ways — all three guards collect the same
 * way, differing only in root. The ELEMENT TYPE is shared three ways too (3F-2274): one shape,
 * stated once. The FLOOR is shared TWO ways: only `noParallelStore` and
 * `enginePurity` walk the same population (`CORE_SRC_ROOT`), so only they can share a floor.
 * `domainPurity` walks a smaller subtree and keeps its own floor locally — a different population
 * is a different floor, and unifying them would be a behaviour change dressed as a tidy-up. The
 * asymmetry is deliberate; do not "finish the job" by moving the domain floor here.
 */

/**
 * WHY IT IS NEITHER, AND WHY THAT STILL KEEPS IT HERE (3F-3198). It asserts no property of the
 * repository, so it is not a check; it reads no evidence record, so it is not protocol either. It is
 * the check tree's own scaffolding, and the note above already states the two facts that decide its
 * home: it imports `node:fs`, which shuts `packages/core/src`, and it must stay OUT of the population
 * it defines, which is the one thing no destination inside a walked root can offer.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { CHECK_TREE_SEGMENTS } from "./checkTree.js";

/**
 * A file the walk collected — its repo-relative path and its raw source.
 *
 * THE element type — `checkNoParallelStore`, `checkEnginePurity` and `checkDomainPurity` all take
 * this one, so `{ path, source }` is stated exactly ONCE in the repo (3F-2274). Each guard used
 * to export its own structurally-identical alias, which meant the shape agreed by COINCIDENCE: add
 * a field to one and the other three carry on compiling while describing a different file. The
 * walk was unified first (3F-2266); this is the same argument applied to the walk's ELEMENT.
 *
 * A guard imports it with `import type`, never a value import: this module reads `node:fs`, and the
 * guards are pure by construction — that is the whole reason the collector sits in `tests/checks/`
 * rather than in the engine, since @SCN-EPG-001 reds an IO import under `packages/core/src`. The
 * type import erases at compile, so no `check…()` acquires a runtime edge to the collector.
 *
 * That erasure was OBSERVED, not assumed — each guard's emitted module was checked to carry zero
 * runtime imports, and the check was itself proven to fire on a planted runtime-used import. Worth
 * knowing if you touch this: esbuild elides a type-only-USED import in any syntax, so a bare
 * `import { CollectedFile }` also emits nothing TODAY. `import type` is still the form to write —
 * it states the intent, and it is the only one that stays safe if `verbatimModuleSyntax` is ever
 * enabled, where the bare form WOULD emit a real runtime import into a pure guard.
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
 * The anti-vacuity floor for the WHOLE-repository population `repositorySourceRoots` walks
 * (3F-2988) — the same reason as the core-src floor above, sized for a population roughly three
 * times larger, and with the same generous margin for exactly the same reason.
 */
export const MIN_REPOSITORY_SOURCE_FILES_SCANNED = 40;

/**
 * Every root this repository's own TypeScript source lives under — each package's `src`, and the
 * check tree at `tests/checks`.
 *
 * THE PACKAGE ROOTS ARE DERIVED FROM THE PACKAGES DIRECTORY, NOT WRITTEN DOWN, and that is the
 * whole point of them. A scan asking "does this rule exist anywhere but its one home?" is worth
 * exactly as much as its population, and a hand-listed population is a list that goes stale the day
 * a package is added — the scan then stays green over the wrong files and says nothing, which is
 * the vacuous green the floors above exist to catch. Reading the directory means a package added
 * later is scanned because it is there, not because someone remembered.
 *
 * THE CHECK TREE IS NAMED, BECAUSE IT IS NO LONGER UNDER `packages/` (3F-3187). It moved out of the
 * product package — check code is test code, and no package `src` tree imports it — so the
 * directory walk above cannot reach it, and a derivation that pretended otherwise would drop
 * 90-odd files from every whole-tree scan while every one of them stayed green. One root, spelled
 * once, appended LAST so the collected order is the one the package walk already produced.
 *
 * "SPELLED ONCE" IS NOW LITERAL: the segments come from `checkTree.ts` (3F-3188), because a second
 * reader appeared. `enginePurity.ts` has to refuse an import of this same tree, and a home written
 * down in two places agrees only until one of them is edited.
 *
 * It is the source counterpart of `vitest.config.ts`'s two include globs, which name the same pair
 * of roots for the same tree.
 */
export function repositorySourceRoots(): string[] {
  const packagesDir = join(process.cwd(), "packages");
  const packageRoots = readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => join(packagesDir, entry.name, "src"));
  return [...packageRoots, join(process.cwd(), ...CHECK_TREE_SEGMENTS)].filter((root) =>
    existsSync(root),
  );
}

/**
 * Every PRODUCTION source file in this repository, root by root — the whole-tree population, for a
 * check whose claim is about the repository rather than about one package (3F-2988).
 *
 * Built on `collectSourceFiles`, never beside it: a second walk is the agreeing-by-coincidence this
 * module was created to remove, and a whole-tree scan that collected differently from the per-root
 * ones would be the worst place of all to have it.
 */
export function collectRepositorySource(): CollectedFile[] {
  return repositorySourceRoots().flatMap((root) => collectSourceFiles(root));
}

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
