/**
 * WHERE CHECK CODE LIVES, SPELLED ONCE FOR THE WALK (3F-3188; narrowed to one reader at 3F-3437).
 *
 * `sourceFiles.ts` joins these segments onto the repository root to WALK this tree, and since
 * 3F-3437 it is the only reader. There were two: `enginePurity.ts` matched the same home inside an
 * import specifier to REFUSE it, and this module exists because a home written down twice agrees
 * until one of them is edited — the edit that moved this tree out of `packages/spec-controller/`
 * (3F-3187) being precisely the edit that would have done it. Before that move neither reader had
 * the question: every check module lived under the app package, so the purity rule's one match over
 * the PACKAGE name covered them without naming them.
 *
 * THE REFUSAL DID NOT LEAVE, IT LEFT THIS REPOSITORY'S OWN CODE (3F-3288). `core-imports-checks` in
 * `.dependency-cruiser.mjs` refuses the same tree now, and it spells the path itself: it is
 * configuration a third-party tool reads, and it cannot import a TypeScript constant. So a second
 * spelling still exists and can no longer be shared. What changed is how a disagreement would
 * surface — a moved tree now empties this walk's population and reds the floors in `sourceFiles.ts`,
 * rather than leaving a refusal quietly matching a path no file has.
 *
 * WHY IT IS STILL ITS OWN MODULE rather than a constant in `sourceFiles.ts`, which is otherwise the
 * ONE reading of which roots this repository's source lives under: a value here can be read by
 * anything without acquiring `sourceFiles.ts`'s `node:fs` import along with it. That was load-bearing
 * while a guard pure by construction was the second reader; with one reader it is a smaller
 * argument, and merging the two is a change for whoever next has cause to open both.
 */

/**
 * WHAT KEEPS A MODULE IN THIS TREE, MEASURED RATHER THAN ARGUED (3F-3198).
 *
 * 3F-3190 asked which modules here are PROTOCOL — code that reads, classifies, parses or writes an
 * evidence record — rather than checks, and ruled the protocol half into
 * `packages/spec-controller/src`. That discriminator is sound and it is not sufficient: it asks what
 * a module DOES and never what its home COSTS. Both candidate homes are shut, and each is shut by a
 * rule this repository already runs.
 *
 *   - `packages/core/src` is shut by `lint:boundaries`'s `core-imports-io` rule — @SCN-EPG-001's
 *     `io-import` arm until 3F-3437, the same refusal read from config. The fitness protocol imports
 *     `node:fs` and `node:child_process`; the engine may import neither.
 *   - `packages/spec-controller/src` is shut by @SCN-API-007. That package PUBLISHES, so every module
 *     under its `src` travels in the tarball — and `measurementArtefact.ts` imports
 *     `@3f-consulting/spec-controller-core/internal`, which 3F-2837 un-published. The move was MADE
 *     at 3F-3198 rather than reasoned about, over three modules of which this is the one still
 *     standing: each reported as a module an installed consumer meets as
 *     ERR_PACKAGE_PATH_NOT_EXPORTED on first load, and the move was reverted.
 *
 * SO THE BOUNDARY IS THE SECOND DISCRIMINATOR, AND IT IS THE STRONGER OF THE TWO. A module that can
 * only be written against core's UNPUBLISHED surface is not a module the product ships. `./internal`
 * is this tree's window into core — nothing under `packages/spec-controller/src` reaches it today —
 * so reaching it is what keeps a module here, whatever the first discriminator says it does.
 *
 * THIS IS A RE-MEASURED RULING, NOT A NEW ONE. `measurementArtefact.ts` was promoted into the product
 * package once already (3F-2763) and folded back out at 3F-2861 as "a product module with no product
 * consumer, carried into `dist` on every build". The red above is that same sentence, said by a check
 * instead of by a person.
 *
 * AND THE FIRST HOME'S RULE DOES NOT REACH THE SECOND. `core-imports-checks` is scoped `from`
 * `packages/core/src` and nothing else, so a check-tree import planted in a
 * `packages/spec-controller/src` module passes it. Re-measured over the replacement at 3F-3437
 * (that plant, `pnpm lint:boundaries`, rc=0), as it was over @SCN-EPG-001 at 3F-3198 (eight arms
 * green over the plant) — a scope claim is worth re-running when the mechanism holding it changes.
 * What refuses that import is `tsconfig.build.json`'s `rootDir`, which reds `pnpm build` with
 * TS6059. Two different mechanisms, one for each package; neither covers the other's tree.
 *
 * WHAT WOULD RE-OPEN THE SECOND HOME: publishing the four symbols those three modules need on core's
 * frozen v1 barrel (@SCN-API-001). That widens a published surface, which is a slice of its own and
 * never a side effect of a relocation.
 */

/**
 * The check tree's path segments, relative to the repository root.
 *
 * Segments rather than a joined path because the one reader joins them with the platform separator
 * through `node:path`, which takes them as arguments. A second reader took a POSIX-joined form to
 * match inside an import specifier, where the separator is always `/`; it and its constant both
 * left at 3F-3437.
 */
export const CHECK_TREE_SEGMENTS = ["tests", "checks"] as const;
