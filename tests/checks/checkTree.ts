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
 * a module DOES and never what its home COSTS. One candidate home is shut by a rule this repository
 * runs on every pull request. The other is not, and stopped being so at 3F-3447.
 *
 *   - `packages/core/src` is shut by `lint:boundaries`'s `core-imports-io` rule — @SCN-EPG-001's
 *     `io-import` arm until 3F-3437, the same refusal read from config. The fitness protocol imports
 *     `node:fs` and `node:child_process`; the engine may import neither.
 *   - `packages/spec-controller/src` WAS shut by a scenario that left at 3F-3447, which read what
 *     the published modules import. That package PUBLISHES, so every module under its `src` travels
 *     in the tarball — and `measurementArtefact.ts` imports
 *     `@3f-consulting/spec-controller-core/internal`, which 3F-2837 un-published. The move was MADE
 *     at 3F-3198 rather than reasoned about, over three modules of which this is the one still
 *     standing: each reported as a module an installed consumer meets as
 *     ERR_PACKAGE_PATH_NOT_EXPORTED on first load, and the move was reverted.
 *
 * WHAT DOES NOT CARRY THE SECOND REFUSAL ON, MEASURED AT 3F-3447 RATHER THAN INHERITED. 3F-3447's
 * own text expected `tsconfig.build.json`'s `rootDir` to hold the second home shut once the scenario
 * left. It does not, and a plant says so rather than a reading: a module planted at
 * `packages/spec-controller/src/plantRootDir.ts` importing `bareTerm` from
 * `@3f-consulting/spec-controller-core/internal` BUILT CLEAN — `pnpm build` exit 0, with
 * `dist/plantRootDir.js` emitted carrying the bare specifier verbatim — because tsc resolves a
 * workspace sibling through `node_modules` and never asks whether the file behind it sits under this
 * package's `rootDir`. `rootDir` refuses a DIFFERENT import, and that one is real: the same planted
 * module importing `tests/checks/checkTree.js` reds `pnpm build` with TS6059, exit 2. Two imports,
 * one refusal, and the AND THE FIRST HOME'S RULE paragraph below is about the second of them.
 *
 * SO THE SECOND HOME IS REFUSED BY NOTHING ON A PULL REQUEST, AND THAT IS SAID HERE RATHER THAN LEFT
 * TO BE FOUND. What still catches the fault is the clean-room smoke in `release.yml`, which installs
 * the packed tarballs into an empty directory and starts the binary — a module reaching an
 * un-published subpath throws ERR_PACKAGE_PATH_NOT_EXPORTED there, whatever a workspace build makes
 * of it. That runs at tag time, not per pull request. The shift from per-pull-request to per-tag is
 * 3F-3440's accepted consequence, recorded on that ticket, and the placement question below is the
 * one that has to be asked by a person now.
 *
 * SO THE BOUNDARY IS THE SECOND DISCRIMINATOR, AND IT IS THE STRONGER OF THE TWO. A module that can
 * only be written against core's UNPUBLISHED surface is not a module the product ships. `./internal`
 * is this tree's window into core — nothing under `packages/spec-controller/src` reaches it today —
 * so reaching it is what keeps a module here, whatever the first discriminator says it does.
 *
 * THIS IS A RE-MEASURED RULING, NOT A NEW ONE. `measurementArtefact.ts` was promoted into the product
 * package once already (3F-2763) and folded back out at 3F-2861 as "a product module with no product
 * consumer, carried into `dist` on every build". Between 3F-3198 and 3F-3447 that sentence was said
 * by a check rather than by a person, and it is a person's again.
 *
 * AND THE FIRST HOME'S RULE DOES NOT REACH THE SECOND. `core-imports-checks` is scoped `from`
 * `packages/core/src` and nothing else, so a check-tree import planted in a
 * `packages/spec-controller/src` module passes it. Re-measured over the replacement at 3F-3437
 * (that plant, `pnpm lint:boundaries`, rc=0), as it was over @SCN-EPG-001 at 3F-3198 (eight arms
 * green over the plant) — a scope claim is worth re-running when the mechanism holding it changes.
 * What refuses that import is `tsconfig.build.json`'s `rootDir`, which reds `pnpm build` with
 * TS6059. Two different mechanisms, one for each package; neither covers the other's tree.
 *
 * WHAT WOULD MAKE THE SECOND HOME SOUND rather than merely un-refused: publishing the four symbols
 * those three modules need on core's public `.` barrel. That widens a published surface, which is a
 * slice of its own and never a side effect of a relocation. Since 3F-3447 a relocation that skips it
 * reds nothing until a release is tagged, and since 3F-3449 the widening itself reds nothing either
 * — the arm that reconciled that barrel against a written-down surface is gone. So BOTH halves of
 * this paragraph are now things to check rather than things to be told.
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
