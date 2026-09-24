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
  /** `foreign-scn-code` only: the feature part the scenario's id names. */
  readonly namedFeatureCode?: string;
  /**
   * `foreign-scn-code` only: the files whose header carries that feature part — none, one or
   * several (3F-3666). The by-feature cut counts the scenario under that code's row, so this is
   * what decides which row the scenario lands in and where it could move.
   */
  readonly namedFeatureFiles?: readonly string[];
  readonly message: string;
}

/**
 * The population the scenario codes were judged over (3F-3666): every feature file read, coded
 * or not, and the distinct header codes among them. Two counts, because they differ as soon as
 * one file carries no code, and one count naming both is what made the clean statement false.
 */
export interface ScenarioCodePopulation {
  readonly featureFiles: number;
  readonly featureCodes: number;
}

/** Does this run carry a scenario code error? Absent means no corpus was judged. */
export function hasScenarioCodeErrors(reconciliation: {
  readonly scenarioCodeErrors?: readonly ScenarioCodeError[];
}): boolean {
  return (reconciliation.scenarioCodeErrors ?? []).length > 0;
}
