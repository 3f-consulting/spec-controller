/**
 * The complexity and module-size thresholds — the ONE place the numbers live (@SCN-CPX-001, 3F-2286).
 *
 * Consumed by `eslint.config.mjs` (the static check) and pinned by `complexityThreshold.test.ts` (the
 * @unit evidence). Neither re-declares them: a second copy would agree by COINCIDENCE and drift the
 * moment either side is retuned, which is the agreeing-by-copy this codebase has spent several slices
 * removing from the domain and the static checks.
 *
 * WHY THIS IS `.mjs` AND NOT `.ts`. eslint loads its flat config through Node's own ESM loader, so a
 * TypeScript config would need `jiti` as a third new devDependency to buy nothing — these are five
 * numbers, not logic. Plain ESM is importable by eslint, by Vitest and by the Cucumber steps with no
 * loader at all. The types live beside it in `complexityThresholds.d.mts`, so TypeScript consumers are
 * still fully typed.
 *
 * ═══ THE THRESHOLD COMES FROM OUTSIDE THE TREE (3F-2286, superseding 3F-2177) ═══
 *
 * 3F-2177 seeded each threshold at this tree's OWN measured maximum — complexity 25, function 261
 * lines, file 1024 — reasoning that at exact-max there is zero headroom, so today is green and any
 * growth reds. The arithmetic was right and the premise was wrong: it is "measure the current state,
 * call it good". All three of those maxima sit well inside the industry high-risk / refactor band, so
 * a threshold seeded there certifies whatever the code already does. A fitness function's line must be
 * stated independently of the code it judges, or it is not a fitness function — it is a mirror.
 *
 * So the numbers below are stated by bodies outside this repository, and NOTHING measured from this
 * tree may ever enter this file. The measured numbers live next door in `complexityExceptions.mjs`,
 * which carries the opposite guarantee — every number there IS a measurement of this tree. That is why
 * they are two modules and not one: a reader must never have to work out which kind a number is.
 *
 * `ratchet` is DELETED with the rule it served. It recorded each rule's measured p90 as the
 * destination a measured seed was heading toward; with no seed there is nothing to descend from. The
 * debt that gap used to imply is now enumerated file by file in the exception list, which is a
 * stronger form of the same intent — a backlog you can work through rather than an aspiration in a
 * comment.
 *
 * ═══ TWO SCOPES, ONE STANDARD ═══
 *
 * Production and test code are held to the SAME `complexity` and `max-lines`, because an external
 * standard does not bend to the population it is applied to. That is also, conveniently, the strongest
 * available evidence of provenance: the two populations differ by 2.4x at the file level and 3.5x at
 * the function level, so two MEASURED thresholds could not possibly coincide. Their coinciding is the
 * proof neither was measured here. (3F-2177's config asserted the opposite — that the scopes must
 * differ in both directions — which was true only while both were measurements.)
 *
 * WHEN THIS REDS ON LEGITIMATE GROWTH. That is the fitness function working, not crying wolf — the red
 * names the rule, the file and the measured value, so its stated cause IS its actual cause (contrast
 * 3F-2201, where a floor blamed a parallel store for an ordinary deletion). The response is to
 * refactor, or to record a dated exception carrying its measured value. Never slack added in advance.
 */

/**
 * Where each number came from. The citation is part of the contract, not a comment: a cited number and
 * an uncited one are indistinguishable once shipped, and the whole point of 3F-2286 is that these
 * three have provenance. The @unit pin asserts each entry is present and names its source.
 */
export const STANDARD_SOURCES = {
  complexity:
    "NIST Special Publication 500-235 / McCabe — a cyclomatic complexity above 10 is the stated " +
    "refactor line ('modules with complexity over 10 should be reduced'). SonarQube's default is a " +
    "looser 15; the stricter of the two published lines is taken.",
  maxLinesPerFunction:
    "Google engineering practices — a function past roughly 40 lines should be considered for " +
    "breaking up. Robert Martin's Clean Code is stricter again at ~20; 40 is the more widely " +
    "published of the two and the less contested.",
  maxLines:
    "A CHOSEN ceiling, and named as one. No industry body publishes a hard file-length cap, so this " +
    "is the one number here with no external source to cite — saying so plainly is the honest form. " +
    "400 sits inside the 300-500 band the style guides that do speak use, and is an order of " +
    "magnitude under this tree's worst file, which is what makes it a target rather than a mirror.",
};

/**
 * The numbers 3F-2177 measured off this tree, retired by 3F-2286.
 *
 * Kept — deliberately — so the @unit pin can assert NEGATIVE provenance: that no live threshold still
 * carries a number this tree produced. Enumerating them here rather than re-typing them in the test
 * means the assertion cannot pass by the test forgetting one, and a future edit that quietly
 * reinstated 1024 or 221 reds even if it updated the test's expectation to match.
 *
 * Production seeds 25 / 1024 / 261; test seeds 7 / 2419 / 221.
 *
 * @type {readonly number[]}
 */
export const RETIRED_TREE_DERIVED_SEEDS = [25, 1024, 261, 7, 2419, 221];

/**
 * Production code — `packages/<pkg>/src` and `packages/<pkg>/static-checks`, excluding test files.
 *
 * @type {import("./complexityThresholds.d.mts").ComplexityThreshold}
 */
export const PRODUCTION_THRESHOLD = {
  complexity: 10,
  maxLines: 400,
  maxLinesPerFunction: 40,
};

/**
 * Test code — `**\/*.test.ts`. The same standard, with ONE rule switched off.
 *
 * WHY `max-lines-per-function` IS OFF HERE, AND WHY NO NUMBER REPLACES IT (operator-ruled 2026-08-02).
 * The rule measures production-function TRACTABILITY — can a reader hold this function in their head.
 * A `describe` / `it` callback is not that: it is a CONTAINER, and a `describe` holding fifteen tests
 * is not a 200-line function in the sense McCabe or Google's guidance addresses. Applying the
 * production number there generated 110 exceptions recording nothing about code quality, and a list
 * two-thirds noise is a list nobody reads — which defeats the point of visible debt.
 *
 * The important half is what is NOT done: no substitute number is invented. 3F-2177's config conceded
 * the same category error and answered it with 221 — the test tree's own measured maximum — which is
 * precisely the self-certification 3F-2286 removes. There is no external standard for test-container
 * length, so the honest move is to abstain from the rule and say so, not to fake a third number.
 *
 * NOT A CARVE-OUT. Test scope stays held to `complexity` 10 and `max-lines` 400 — the two metrics that
 * genuinely apply, at exactly the production numbers. Accepted residual, operator-ruled: a
 * straight-line test helper under complexity 10 inside a sub-400-line file escapes. Low-risk; revisit
 * only if one actually appears.
 *
 * @type {import("./complexityThresholds.d.mts").ComplexityThreshold}
 */
export const TEST_THRESHOLD = {
  complexity: 10,
  maxLines: 400,
  maxLinesPerFunction: "off",
};

/**
 * One eslint rule declared at one ceiling, in the shape THAT rule takes (@SCN-CPX-002, 3F-2317).
 *
 * WHY THIS LIVES IN THE MODULE WHOSE NUMBERS ALL COME FROM OUTSIDE. It takes a ceiling and holds
 * none: the SHAPE is a property of eslint's rules, which are as external as the standard itself, so
 * this file's guarantee is untouched. That is what lets ONE emitter serve both callers — the scope
 * blocks, whose ceilings are stated from outside, and the exception blocks, whose ceilings are
 * measured from this tree. Two emitters would be the agreeing-by-copy this codebase keeps removing:
 * they would agree on the shapes today and drift the first time eslint changed one.
 *
 * THE SHAPE IS NOT UNIFORM, AND GETTING IT WRONG IS SILENT. `complexity` takes a bare number
 * (`["error", 10]`); `max-lines` and `max-lines-per-function` take an options object
 * (`["error", { max, … }]`). Hand eslint the wrong one and it does not complain — it mis-reads the
 * option and applies no ceiling at all, which looks exactly like a file that is under its ceiling.
 * The @unit pin exists for that failure mode specifically, because nothing else would notice it.
 *
 * `skipBlankLines: false, skipComments: false` RIDES ON EVERY EMITTED LINE RULE. Every value in
 * `complexityExceptions.mjs` was measured in that mode; any other mode changes every number in the
 * debt list at once and in silence — a file that fits under 400 counted-without-comments does not
 * fit under 400 counted-with.
 *
 * A `"off"` ceiling passes straight through to eslint's own severity vocabulary, so the test scope's
 * `max-lines-per-function` ABSTENTION survives unchanged. Inventing a number for it here would
 * reinstate the self-certification 3F-2286 exists to remove.
 *
 * @type {typeof import("./complexityThresholds.d.mts").ruleAtCeiling}
 */
export const ruleAtCeiling = (rule, ceiling) => {
  if (ceiling === "off") return "off";
  return rule === "complexity"
    ? ["error", ceiling]
    : ["error", { max: ceiling, skipBlankLines: false, skipComments: false }];
};
