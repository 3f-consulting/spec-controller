/**
 * The complexity + module-size static check (@SCN-CPX-001, 3F-2286) — `pnpm lint:complexity`.
 *
 * Mechanism over honour: small-modules, entity-owns-its-behaviour and DRY are honour rules until
 * something reds. This is the something. THREE rules only — `complexity`, `max-lines`,
 * `max-lines-per-function`. Deliberately no `recommended` preset and no style rules: the ticket
 * declared three, and a preset would smuggle in a large ruleset nobody endorsed (`zero-shape`).
 *
 * The thresholds are NOT written here — they live in `static-checks/complexityThresholds.mjs`, the one
 * source the @unit pin also reads. See that file for the external sources each number is cited to, and
 * for why nothing measured off this tree may enter it. The exceedances that exist TODAY live in
 * `static-checks/complexityExceptions.mjs`, which carries the opposite guarantee.
 *
 * SCOPE MATCHES WHAT THE EXCEPTIONS WERE MEASURED OVER. The production block covers
 * `packages/<pkg>/src` and `packages/<pkg>/static-checks`. Widening these globs without re-measuring
 * would let the check red over files no exception was ever recorded against — a wall of reds on a
 * green tree, which is how a fitness function starts crying wolf.
 *
 * HOW THE TEST SCOPE IS CARVED OUT. Flat config applies blocks in order and later blocks win for the
 * files they match, so the `**\/*.test.ts` block below re-declares the same three rules at the test
 * threshold and thereby overrides the production block for test files. That is the whole exclusion
 * mechanism — there is no `ignores` entry for tests, and adding one would silently un-hold them.
 *
 * ═══ THE EXCEPTION BLOCKS, AND WHAT THEY DO *TODAY* ═══
 *
 * ORDER IS LOAD-BEARING. The exception blocks are emitted LAST, after both scope blocks, for exactly
 * the same reason the test block follows the production one: later wins. Moving them above either
 * scope block would silently restore the standard over every exempt file and red the tree.
 *
 * AT THIS STAGE AN EXCEPTION SWITCHES ITS RULE **OFF** FOR THAT FILE. The `value` each entry carries is
 * WRITTEN BUT NOT YET ENFORCED — an exempt file could double in size today and nothing would red. That
 * is deliberate and temporary: freezing a file at exactly its recorded number is `@SCN-CPX-002`'s
 * behaviour (3F-2317), and implementing it here would leave that sub-issue with no genuine red to
 * drive it. Do NOT read the current state as the finished mechanism — the ratchet arrives in two more
 * steps, and until it does the list is a debt REGISTER rather than a ceiling.
 */

import tseslint from "typescript-eslint";
import { COMPLEXITY_EXCEPTIONS } from "./packages/spec-controller/static-checks/complexityExceptions.mjs";
import {
  PRODUCTION_THRESHOLD,
  TEST_THRESHOLD,
} from "./packages/spec-controller/static-checks/complexityThresholds.mjs";

/**
 * One rule at one scope's threshold, in the shape that rule takes.
 *
 * The three rules do NOT share an options shape — `complexity` takes a bare number, the two line rules
 * take an options object — so the shape is chosen per rule rather than assumed uniform. A threshold of
 * `"off"` passes straight through to eslint's own severity vocabulary.
 *
 * `skipBlankLines: false, skipComments: false` is load-bearing, not a default worth leaving implicit:
 * every recorded exception value was MEASURED in this mode, and any other mode changes every number
 * silently — a file that fits under 400 counted-without-comments does not fit under 400
 * counted-with.
 */
const lineRule = (max) =>
  max === "off" ? "off" : ["error", { max, skipBlankLines: false, skipComments: false }];

const thresholdRules = (threshold) => ({
  complexity: threshold.complexity === "off" ? "off" : ["error", threshold.complexity],
  "max-lines": lineRule(threshold.maxLines),
  "max-lines-per-function": lineRule(threshold.maxLinesPerFunction),
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
    files: ["packages/*/src/**/*.ts", "packages/*/static-checks/**/*.ts"],
    languageOptions: tsLanguageOptions,
    rules: thresholdRules(PRODUCTION_THRESHOLD),
  },
  {
    // Tests: same standard, `max-lines-per-function` off. Must come AFTER the production block to win.
    files: ["**/*.test.ts"],
    languageOptions: tsLanguageOptions,
    rules: thresholdRules(TEST_THRESHOLD),
  },
  // Today's dated debt, one block per file per rule. LAST, so they win over both scope blocks.
  ...COMPLEXITY_EXCEPTIONS.map(({ path, rule }) => ({
    files: [path],
    rules: { [rule]: "off" },
  })),
];
