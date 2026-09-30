/**
 * The per-function complexity and length standard: `sonarjs/cognitive-complexity` and
 * `max-lines-per-function`, and nothing else. No `recommended` preset and no style rules — a preset
 * would bring in a large ruleset nobody endorsed (`zero-shape`), which is why `eslint-plugin-sonarjs`
 * is registered as a namespace with one rule enabled.
 *
 * THIS CONFIG IS THE REPORT, NOT THE GATE. Every rule here is at `warn`, so a bare `eslint` prints
 * every violation in the measured population and exits 0. What reds is decided by the CI step
 * carrying this check's `id:`: it runs `eslint` once more over the files the push touched, with
 * `--max-warnings 0`. Keeping changedness out of this file is what lets that step be copied as two
 * stock command lines; a git read here would be code of ours inside a gate. The cost is that a bare
 * `eslint` run locally reports and does not gate — to gate locally, run the step's second line.
 *
 * NO PATHSPEC ON THAT SECOND LINE, AND `--no-warn-ignored` INSTEAD. The step hands eslint every
 * touched path. `files` below stays the one answer to which files are ours: a touched path outside
 * it is "ignored", and without `--no-warn-ignored` that notice is itself a warning, so a touched
 * README would red the gate.
 *
 * The line rule counts code, not documentation: `skipComments` and `skipBlankLines` ride on every
 * emitted line rule, from one place (`ruleAtCeiling`), because a second statement of the counting
 * mode would re-measure the whole population in a different unit. Counting comments makes deleting
 * the comment that explains a function the cheapest route under the ceiling.
 *
 * NO NUMBER MEASURED FROM THIS TREE APPEARS IN THIS CONFIG. Every file in the population is held at
 * 15 / 40; nothing excuses a violation, and what decides whether one reds is changedness alone.
 *
 * HOW THE TEST SCOPE IS CARVED OUT. Flat config applies blocks in order and later blocks win, so the
 * `**\/*.test.ts` block restates the same two rules at the test threshold and overrides the
 * production block for test files. There is no `ignores` entry for tests, and adding one would
 * silently un-hold them.
 */

import tseslint from "typescript-eslint";
import sonarjs from "eslint-plugin-sonarjs";

/**
 * ═══ THE THRESHOLDS — THE ONE PLACE THE NUMBERS LIVE ═══
 *
 * eslint's numbers belong in eslint's own config, where an adopter copying this file gets the
 * numbers and their provenance in one artefact. Nothing restates them: a second copy would agree by
 * coincidence and drift the moment either side is retuned.
 *
 * NONE OF THEM IS EXPORTED. A reader that needs a threshold asks eslint for the resolved config
 * (`ESLint#calculateConfigForFile`) — the tool's own answer, which cannot disagree with what the
 * tool enforces.
 *
 * WHY THIS FILE IS `.mjs` AND NOT `.ts`. eslint loads its flat config through Node's own ESM loader,
 * so a TypeScript config would need `jiti` as a further devDependency to buy nothing.
 *
 * ═══ THE THRESHOLD COMES FROM OUTSIDE THE TREE ═══
 *
 * A threshold seeded at this tree's own measured maximum certifies whatever the code already does.
 * A fitness function's line must be stated independently of the code it judges, or it is a mirror.
 * So the numbers below are stated by bodies outside this repository, and nothing measured from this
 * tree may ever enter them.
 *
 * Production and test code are held to the SAME `cognitiveComplexity`, because an external standard
 * does not bend to the population it is applied to.
 *
 * WHEN THIS REDS ON LEGITIMATE GROWTH, the red names the rule, the file and the measured value, and
 * the response is to refactor. There is no exception list to record one in, and none is needed: a
 * red is only ever about a file the change touched.
 */

/**
 * The types are stated here as JSDoc for a reader; they enforce nothing — there is no `allowJs`, and
 * `tsconfig.json`'s `include` does not reach this file.
 *
 * @typedef {number | "off"} RuleThreshold
 *   One rule's threshold: a number, or the literal `"off"` when the rule does not apply to that
 *   scope. `"off"` is EXPLICIT rather than an absent key — an absent key is indistinguishable from
 *   an oversight.
 *
 * @typedef {{ cognitiveComplexity: RuleThreshold, maxLinesPerFunction: RuleThreshold }} ComplexityThreshold
 *
 * @typedef {"sonarjs/cognitive-complexity" | "max-lines-per-function"} EslintRuleId
 *
 * @typedef {"off" | readonly ["warn", number] | readonly ["warn", { max: number, skipBlankLines: true, skipComments: true }]} RuleEntry
 */

/**
 * Production code — `packages/<pkg>/src` and `tests/steps`, excluding test files.
 *
 * WHERE EACH NUMBER CAME FROM. A cited number and an uncited one are indistinguishable once shipped.
 *
 *   - `cognitiveComplexity` 15 — SonarSource's published COGNITIVE COMPLEXITY metric and the default
 *     of `sonarjs/cognitive-complexity`. Cognitive complexity scores what makes code hard to READ —
 *     nesting and broken flow — where cyclomatic complexity scores a flat `switch` like nested
 *     conditionals.
 *   - `maxLinesPerFunction` 40 — Google engineering practices: a function past roughly 40 lines
 *     should be considered for breaking up. Robert Martin's Clean Code is stricter at ~20; 40 is the
 *     more widely published of the two and the less contested.
 *   - No file-length ceiling. No industry body publishes one, so any number would be self-chosen;
 *     what a long file costs is taken per FUNCTION by the two rules above.
 *
 * @type {ComplexityThreshold}
 */
const PRODUCTION_THRESHOLD = {
  cognitiveComplexity: 15,
  maxLinesPerFunction: 40,
};

/**
 * Test code — `**\/*.test.ts`. The same standard, with ONE rule switched off.
 *
 * WHY `max-lines-per-function` IS OFF HERE, AND WHY NO NUMBER REPLACES IT (operator-ruled).
 * The rule measures production-function tractability. A `describe` / `it` callback is a CONTAINER,
 * and a `describe` holding fifteen tests is not a 200-line function in the sense the guidance
 * addresses. There is no external standard for test-container length, so the honest move is to
 * abstain from the rule, not to invent a number measured from the test tree.
 *
 * NOT A CARVE-OUT. Test scope stays held to `cognitiveComplexity` 15. Accepted residual,
 * operator-ruled: a straight-line test helper under cognitive 15 escapes.
 *
 * @type {ComplexityThreshold}
 */
const TEST_THRESHOLD = {
  cognitiveComplexity: 15,
  maxLinesPerFunction: "off",
};

/**
 * One eslint rule held at one ceiling, at `warn`, in the shape THAT rule takes.
 *
 * THE SHAPE IS NOT UNIFORM, AND GETTING IT WRONG IS SILENT. `sonarjs/cognitive-complexity` takes a
 * bare number (`["warn", 15]`); `max-lines-per-function` takes an options object
 * (`["warn", { max, … }]`). Hand eslint the wrong one and it mis-reads the option and applies no
 * ceiling at all, which looks exactly like a file under its ceiling. Nothing tests this emitter; the
 * arbiter, when one is needed, is the RESOLVED config: `ESLint#calculateConfigForFile`.
 *
 * `warn`, NOT `error`, and that is the gate's contract rather than leniency: the CI step's
 * `--max-warnings 0` over the touched files is what turns a warning into a red. An `error` here would
 * red the whole-tree report over files nobody touched.
 *
 * A `"off"` ceiling passes straight through. THE BARE STRING IS THE POINT: eslint normalises `"off"`
 * to severity 0 while KEEPING the options the production block already set, so a test file resolves
 * to `[0, { max: 40, … }]`. Writing `[0]`, or omitting the rule, resolves differently.
 *
 * @param {EslintRuleId} rule
 * @param {RuleThreshold} ceiling
 * @returns {RuleEntry}
 */
const ruleAtCeiling = (rule, ceiling) => {
  if (ceiling === "off") return "off";
  return rule === "sonarjs/cognitive-complexity"
    ? ["warn", ceiling]
    : ["warn", { max: ceiling, skipBlankLines: true, skipComments: true }];
};

/** Both rules at one scope's thresholds. The option shape is `ruleAtCeiling`'s alone. */
const thresholdRules = (threshold) => ({
  "sonarjs/cognitive-complexity": ruleAtCeiling(
    "sonarjs/cognitive-complexity",
    threshold.cognitiveComplexity,
  ),
  "max-lines-per-function": ruleAtCeiling(
    "max-lines-per-function",
    threshold.maxLinesPerFunction,
  ),
});

/** TypeScript needs a parser; neither rule is type-aware, so no `project` is required. */
const tsLanguageOptions = {
  parser: tseslint.parser,
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
};

/**
 * The measured population — the single answer to which files are ours.
 *
 * ONE list, because a second copy would be a second measurement scope and every file in the
 * difference would escape it silently. Test files live under these same globs — the test block below
 * restates rules for them, it does not add files.
 *
 * THE CUCUMBER STEP DEFINITIONS TAKE THE PRODUCTION BLOCK. A `*.steps.ts` is not a `*.test.ts`, so
 * nothing below turns `max-lines-per-function` off for it: a `Given(...)` callback DOES the work and
 * is held to 40; a `describe(...)` only groups and is not (operator-ruled).
 *
 * WIDENING THE SCOPE IS A DECISION, NOT HOUSEKEEPING. A new glob admits a population nobody has
 * measured: its standing violations appear in the report at once and red the first time anyone
 * touches one of those files. Run the population through this config before the glob lands.
 *
 * @type {string[]}
 */
export const MEASURED_GLOBS = ["packages/*/src/**/*.ts", "tests/steps/**/*.ts"];

/**
 * Build output and the mutation sandbox are COPIES of the tree — linting them would double-count
 * every finding and red on generated code nobody edits.
 */
const IGNORED_COPIES_OF_THE_TREE = {
  ignores: ["**/dist/**", ".stryker-tmp/**", "**/node_modules/**"],
};

/**
 * The `sonarjs` namespace, registered ONCE. A config object with no `files` key matches every file,
 * so one entry puts the plugin in scope for every block below; eslint refuses a namespace redefined
 * with a DIFFERENT object, so a per-block copy would be either redundant or fatal.
 */
const SONARJS_NAMESPACE = { plugins: { sonarjs } };

/**
 * A SUPPRESSION CANNOT OUTLIVE ITS REASON — mandatory portfolio-wide (`fitness-functions.md`), and
 * set in `eslint.boundaries.mjs` too, because the ruling is about the linter and not about this check.
 *
 * ESLint 9 defaults this to `"warn"`, which exits 0 — indistinguishable, at the step's recorded
 * outcome, from no directive at all. At `"error"` it reds the whole-tree report, whether or not the
 * push touched the file: a standing complexity breach is debt that shrinks when its file is next
 * touched, while a dead directive is a lie that gets no less untrue by being old.
 */
const NO_DEAD_SUPPRESSION = {
  linterOptions: { reportUnusedDisableDirectives: "error" },
};

export default [
  IGNORED_COPIES_OF_THE_TREE,
  SONARJS_NAMESPACE,
  NO_DEAD_SUPPRESSION,
  {
    files: MEASURED_GLOBS,
    languageOptions: tsLanguageOptions,
    rules: thresholdRules(PRODUCTION_THRESHOLD),
  },
  {
    // After the production block so it wins for test files.
    files: ["**/*.test.ts"],
    languageOptions: tsLanguageOptions,
    rules: thresholdRules(TEST_THRESHOLD),
  },
];
