/**
 * WHERE CHECK CODE LIVES, SPELLED ONCE (3F-3188).
 *
 * Two readers need this repository's check tree by name and they need it in different shapes:
 * `sourceFiles.ts` joins it onto the repository root to WALK it, and `enginePurity.ts` matches it
 * inside an import specifier to REFUSE it. Written down twice they agree until one is edited — and
 * the edit that moved this tree out of `packages/spec-controller/` (3F-3187) is precisely the edit
 * that would have done it. Before that move both readers were free of the question: every check
 * module lived under the app package, so the purity rule's one match over the PACKAGE name covered
 * them without naming them.
 *
 * WHY IT IS ITS OWN MODULE RATHER THAN A CONSTANT IN `sourceFiles.ts`, which is otherwise the ONE
 * reading of which roots this repository's source lives under. `enginePurity.ts` must import this
 * as a VALUE, and `sourceFiles.ts` imports `node:fs`: a value import from there would hand a check
 * that is pure by construction a runtime edge to IO, which is the property `sourceFiles.ts`'s own
 * note records as deliberate and OBSERVED. A module with no imports at all can be read by both
 * without either of them acquiring anything.
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
 *   - `packages/core/src` is shut by @SCN-EPG-001's `io-import` arm. The fitness protocol imports
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
 * AND THE FIRST HOME'S RULE DOES NOT REACH THE SECOND. @SCN-EPG-001 walks `packages/core/src` and
 * nothing else, so a check-tree import planted in a `packages/spec-controller/src` module passes it
 * (measured 3F-3198, eight arms green over the plant). What refuses that import is
 * `tsconfig.build.json`'s `rootDir`, which reds `pnpm build` with TS6059. Two different mechanisms,
 * one for each package; neither covers the other's tree.
 *
 * WHAT WOULD RE-OPEN THE SECOND HOME: publishing the four symbols those three modules need on core's
 * frozen v1 barrel (@SCN-API-001). That widens a published surface, which is a slice of its own and
 * never a side effect of a relocation.
 */

/**
 * The check tree's path segments, relative to the repository root.
 *
 * Segments rather than a joined path because the two readers join differently — one with the
 * platform separator through `node:path`, one with the `/` an import specifier always uses. A
 * single pre-joined string would force one of them to split it back apart.
 */
export const CHECK_TREE_SEGMENTS = ["tests", "checks"] as const;

/**
 * The same home as one POSIX path fragment — how an import specifier spells it, on every platform.
 * A specifier is not a filesystem path: it uses `/` even where `node:path` would use `\`.
 */
export const CHECK_TREE_SPECIFIER_PATH = CHECK_TREE_SEGMENTS.join("/");
