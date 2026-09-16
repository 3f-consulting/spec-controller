/**
 * The ONE source-tree walk the static checks shared (3F-2266), the ONE element type they took
 * (3F-2274), and the ONE reading of which roots this repository's own source lives under, with the
 * anti-vacuity floor for that population (3F-2988).
 *
 * WRITTEN FOR THREE GUARD TESTS, AND ALL THREE HAVE NOW LEFT. `noParallelStore`, `enginePurity`
 * (@SCN-EPG-001) and `domainPurity` (@SCN-DPG-001) each carried a byte-identical copy of this walk,
 * differing only in the recursive-call name, the element type, and the root. The same rule written
 * three times agrees by COINCIDENCE, not by construction: change one walk, or bump one floor and not
 * the others, and they drift apart silently with nothing to red it. That is the agreeing-by-copy the
 * domain-model work spent five slices removing from the domain; this removed it from the guards'
 * scaffolding.
 *
 * `noParallelStore` LEFT AT 3F-3324 — it matched three retired spellings and said in its own
 * comment that a parallel store under a fresh name passed it. `enginePurity` LEFT AT 3F-3437 and
 * `domainPurity` AT 3F-3438, their rules re-stated as configuration two installed tools read
 * (`pnpm lint:boundaries`). The unification above is why each departure cost the ones left behind
 * nothing: they had no copy of the walk to lose.
 *
 * SO THIS MODULE HAS EXACTLY ONE READER NOW — `termSpelling.test.ts` — AND SAYS SO RATHER THAN GOING
 * ON DESCRIBING A SHARED WALK. Everything below is what that one reader takes: `resolveRepositoryRoot`,
 * `collectRepositorySource` and the two halves it is built from (`repositorySourceRoots`,
 * `collectSourceFiles`), the `CollectedFile` element, and the repository floor with its headroom.
 * Nothing here is kept back for a caller who might arrive; a second reader would restore the
 * sharing, and until one does this is a correctly-factored module with one client.
 *
 * WHY IT LIVES HERE AND NOT IN THE ENGINE. It imports `node:fs`, and `lint:boundaries`'s
 * `core-imports-io` rule reds any file under `packages/core/src` that imports a node IO builtin
 * (@SCN-EPG-001's `io-import` arm until 3F-3437) — siting it in the engine would make the boundary
 * gate fail on its own scaffolding. It must also stay OUT of the walked population, or it would
 * shift the very counts it is used to assert. `tests/checks/` satisfies both by construction; it is
 * where the guards it served already lived (product-not-app, reads the tree).
 *
 * WHAT LEFT WITH THE LAST GUARD, RECOUNTED AT 3F-3438. `coreSrcRoot`, `domainRoot` and
 * `MIN_CORE_SRC_FILES_SCANNED` are gone. The core-src population lost its walker at 3F-3437 and the
 * domain subtree lost its walker here, so what remained was a root nothing joined and a floor
 * nothing asserted — dead weight that reads to the next person as a live constraint. The repository
 * floor below is the only floor left, and `termSpelling.test.ts` is what asserts it.
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
 * THE element type — `checkEnginePurity` took this one until 3F-3437 and `checkDomainPurity` until
 * 3F-3438, and `termSpelling.test.ts` reads the collected files through it, so `{ path, source }`
 * is stated exactly ONCE in the repo (3F-2274). Each guard used to export its own
 * structurally-identical alias, which meant the shape agreed by COINCIDENCE: add a field to one and
 * the others carry on compiling while describing a different file. The walk was unified first
 * (3F-2266); this is the same argument applied to the walk's ELEMENT.
 *
 * A READER IMPORTS IT WITH `import type`, NEVER A VALUE IMPORT, and that instruction outlives the
 * guards it was written for: this module reads `node:fs`, so a value import would hand its caller a
 * runtime edge to an IO module. It is the whole reason the collector sits in `tests/checks/` rather
 * than in the engine, since `core-imports-io` reds an IO import under `packages/core/src`. The type
 * import erases at compile, so no caller acquires that edge.
 *
 * That erasure was OBSERVED, not assumed — each guard's emitted module was checked to carry zero
 * runtime imports, and the check was itself proven to fire on a planted runtime-used import. Those
 * guards have all gone (3F-3324, 3F-3437, 3F-3438) and `termSpelling.test.ts` imports it the same
 * way. Worth knowing if you touch this: esbuild elides a type-only-USED import in any syntax, so a
 * bare `import { CollectedFile }` also emits nothing TODAY. `import type` is still the form to write
 * — it states the intent, and it is the only one that stays safe if `verbatimModuleSyntax` is ever
 * enabled, where the bare form WOULD emit a real runtime import into a pure reader.
 */
export interface CollectedFile {
  path: string;
  source: string;
}

/**
 * The ONE named place ambience is resolved: which repository a check is about, when nobody stated
 * it (3F-3207).
 *
 * Three rungs, in this order:
 *
 *   NAMED — the caller stated the subject. An argument is more specific than the environment the
 *   process happens to be standing in.
 *
 *   `SPEC_CONTROLLER_SOURCE_ROOT` — the environment's answer where no caller named one. This is
 *   the rung a mutation runner needs: Stryker copies the tree into an instrumented sandbox and
 *   runs the suite from inside it, so the working directory is the copy, and the launching shell's
 *   variable is what reaches the worker to name the real repository. It is set in exactly one
 *   place — `package.json`'s `mutation` script — because that is the whole of its blast radius.
 *
 *   The working directory — the ordinary case, and every ordinary run takes it.
 *
 * THE LAST TWO RUNGS ARRIVE AS PARAMETERS WITH AMBIENT DEFAULTS, AND THAT SYMMETRY IS THE POINT
 * (3F-3207). `env` was always injectable; the working directory became so for the same reason and
 * on the same precedent. A rung has to be observed MOVING to be observed at all, and the only other
 * way to move this one is `process.chdir` — which throws outright in a worker thread, so a suite
 * that reached for it could not run under the very mutation runner this slice exists to unblock.
 * Measured: all three arms of `sourcePopulation.test.ts` died with `process.chdir() is not
 * supported in workers` before this parameter existed. The default is the real ambient read, and
 * every production caller takes it.
 *
 * MODELLED ON `resolveEvidenceRoot` IN `measurementArtefact.ts`, BY CITATION. 3F-3099 settled this
 * exact ladder for the evidence path, from a measurement rather than a preference, and a second
 * structurally-identical resolver reasoned out independently here would agree with that one by
 * COINCIDENCE. Its argument transfers unchanged: an argument the caller passed is more specific
 * than the environment, and no caller needs the other order.
 *
 * AN EMPTY VARIABLE IS AN ABSENT ONE, AT EVERY RUNG — which is why `??` will not do. A variable
 * whose expression resolved to nothing arrives as `""`, and nullish-coalescing hands it straight
 * on. Taken literally it is not an obvious failure but a quiet one: `join("", "packages", "core",
 * "src")` is a RELATIVE path, which readdir resolves back against the working directory. A check
 * handed nothing would scan the tree it was standing in and report about it confidently — the
 * defect this slice closes, arriving through the door built to fix it.
 *
 * THIS IS THE ONLY FUNCTION IN THIS MODULE PERMITTED TO CONSULT AMBIENT STATE, AND IT SAYS SO IN
 * ITS NAME. Nothing below defaults its root; a defaulted root would leave the enumerator ambient
 * for every caller who wrote nothing, which is the condition being removed.
 *
 * IT CANNOT SWITCH A CHECK OFF, WHICH IS WHAT MAKES AN AMBIENT RUNG TOLERABLE HERE. The variable
 * names a subject; it does not gate a scan. With it absent under a mutation runner the guard does
 * not go quiet — it reds loudly, which is exactly how this fault was found.
 */
export function resolveRepositoryRoot(
  named?: string,
  env: NodeJS.ProcessEnv = process.env,
  workingDirectory: string = process.cwd(),
): string {
  const stated = (value: string | undefined): string | undefined =>
    value !== undefined && value !== "" ? value : undefined;

  const namedRoot = stated(named);
  if (namedRoot !== undefined) return namedRoot;
  const fromEnvironment = stated(env["SPEC_CONTROLLER_SOURCE_ROOT"]);
  if (fromEnvironment !== undefined) return fromEnvironment;
  return workingDirectory;
}

/**
 * The headroom a floor must keep below the real tree, in files (3F-2201) — asserted about
 * `MIN_REPOSITORY_SOURCE_FILES_SCANNED`, which since 3F-3438 is the only floor here to assert it
 * about.
 */
export const REQUIRED_FLOOR_HEADROOM = 10;

/**
 * The anti-vacuity floor for the WHOLE-repository population `repositorySourceRoots` walks
 * (3F-2988): how many production files the walk must find before a clean verdict counts as a scan
 * at all, because a check that scanned nothing is not a check. It sits well BELOW the real count,
 * not just under it — a broken walk yields ~0, so catching that needs no tight margin, while a
 * tight one reds on ordinary deletion and blames the rule for it (3F-2201).
 *
 * IT WAS THE SECOND OF TWO AND IS NOW THE ONLY ONE. The core-src floor stood above it until 3F-3438
 * and carried that argument in full; this sentence keeps the argument rather than pointing at a
 * paragraph that has gone. This floor is sized for a population roughly three times larger.
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
 * "SPELLED ONCE" WAS LITERAL WHILE THERE WERE TWO READERS: the segments come from `checkTree.ts`
 * (3F-3188), because `enginePurity.ts` had to refuse an import of this same tree and a home written
 * down in two places agrees only until one of them is edited. That guard went at 3F-3437 and the
 * refusal is now `.dependency-cruiser.mjs`'s `core-imports-checks`, which spells the path itself
 * because configuration cannot import a constant. This walk is the one reader left.
 *
 * It is the source counterpart of `vitest.config.ts`'s two include globs, which name the same pair
 * of roots for the same tree.
 */
export function repositorySourceRoots(root: string): string[] {
  const packagesDir = join(root, "packages");
  const packageRoots = readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => join(packagesDir, entry.name, "src"));
  return [...packageRoots, join(root, ...CHECK_TREE_SEGMENTS)].filter((candidate) =>
    existsSync(candidate),
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
export function collectRepositorySource(root: string): CollectedFile[] {
  return repositorySourceRoots(root).flatMap((dir) => collectSourceFiles(dir, root));
}

/**
 * Walk a source tree, collecting every PRODUCTION file (`.ts`, excluding `*.test.ts` and `*.d.ts`)
 * beneath it, in directory-sorted order, with paths relative to the repository it belongs to.
 *
 * Parameterised by `dir` — that is the whole of the difference the three copies used to encode.
 *
 * A DECLARATION IS NOT PRODUCTION SOURCE, AND UNTIL 3F-3217 IT WAS COUNTED AS ONE (3F-3205).
 * A failed build left a stray `checkTree.d.ts` under `tests/checks/` and the population read 111
 * where the tree held 110 — so a build artefact entered the denominator of every scope-dependent
 * check, and a check that examined it found nothing wrong and reported clean a file it had no
 * business reading. Inflation is the quieter of the two ways this walk can be wrong: an
 * anti-vacuity floor is EASIER to clear, so nothing reds.
 *
 * `.d.ts` IS THE WHOLE OF THE KNOWN SURFACE, AND THAT IS MEASURED RATHER THAN GUESSED AT. `.d.mts`
 * never entered the population, because `"x.d.mts".endsWith(".ts")` is false — four tracked
 * `.d.mts` declaration files sit under `tests/checks/` today and none of them is in the count.
 * Widening this past `.d.ts` would be filtering for a case nothing has demonstrated.
 *
 * `root` IS A SECOND JOB, NOT A SECOND SPELLING OF THE FIRST (3F-3207). `dir` is the subtree to
 * walk; `root` is what the collected paths are reported RELATIVE TO, and the two come apart the
 * moment a caller names a subtree — `dir` is `<root>/packages/core/src` while `root` is the
 * repository. It was read from the working directory here, which made the relativisation silently
 * correct only while the process happened to be standing in the repository being walked. Walk a
 * named tree from anywhere else and every path comes out mangled — and paths are what every
 * violation is REPORTED by, so the guards would red on the report rather than on the property.
 * Without this argument the whole change is cosmetic.
 */
export function collectSourceFiles(dir: string, root: string): CollectedFile[] {
  const out: CollectedFile[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectSourceFiles(abs, root));
    } else if (
      entry.name.endsWith(".ts") &&
      !entry.name.endsWith(".test.ts") &&
      !entry.name.endsWith(".d.ts")
    ) {
      out.push({ path: abs.slice(root.length + 1), source: readFileSync(abs, "utf8") });
    }
  }
  return out;
}
