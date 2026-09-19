/**
 * The complexity and function-length thresholds — the ONE place the numbers live (@SCN-FIT-001,
 * 3F-2286). It held a module-size number too until 3F-2320 retired the file ceiling.
 *
 * Consumed by `eslint.config.mjs` (the static check), which does not restate them: a second copy would
 * agree by COINCIDENCE and drift the moment either side is retuned, which is the agreeing-by-copy this
 * codebase has spent several slices removing from the domain and the static checks.
 *
 * WHY THIS IS `.mjs` AND NOT `.ts`. eslint loads its flat config through Node's own ESM loader, so a
 * TypeScript config would need `jiti` as a third new devDependency to buy nothing — these are four
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
 * tree may ever enter this file. It used to have a counterpart carrying the opposite guarantee — a
 * dated list of per-file allowances, every number in it measured from this tree — and the two were
 * separate modules precisely so a reader never had to work out which kind a number was. That list is
 * gone (3F-3466) and no measured number survives anywhere in the check, so this file's guarantee is
 * now the check's guarantee outright.
 *
 * `ratchet` is DELETED with the rule it served. It recorded each rule's measured p90 as the
 * destination a measured seed was heading toward; with no seed there is nothing to descend from. The
 * debt that gap used to imply is reported file by file by the check itself, on every run, which is
 * a stronger form of the same intent — a backlog you can work through rather than an aspiration in a
 * comment.
 *
 * ═══ TWO SCOPES, ONE STANDARD ═══
 *
 * Production and test code are held to the SAME `cognitiveComplexity`, because an external
 * standard does not bend to the population it is applied to. That is also, conveniently, the strongest
 * available evidence of provenance: the two populations differed by 3.5x at the function level when
 * this was written, so two MEASURED thresholds could not possibly coincide. Their coinciding is the
 * proof neither was measured here. (3F-2177's config asserted the opposite — that the scopes must
 * differ in both directions — which was true only while both were measurements.)
 *
 * WHEN THIS REDS ON LEGITIMATE GROWTH. That is the fitness function working, not crying wolf — the red
 * names the rule, the file and the measured value, so its stated cause IS its actual cause (contrast
 * 3F-2201, where a floor blamed a parallel store for an ordinary deletion). The response is to
 * refactor. Never slack added in advance.
 *
 * AND THERE IS NO LONGER A SECOND OPTION, WHICH IS WHY THIS PARAGRAPH CHANGED (3F-3408). It used to
 * read "refactor, OR record a dated exception carrying its measured value" — and nothing can record
 * one any more: the dated exception list and its ratchet went with 3F-2317's and 3F-3408's Deletes.
 * Nothing needs to, either. A red here is now only ever about a file the change TOUCHED, held at the
 * standard; a violation in a file nobody touched is reported at `warn` and exits 0. So the escape
 * hatch is gone and the thing it existed to excuse cannot red you in the first place.
 */

/**
 * Production code — `packages/<pkg>/src` and `tests/checks`, excluding test files.
 *
 * WHERE EACH NUMBER CAME FROM. The citation is part of the contract, not decoration: a cited number
 * and an uncited one are indistinguishable once shipped, and the whole point of 3F-2286 is that these
 * numbers have provenance.
 *
 *   - `cognitiveComplexity` 15 — SonarSource's published COGNITIVE COMPLEXITY metric and the default
 *     of `sonarjs/cognitive-complexity`, the rule that implements it. It replaced a cyclomatic
 *     `complexity` of 10 (NIST SP 500-235 / McCabe) at 3F-2320, on the portfolio ruling of
 *     2026-09-18: cognitive complexity scores what makes code hard to READ — nesting and broken
 *     flow — where cyclomatic scores a flat `switch` like nested conditionals. The looser NUMBER is
 *     not a relaxation, because it is a number on a different scale: measured on this tree at the
 *     swap, six cyclomatic findings became eight cognitive ones, and only one function was over the
 *     old line and under the new.
 *   - `maxLinesPerFunction` 40 — Google engineering practices — a function past roughly 40 lines
 *     should be considered for breaking up. Robert Martin's Clean Code is stricter again at ~20; 40 is
 *     the more widely published of the two and the less contested.
 *   - `maxLines` 400 — GONE, and its going is the rule above enforced against itself (3F-2320). It was
 *     the one number here that named itself A CHOSEN ceiling with no external source, because no
 *     industry body publishes a hard file-length cap — which makes it exactly the self-chosen
 *     threshold this file forbids. The portfolio retired the file ceiling outright on 2026-09-18;
 *     what a long file costs is taken per FUNCTION by the two rules that remain.
 *
 * @type {import("./complexityThresholds.d.mts").ComplexityThreshold}
 */
export const PRODUCTION_THRESHOLD = {
  cognitiveComplexity: 15,
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
 * NOT A CARVE-OUT. Test scope stays held to `cognitiveComplexity` 15 — the metric that genuinely
 * applies, at exactly the production number. Accepted residual, operator-ruled: a straight-line test
 * helper under cognitive 15 escapes. (It used to add "inside a sub-400-line file"; with the file
 * ceiling retired at 3F-2320 the residual is simply wider, which is stated rather than quietly
 * dropped.) Low-risk; revisit
 * only if one actually appears.
 *
 * @type {import("./complexityThresholds.d.mts").ComplexityThreshold}
 */
export const TEST_THRESHOLD = {
  cognitiveComplexity: 15,
  maxLinesPerFunction: "off",
};

/**
 * One eslint rule HELD at one ceiling at one severity, in the shape THAT rule takes (3F-2317; the
 * severity added under @SCN-FIT-001, 3F-3462).
 *
 * WHY THIS LIVES IN THE MODULE WHOSE NUMBERS ALL COME FROM OUTSIDE. It takes a ceiling and holds
 * none: the SHAPE is a property of eslint's rules, which are as external as the standard itself, so
 * this file's guarantee is untouched. THE SEVERITY IS AS EXTERNAL AS THE SHAPE — `"error"` and
 * `"warn"` are eslint's own vocabulary and neither is measured from this tree — so taking it as a
 * parameter does not bend the contract either. That is what lets ONE emitter serve all callers: the
 * scope blocks at `warn` (the report) and the same blocks restated at `error` over what the change
 * touched (the gate). Two emitters would be the agreeing-by-copy this codebase keeps removing: they
 * would agree on the shapes today and drift the first time eslint changed one.
 *
 * THE SHAPE IS NOT UNIFORM, AND GETTING IT WRONG IS SILENT. `sonarjs/cognitive-complexity` takes a
 * bare number (`["error", 15]`); `max-lines-per-function` takes an options object
 * (`["error", { max, … }]`). Hand eslint the wrong one and it does not complain — it mis-reads the
 * option and applies no ceiling at all, which looks exactly like a file that is under its ceiling.
 * AND NOTHING NOTICES IT ANY MORE (3F-3478). The cucumber arm that linted planted sources through the
 * real config and read the severity off the message was withdrawn with its scenario, and nothing
 * replaced it: there is no `.test.ts` beside this module either — 3F-3245 deleted it, on the rule
 * that a check's subject is its command. A reader reaching for either to cover a new emitter will
 * find neither — so a wrong shape here is now silent end to end.
 *
 * `skipBlankLines: true, skipComments: true` RIDES ON EVERY EMITTED LINE RULE (3F-2395). The
 * threshold holds the CODE a reader must hold in their head, not the file's bytes. Counting
 * documentation put the cheapest route under a ceiling on DELETING the comment that explains why the
 * code is the shape it is — a fitness function pushing against what it exists to protect, and one
 * this tree has already paid: two of the largest reductions ever banked here were partly comment
 * compactions counted as line count. `fitness-functions.md`, the portfolio standard promoted from
 * an adopter's repository 2026-08-04, rules the counting mode; it is stated here rather than left to eslint's defaults
 * because the mode is part of what 40 and 400 MEAN, and changing it re-measures the whole population
 * at once and in silence.
 *
 * A `"off"` ceiling passes straight through to eslint's own severity vocabulary, so the test scope's
 * `max-lines-per-function` ABSTENTION survives unchanged — and it OUTRANKS the severity, because a
 * rule that does not apply to a scope does not apply at either severity. Inventing a number for it
 * here would reinstate the self-certification 3F-2286 exists to remove.
 *
 * THE SEVERITY IS REQUIRED, WITH NO DEFAULT. A default would be one of the two callers' answers
 * silently applied to the other, and getting it wrong is exactly as quiet as getting the option shape
 * wrong: a gate emitted at `warn` reports every violation in full and exits 0.
 *
 * @type {typeof import("./complexityThresholds.d.mts").ruleAtCeiling}
 */
export const ruleAtCeiling = (rule, ceiling, severity) => {
  if (ceiling === "off") return "off";
  return rule === "sonarjs/cognitive-complexity"
    ? [severity, ceiling]
    : [severity, { max: ceiling, skipBlankLines: true, skipComments: true }];
};
