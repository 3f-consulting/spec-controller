/**
 * Types for `complexityExceptions.mjs` (@SCN-CPX-001, 3F-2286) — the dated debt list.
 *
 * Deliberately a SEPARATE module from `complexityThresholds.mjs`, and the reason is provenance, not
 * tidiness: every number in the threshold module comes from OUTSIDE this tree, and every number here
 * is MEASURED FROM it. Those are opposite guarantees, and one file could not carry both without the
 * next reader having to work out which kind each number was.
 */

/** The three eslint rules an exception can suspend. */
export type ExceptionRule = "complexity" | "max-lines" | "max-lines-per-function";

/** One file's recorded exceedance of one rule. */
export interface ComplexityException {
  /** Repo-relative path of the file, exactly as eslint's `files` patterns match it. */
  path: string;
  /** The eslint rule id this file exceeds. */
  rule: ExceptionRule;
  /** The value measured on `since` — the file's worst offender for this rule. */
  value: number;
  /** ISO date the value was measured. */
  since: string;
}

/** Today's exceedances of the external standard, per file, per rule. */
export declare const COMPLEXITY_EXCEPTIONS: readonly ComplexityException[];
