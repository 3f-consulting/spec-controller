/**
 * The EvidenceObligations — the declared-corpus census carried ALONGSIDE the balance, a
 * sibling to both the pure Ledger (the declared-vs-observed verdict data) and
 * the RunContext (run metadata). It records how the declared corpus reconciles
 * against EVERY raw @SCN mention in the source: how many ids the source mentioned in
 * total (tag + non-tag context) vs how many were actually read as declared scenarios.
 *
 * The lone non-derivable corpus fact is `excludedOccurrences` (raw − declared): the
 * @SCN ids seen in prose, comments, or step text that the tag-line parser ignores.
 * `scenarioCount` is derivable from the balance and `rawScnOccurrences` is derivable
 * as scenarioCount + excludedOccurrences, so only `excludedOccurrences` is persisted
 * on the JSON surface (project design §3). Threaded CLI→renderers exactly like
 * RunContext — a third, OPTIONAL renderer argument — so the existing 2-arg byte/JSON
 * guards stay green untouched.
 *
 * Parent: (@SCN-RPT-008).
 */

/**
 * One untagged scenario (@SCN-RPT-014) — a Gherkin scenario header with no
 * `@SCN` tag, located by its feature file + scenario name (the where-to-fix locator).
 */
export interface UntaggedScenario {
  /** The feature file the scenario lives in (e.g. `report.feature`). */
  feature: string;
  /** The scenario name — the text after the `Scenario:`/`Outline:`/`Example:` keyword. */
  scenario: string;
}

/** The declared-corpus census — a reconciliation-read fact carried beside the balance. */
export interface EvidenceObligations {
  /** Every @SCN-FFF-NNN occurrence in the whole source (tag-line + non-tag context). */
  rawScnOccurrences: number;
  /** The @SCN ids actually read as declared scenarios (= declared.length). */
  scenarioCount: number;
  /** rawScnOccurrences − scenarioCount: ids seen in non-tag context, excluded. */
  excludedOccurrences: number;
  /**
   * Gherkin scenarios with no @SCN tag — feature:scenario locators, sorted.
   * A NEW non-derivable declared-side datum, so it persists on JSON beside
   * `excludedOccurrences` (project design §3).
   */
  untaggedScenarios: UntaggedScenario[];
  /**
   * @SCN codes that appear only in prose, never as a tag anywhere — the
   * dangling references, sorted. A cross-corpus `proseCodes − tagCodes` difference,
   * distinct from `excludedOccurrences` (raw occurrences). Non-derivable declared-side
   * datum → persists on JSON beside the others (project design §3).
   */
  proseOnlyCodes: string[];
}

/**
 * Build a EvidenceObligations from the raw-occurrence count, the declared-scenario count,
 * and the untagged scenarios: `excludedOccurrences = raw − scenarioCount` — the ids
 * seen in non-tag context (each declared scenario contributes exactly one tag-line
 * occurrence). `untaggedScenarios` defaults to empty for callers that don't read them.
 */
export function evidenceObligations(
  raw: number,
  scenarioCount: number,
  untaggedScenarios: UntaggedScenario[] = [],
  proseOnlyCodes: string[] = []
): EvidenceObligations {
  return {
    rawScnOccurrences: raw,
    scenarioCount,
    excludedOccurrences: raw - scenarioCount,
    untaggedScenarios,
    proseOnlyCodes,
  };
}
