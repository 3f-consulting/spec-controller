/**
 * A SCENARIO CODE ERROR — a scenario code filed under the wrong account class (3F-3635).
 *
 * The @SCN is the account number and the feature file is its account class
 * (`the maintainers' private notes`). A misfiled code leaves every posting unambiguous, so the
 * account reconciles exactly as it would if filed correctly; what it falsifies is the report's
 * by-feature cut, which groups on the code. It is therefore a whole-run fact about the corpus, not
 * an item on any account, and a run carrying one fails (exit 1).
 *
 * A duplicated @SCN is NOT one of these: it makes its account unreconcilable, so it is reported
 * on that account's rows as `duplicate-scn-code`.
 */

/** The three ways a code can be misfiled. */
export type ScenarioCodeErrorKind = "foreign-scn-code" | "no-feature-code" | "duplicate-feature-code";

/** One misfiling: its handle, the feature file(s) it concerns, and what to do about it. */
export interface ScenarioCodeError {
  readonly kind: ScenarioCodeErrorKind;
  /** The feature file(s) the error concerns, as `<slug>.feature`. */
  readonly files: readonly string[];
  readonly message: string;
}

/** Does this run carry a scenario code error? Absent means no corpus was judged. */
export function hasScenarioCodeErrors(reconciliation: {
  readonly scenarioCodeErrors?: readonly ScenarioCodeError[];
}): boolean {
  return (reconciliation.scenarioCodeErrors ?? []).length > 0;
}
