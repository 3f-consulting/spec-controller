/**
 * Types for `complexityThresholds.mjs` (3F-2286). The runtime module is plain ESM so eslint's own
 * loader can read it with no `jiti`; these types keep every TypeScript consumer typed against the
 * same one source. The Cucumber steps that were one such consumer were withdrawn by 3F-3478.
 *
 * `ratchet` was DELETED here by 3F-2286, which superseded 3F-2177's seed-at-measured-maximum rule.
 * A ratchet target only made sense as "the p90 this seed is heading toward"; with the threshold now
 * stated from outside the tree there is no seed to descend from. The debt the gap used to imply was
 * enumerated in a dated list of per-file allowances until 3F-3466 deleted it; `pnpm exec eslint` now
 * reports every standing violation on every run, which is where that debt is read from.
 */

/**
 * One rule's threshold: a number, or the literal `"off"` when the rule does not apply to that scope.
 *
 * `"off"` is EXPLICIT rather than an absent key. An absent key is indistinguishable from an oversight,
 * and a rule that goes silently unheld is exactly what nothing would notice; an explicit `"off"` has
 * to be written on purpose.
 */
export type RuleThreshold = number | "off";

/** The three rule thresholds a scope holds. */
export interface ComplexityThreshold {
  /** eslint `complexity` — the per-function cyclomatic ceiling. */
  complexity: RuleThreshold;
  /** eslint `max-lines` — the per-file ceiling. */
  maxLines: RuleThreshold;
  /** eslint `max-lines-per-function` — the per-function line ceiling; `"off"` for test scope. */
  maxLinesPerFunction: RuleThreshold;
}

/**
 * Production code: `packages/<pkg>/src`, `tests/checks`; excludes test files. Each number's external
 * source is cited on its declaration in `complexityThresholds.mjs` — the point of 3F-2286.
 */
export declare const PRODUCTION_THRESHOLD: ComplexityThreshold;

/** Test code: the `.test.ts` files — same standard, with `max-lines-per-function` explicitly off. */
export declare const TEST_THRESHOLD: ComplexityThreshold;

/** The three eslint rule ids both scopes share. */
export type EslintRuleId = "complexity" | "max-lines" | "max-lines-per-function";

/**
 * The two severities a held rule can carry (@SCN-FIT-001, 3F-3462). `error` gates — eslint exits 1;
 * `warn` reports — every finding is printed and eslint exits 0. Both are eslint's own vocabulary, so
 * neither is a number measured from this tree.
 */
export type EslintSeverity = "error" | "warn";

/** One eslint rule entry: `"off"`, or `[severity, …]` in the shape that rule takes. */
export type RuleEntry =
  | "off"
  | readonly [EslintSeverity, number]
  | readonly [EslintSeverity, { max: number; skipBlankLines: true; skipComments: true }];

/**
 * One rule HELD at one ceiling at one severity, in the shape THAT rule takes (3F-2317; the severity
 * added under @SCN-FIT-001, 3F-3462).
 *
 * The ceiling could once come from either side of the provenance line — a scope threshold stated
 * from outside this tree, or a per-file allowance measured from it — because the SHAPE is a property
 * of eslint's rules and not of any number, and the SEVERITY is eslint's own vocabulary. Since 3F-3466
 * every ceiling is a scope threshold, and the same indifference is what lets one emitter serve both
 * the report and the gate without either guarantee bending.
 */
export declare function ruleAtCeiling(
  rule: EslintRuleId,
  ceiling: RuleThreshold,
  severity: EslintSeverity,
): RuleEntry;
