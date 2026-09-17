/**
 * Types for `eslint.config.mjs` — so the TypeScript side of the tree can read the real config's
 * named exports instead of restating what they hold.
 *
 * eslint reads only the `default` export and needs no types at all. This file exists for the other
 * readers: `changedFiles.d.mts` types its re-export through here. The cucumber arm that drove
 * `changedFiles` and `configForChanged` out of the config CI actually runs was withdrawn by
 * 3F-3478, and no reader replaced it. The alternative — a second copy of the thresholds, the scope
 * split and the globs living inside a reader — is the agreeing-by-copy this config's exports exist
 * to avoid.
 *
 * ITS FIRST READER WAS THE EXCEPTION-LIST RECONCILIATION, AND THAT READER IS GONE (3F-3408's
 * Delete). `BARE_STANDARD_CONFIG` went with the per-file allowance blocks at 3F-3466's Delete: with
 * nothing excusing a violation, the bare standard and the default export are no longer two different
 * things and the name had nothing left to distinguish.
 */

import type { Linter } from "eslint";

/** The globs the report block holds and the gate block intersects — which files are ours. */
export declare const MEASURED_GLOBS: string[];

/**
 * The repo-relative paths this change touched, re-exported from `tests/checks/changedFiles.mjs`
 * (3F-3462) so a consumer reads the gate's answer off the config that uses it.
 */
export declare function changedFiles(root: string): readonly string[];

/**
 * The whole config composed from one changed set: the report at `warn`, then the gate at `error` over
 * the intersection with `changed`, last. The default export is a call to this.
 */
export declare function configForChanged(changed: readonly string[]): Linter.Config[];

/** What eslint itself reads: `configForChanged(changedFiles(<this file's directory>))`. */
declare const config: Linter.Config[];
export default config;
