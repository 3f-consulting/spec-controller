/**
 * Types for `complexityThresholds.mjs` (@SCN-CPX-001). The runtime module is plain ESM so eslint's own
 * loader can read it with no `jiti`; these types keep every TypeScript consumer — the @unit
 * pin and the Cucumber steps — fully typed against the same one source.
 *
 * `ratchet` was DELETED here by 3F-2286, which superseded 3F-2177's seed-at-measured-maximum rule.
 * A ratchet target only made sense as "the p90 this seed is heading toward"; with the threshold now
 * stated from outside the tree there is no seed to descend from, and the debt that used to be implied
 * by the gap is enumerated explicitly in `complexityExceptions.d.mts` instead.
 */

/**
 * One rule's threshold: a number, or the literal `"off"` when the rule does not apply to that scope.
 *
 * `"off"` is EXPLICIT rather than an absent key. An absent key is indistinguishable from an oversight,
 * and the @unit pin exists precisely to catch a rule that goes silently unheld; an explicit `"off"` has
 * to be written on purpose and can be asserted against.
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
 * Where each number came from — the point of 3F-2286. One citation per rule, naming a source OUTSIDE
 * this tree, or (for `maxLines` alone) saying plainly that it is a chosen ceiling with no such source.
 */
export type StandardSources = Readonly<Record<keyof ComplexityThreshold, string>>;

/** The external provenance of the three numbers. */
export declare const STANDARD_SOURCES: StandardSources;

/** Production code: `packages/<pkg>/src`, `packages/<pkg>/static-checks`; excludes test files. */
export declare const PRODUCTION_THRESHOLD: ComplexityThreshold;

/** Test code: the `.test.ts` files — same standard, with `max-lines-per-function` explicitly off. */
export declare const TEST_THRESHOLD: ComplexityThreshold;

/**
 * The seeds 3F-2177 measured off this tree and 3F-2286 retired. Exported so the @unit pin can assert
 * NEGATIVE provenance — that no threshold still carries a number this tree produced — without
 * re-typing the retired values into the test and calling that an independent check.
 */
export declare const RETIRED_TREE_DERIVED_SEEDS: readonly number[];

/** The three eslint rule ids the two scopes and the exception list share. */
export type EslintRuleId = "complexity" | "max-lines" | "max-lines-per-function";

/** One eslint rule entry: `"off"`, or `["error", …]` in the shape that rule takes. */
export type RuleEntry =
  | "off"
  | readonly ["error", number]
  | readonly ["error", { max: number; skipBlankLines: false; skipComments: false }];

/**
 * One rule HELD at one ceiling, in the shape THAT rule takes (@SCN-CPX-002, 3F-2317).
 *
 * The ceiling may come from either side of the provenance line — a scope threshold stated from
 * outside this tree, or an exception's value measured from it — because the SHAPE is a property of
 * eslint's rules and not of any number. That is what lets one emitter serve both without either
 * module's guarantee bending.
 */
export declare function ruleAtCeiling(rule: EslintRuleId, ceiling: RuleThreshold): RuleEntry;
