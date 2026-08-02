/**
 * The complexity and module-size thresholds — the ONE place the numbers live (@SCN-CPX-001, 3F-2177).
 *
 * Consumed by `eslint.config.mjs` (the guard) and pinned by `complexityThreshold.test.ts` (the @unit
 * evidence). Neither re-declares them: a second copy would agree by COINCIDENCE and drift the moment
 * either side is retuned, which is the agreeing-by-copy this codebase has spent several slices
 * removing from the domain and the guards.
 *
 * WHY THIS IS `.mjs` AND NOT `.ts`. eslint loads its flat config through Node's own ESM loader, so a
 * TypeScript config would need `jiti` as a third new devDependency to buy nothing — these are six
 * numbers, not logic. Plain ESM is importable by eslint, by Vitest and by the Cucumber steps with no
 * loader at all. The types live beside it in `complexityThresholds.d.mts`, so TypeScript consumers are
 * still fully typed.
 *
 * SEEDED AT THE MEASURED MAXIMUM, NOT THE p90. The two are not interchangeable, and the difference is
 * arithmetic rather than taste: a p90 seed reds the top decile BY CONSTRUCTION — measured over this
 * tree, 33 functions on `complexity`, 4 files on `max-lines`, 35 functions on
 * `max-lines-per-function`. So a p90 seed cannot also "catch regression without reddening the
 * existing tree"; those were two incompatible instructions and the seed is what resolved them.
 * eslint reds on `value > max`, so seeding AT the measured max is the strictest seed that leaves the
 * tree green: zero headroom, so any growth past today's worst reds immediately.
 *
 * THE RATCHET IS A DESTINATION, NOT DECORATION. Each threshold carries its measured p90 as `ratchet` —
 * where the threshold is meant to end up, recorded in the code rather than in a memory. The @unit test
 * asserts every ratchet target sits strictly BELOW its seed, so a "ratchet" that quietly pointed
 * sideways or up could not ship.
 *
 * WHEN THIS REDS ON LEGITIMATE GROWTH. That is the gate working, not crying wolf — the red names the
 * rule, the file and the measured value, so its stated cause IS its actual cause (contrast 3F-2201,
 * where a floor blamed a parallel store for an ordinary deletion). The response is to optimise, or to
 * bump the threshold as a CONSCIOUS edit carrying its reason. Never slack added in advance.
 *
 * Measured 2026-07-29 over 48 production files / 353 functions and 39 test files / 1025 functions,
 * with `skipBlankLines: false, skipComments: false` — the counting mode is part of the contract, since
 * any other mode silently changes every number below.
 */

/**
 * Production code — `packages/<pkg>/src` and `packages/<pkg>/static-checks`, excluding test files.
 *
 * `max-lines` 1024 is `render/markdown.ts`; `max-lines-per-function` 261 is the argv handler in
 * `cli-balance/cli.ts`; `complexity` 25 is `vocabAudit.ts`'s largest classifier. Those three files are
 * the ratchet's first targets, and at exact-max none of them can grow without reding — deliberate.
 *
 * @type {import("./complexityThresholds.d.mts").ComplexityThreshold}
 */
export const PRODUCTION_THRESHOLD = {
  complexity: 25,
  maxLines: 1024,
  maxLinesPerFunction: 261,
  ratchet: { complexity: 8, maxLines: 540, maxLinesPerFunction: 35 },
};

/**
 * Test code — `**\/*.test.ts`.
 *
 * A SEPARATE threshold, because one shared set of numbers could not be honest about both populations:
 * test files run 2.4x LONGER at the file level (2419 vs 1024) yet are 3.5x SIMPLER at the function
 * level (7 vs 25). A shared threshold would have to take the max of each pair, making `max-lines`
 * vacuous for production while leaving `complexity` slack for tests. The asymmetry runs in both
 * directions, which is exactly why it cannot be collapsed.
 *
 * @type {import("./complexityThresholds.d.mts").ComplexityThreshold}
 */
export const TEST_THRESHOLD = {
  complexity: 7,
  maxLines: 2419,
  maxLinesPerFunction: 221,
  ratchet: { complexity: 2, maxLines: 821, maxLinesPerFunction: 41 },
};
