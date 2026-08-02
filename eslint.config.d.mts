/**
 * Types for `eslint.config.mjs` — so the exception-list reconciliation can import the BARE standard
 * out of the real config rather than re-declaring it (@SCN-CPX-003, 3F-2318).
 *
 * eslint reads only the `default` export and needs no types at all; this file exists purely so the
 * TypeScript side of the tree (`lintComplexityExceptionsCli.ts` and the @unit evidence, through
 * `complexityExceptionsReconciliation.d.mts`) can consume the two named exports with the same
 * type-safety every other module here gets. The alternative — a second copy of the thresholds, the
 * scope split and the globs living inside the reconciliation — is the agreeing-by-copy this slice
 * exists to avoid.
 */

import type { Linter } from "eslint";

/** The globs the production block holds and the reconciliation hands to `lintFiles`. */
export declare const MEASURED_GLOBS: string[];

/** The standard over both scopes, with NO exception block applied. */
export declare const BARE_STANDARD_CONFIG: Linter.Config[];

/** What eslint itself reads: the bare standard followed by today's dated per-file ceilings. */
declare const config: Linter.Config[];
export default config;
