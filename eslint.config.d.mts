/**
 * Types for `eslint.config.mjs` — so the TypeScript side of the tree can read the real config's
 * named exports instead of restating what they hold.
 *
 * eslint reads only the `default` export and needs no types at all. This file exists for the other
 * readers: the @SCN-CPX-001 cucumber arm drives `changedFiles` and `configForChanged` out of the
 * config CI actually runs, and `changedFiles.d.mts` types its re-export through here. The
 * alternative — a second copy of the thresholds, the scope split and the globs living inside a
 * reader — is the agreeing-by-copy this config's exports exist to avoid.
 *
 * ITS FIRST READER WAS THE EXCEPTION-LIST RECONCILIATION, AND THAT READER IS GONE (@SCN-CPX-003's
 * Delete, under 3F-3408). `BARE_STANDARD_CONFIG` went with the per-file allowance blocks at
 * @SCN-CPX-002's Delete (3F-3466): with nothing excusing a violation, the bare standard and the
 * default export are no longer two different things and the name had nothing left to distinguish.
 */

import type { Linter } from "eslint";

/** The globs the report block holds and the gate block intersects — which files are ours. */
export declare const MEASURED_GLOBS: string[];

/**
 * The repo-relative paths this change touched, re-exported from `tests/checks/changedFiles.mjs`
 * (@SCN-CPX-001, 3F-3462) so a consumer reads the gate's answer off the config that uses it.
 */
export declare function changedFiles(root: string): readonly string[];

/**
 * The whole config composed from one changed set: the report at `warn`, then the gate at `error` over
 * the intersection with `changed`, last. The default export is a call to this.
 */
export declare function configForChanged(changed: readonly string[]): Linter.Config[];

/**
 * The one line the run writes to stderr as it resolves the changed set (@SCN-CPX-005, 3F-3468): how
 * many files the change touched, and therefore which part of the measured population was held to the
 * standard rather than merely reported. The empty case is stated in words, never as a zero.
 */
export declare function gatedPopulationStatement(changed: readonly string[]): string;

/** What eslint itself reads: `configForChanged(changedFiles(<this file's directory>))`. */
declare const config: Linter.Config[];
export default config;
