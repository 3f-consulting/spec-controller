/**
 * The complexity + module-size static guard (@SCN-CPX-001, 3F-2177) — `pnpm lint:complexity`.
 *
 * Mechanism over honour: small-modules, entity-owns-its-behaviour and DRY are honour rules until
 * something reds. This is the something. THREE rules only — `complexity`, `max-lines`,
 * `max-lines-per-function`. Deliberately no `recommended` preset and no style rules: the ticket
 * declared three, and a preset would smuggle in a large ruleset nobody endorsed (`zero-shape`).
 *
 * The thresholds are NOT written here — they live in `static-guards/complexityThresholds.mjs`, the one
 * source the @unit pin also reads. See that file for why they are seeded at the measured maximum
 * rather than the p90, and for the ratchet targets.
 *
 * SCOPE MATCHES WHAT WAS MEASURED. The production block covers exactly the population the thresholds were
 * measured over — `packages/<pkg>/src` and `packages/<pkg>/static-guards`. Widening these globs without
 * re-measuring would let the guard red over files no threshold was ever calibrated against, which is how
 * a gate starts crying wolf.
 *
 * HOW THE TEST SCOPE IS CARVED OUT. Flat config applies blocks in order and later blocks win for the
 * files they match, so the `**\/*.test.ts` block below re-declares the same three rules at the test
 * threshold and thereby overrides the production block for test files. That is the whole exclusion
 * mechanism — there is no `ignores` entry for tests, and adding one would silently un-gate them.
 */

import tseslint from "typescript-eslint";
import {
  PRODUCTION_THRESHOLD,
  TEST_THRESHOLD,
} from "./packages/spec-controller/static-guards/complexityThresholds.mjs";

/**
 * The three rules at one scope's threshold.
 *
 * `skipBlankLines: false, skipComments: false` is load-bearing, not a default worth leaving implicit:
 * the thresholds were MEASURED in this mode, and any other mode changes every number silently — a file
 * that fits under 1024 counted-with-comments does not fit under 1024 counted-without.
 */
const thresholdRules = (threshold) => ({
  complexity: ["error", threshold.complexity],
  "max-lines": ["error", { max: threshold.maxLines, skipBlankLines: false, skipComments: false }],
  "max-lines-per-function": [
    "error",
    { max: threshold.maxLinesPerFunction, skipBlankLines: false, skipComments: false },
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
    rules: thresholdRules(PRODUCTION_THRESHOLD),
  },
  {
    // Tests: same three rules, own threshold. Must come AFTER the production block to win.
    files: ["**/*.test.ts"],
    languageOptions: tsLanguageOptions,
    rules: thresholdRules(TEST_THRESHOLD),
  },
];
