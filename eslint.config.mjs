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
 * ═══ THE EXCEPTION BLOCKS — A FROZEN CEILING PER FILE PER RULE (@SCN-CPX-002, 3F-2317) ═══
 *
 * ORDER IS LOAD-BEARING. The exception blocks are emitted LAST, after both scope blocks, for exactly
 * the same reason the test block follows the production one: later wins. Moving them above either
 * scope block would silently restore the standard over every exempt file and red the tree.
 *
 * AN EXCEPTION FREEZES ITS FILE AT EXACTLY THE RECORDED NUMBER. It excuses the debt the file already
 * carries and buys not one line of headroom: at the recorded value the file is green, one past it
 * reds. `@SCN-CPX-001` switched the rule OFF instead, so an exempt file could double in size and
 * nothing would notice — that stage is over.
 *
 * WHAT THE CEILING DOES AND DOES NOT GUARANTEE. eslint holds these rules per FILE, not per function,
 * so each entry carries that file's WORST offender for the rule and the whole file is frozen there.
 * The guarantee is "the file reds when its WORST offender for that rule grows past the recorded
 * value" — NOT "any function in it reds when it grows". A file frozen at 72 is frozen at 72 for every
 * function in it, so a 41-line function there can reach 72 unnoticed. Said plainly because a gate
 * must not certify more than it checks; closing it needs a different mechanism and its own @SCN.
 *
 * A FILE UNDER ITS RECORDED VALUE STILL PASSES. Banking that improvement — reding a list that has
 * stopped matching the tree, in EITHER direction — is `@SCN-CPX-003`'s reconciliation (3F-2318), and
 * it is what turns this ceiling into a ratchet. Until then an entry can go stale downward in silence.
 */

import tseslint from "typescript-eslint";
import { COMPLEXITY_EXCEPTIONS } from "./packages/spec-controller/static-checks/complexityExceptions.mjs";
import {
  PRODUCTION_THRESHOLD,
  TEST_THRESHOLD,
  ruleAtCeiling,
} from "./packages/spec-controller/static-checks/complexityThresholds.mjs";

/**
 * All three rules at one scope's thresholds.
 *
 * The per-rule option SHAPE is not decided here — `ruleAtCeiling` owns it, and the exception blocks
 * below call the same function. That is deliberate: a ceiling emitted in the wrong shape is read by
 * eslint as no ceiling at all, silently, so the two callers must not each decide it. One emitter, one
 * @unit pin over it, no copy to drift.
 */
const thresholdRules = (threshold) => ({
  complexity: ruleAtCeiling("complexity", threshold.complexity),
  "max-lines": ruleAtCeiling("max-lines", threshold.maxLines),
  "max-lines-per-function": ruleAtCeiling(
    "max-lines-per-function",
    threshold.maxLinesPerFunction,
  ),
});

/** TypeScript needs a parser; none of the three rules is type-aware, so no `project` is required. */
const tsLanguageOptions = {
  parser: tseslint.parser,
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
};

/**
 * The measured population — the globs the production block holds AND the globs the reconciliation
 * hands to `lintFiles`. ONE list, exported, because a second copy would be a second measurement
 * scope: the reconciliation would read a population the config never judged, and every file in the
 * difference would reconcile as a stale entry or escape unmeasured, silently. Test files live under
 * these same globs — the test block below re-declares rules for them, it does not add files.
 *
 * @type {string[]}
 */
export const MEASURED_GLOBS = ["packages/*/src/**/*.ts", "packages/*/static-checks/**/*.ts"];

/**
 * The standard, held over both scopes, with NO exception applied (@SCN-CPX-003, 3F-2318).
 *
 * Exported so `complexityExceptionsReconciliation.mjs` can measure the tree through eslint at the
 * BARE standard — the values every entry in the debt list claims — instead of re-declaring the
 * thresholds, the scope split and the globs a second time. A second declaration would agree with
 * this one by coincidence and drift the moment either changed, which is exactly the agreeing-by-copy
 * this codebase keeps removing; and the reconciliation's whole contract is that its numbers are the
 * ones THIS config produces.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const BARE_STANDARD_CONFIG = [
  {
    // Build output and the mutation sandbox are COPIES of the tree — linting them would double-count
    // every finding and red on generated code nobody edits.
    ignores: ["**/dist/**", ".stryker-tmp/**", "**/node_modules/**"],
  },
  {
    // Production: the measured population.
    files: MEASURED_GLOBS,
    languageOptions: tsLanguageOptions,
    rules: thresholdRules(PRODUCTION_THRESHOLD),
  },
  {
    // Tests: same standard, `max-lines-per-function` off. Must come AFTER the production block to win.
    files: ["**/*.test.ts"],
    languageOptions: tsLanguageOptions,
    rules: thresholdRules(TEST_THRESHOLD),
  },
];

export default [
  ...BARE_STANDARD_CONFIG,
  // Today's dated debt, one block per file per rule, each FROZEN at its recorded value. LAST, so
  // they win over both scope blocks.
  ...COMPLEXITY_EXCEPTIONS.map(({ path, rule, value }) => ({
    files: [path],
    rules: { [rule]: ruleAtCeiling(rule, value) },
  })),
];
