/**
 * The complexity + module-size static guard (@SCN-CPX-001, 3F-2177) — `pnpm lint:complexity`.
 *
 * Mechanism over honour: small-modules, entity-owns-its-behaviour and DRY are honour rules until
 * something reds. This is the something. THREE rules only — `complexity`, `max-lines`,
 * `max-lines-per-function`. Deliberately no `recommended` preset and no style rules: the ticket
 * declared three, and a preset would smuggle in a large ruleset nobody endorsed (`zero-shape`).
 *
 * The budgets are NOT written here — they live in `static-guards/complexityBudgets.mjs`, the one
 * source the @unit pin also reads. See that file for why they are seeded at the measured maximum
 * rather than the p90, and for the ratchet targets.
 *
 * SCOPE MATCHES WHAT WAS MEASURED. The production block covers exactly the population the budgets were
 * measured over — `packages/<pkg>/src` and `packages/<pkg>/static-guards`. Widening these globs without
 * re-measuring would let the guard red over files no budget was ever calibrated against, which is how
 * a gate starts crying wolf.
 *
 * HOW THE TEST SCOPE IS CARVED OUT. Flat config applies blocks in order and later blocks win for the
 * files they match, so the `**\/*.test.ts` block below re-declares the same three rules at the test
 * budget and thereby overrides the production block for test files. That is the whole exclusion
 * mechanism — there is no `ignores` entry for tests, and adding one would silently un-gate them.
 */

import tseslint from "typescript-eslint";
import {
  PRODUCTION_BUDGET,
  TEST_BUDGET,
} from "./packages/spec-controller/static-guards/complexityBudgets.mjs";

/**
 * The three rules at one scope's budget.
 *
 * `skipBlankLines: false, skipComments: false` is load-bearing, not a default worth leaving implicit:
 * the budgets were MEASURED in this mode, and any other mode changes every number silently — a file
 * that fits under 1024 counted-with-comments does not fit under 1024 counted-without.
 */
const budgetRules = (budget) => ({
  complexity: ["error", budget.complexity],
  "max-lines": ["error", { max: budget.maxLines, skipBlankLines: false, skipComments: false }],
  "max-lines-per-function": [
    "error",
    { max: budget.maxLinesPerFunction, skipBlankLines: false, skipComments: false },
  ],
});

/** TypeScript needs a parser; none of the three rules is type-aware, so no `project` is required. */
const tsLanguageOptions = {
  parser: tseslint.parser,
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
};

export default [
  {
    // Build output and the mutation sandbox are COPIES of the tree — linting them would double-count
    // every finding and red on generated code nobody edits.
    ignores: ["**/dist/**", ".stryker-tmp/**", "**/node_modules/**"],
  },
  {
    // Production: the measured population.
    files: ["packages/*/src/**/*.ts", "packages/*/static-guards/**/*.ts"],
    languageOptions: tsLanguageOptions,
    rules: budgetRules(PRODUCTION_BUDGET),
  },
  {
    // Tests: same three rules, own budget. Must come AFTER the production block to win.
    files: ["**/*.test.ts"],
    languageOptions: tsLanguageOptions,
    rules: budgetRules(TEST_BUDGET),
  },
];
