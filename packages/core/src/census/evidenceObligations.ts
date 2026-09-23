/**
 * The EvidenceObligations — the obligation-corpus census carried ALONGSIDE the balance, a
 * sibling to both the pure Ledger (the obligation-vs-observation verdict data) and
 * the RunContext (run metadata). It records how the parsed corpus reconciles
 * against EVERY raw @SCN mention in the source: how many ids the source mentioned in
 * total (tag + non-tag context) vs how many were actually read as scenarios.
 *
 * The lone non-derivable corpus fact is `excludedOccurrences` (raw − scenarioCount): the
 * @SCN ids seen in prose, comments, or step text that the tag-line parser ignores.
 * `scenarioCount` is derivable from the balance and `rawScnOccurrences` is derivable
 * as scenarioCount + excludedOccurrences, so only `excludedOccurrences` is persisted
 * on the JSON surface (project design §3). Threaded CLI→renderers exactly like
 * RunContext — a third, OPTIONAL renderer argument — so the existing 2-arg byte/JSON
 * guards stay green untouched.
 *
 * Parent: (@SCN-RPT-008).
 */

import { parseTaggedScenarios } from "../parse/scenarios.js";

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

/**
 * One `@SCN` code the corpus carries on more than one scenario (@SCN-STG-017, 3F-3609) — the code,
 * and every scenario carrying it by `feature : scenario`, the locator `UntaggedScenario` uses.
 */
export interface SharedScnCode {
  scnId: string;
  scenarios: UntaggedScenario[];
}

/** The scenario-corpus census — a reconciliation-read fact carried beside the balance. */
export interface EvidenceObligations {
  /** Every @SCN-FFF-NNN occurrence in the whole source (tag-line + non-tag context). */
  rawScnOccurrences: number;
  /** The @SCN ids actually read as scenarios. */
  scenarioCount: number;
  /** rawScnOccurrences − scenarioCount: ids seen in non-tag context, excluded. */
  excludedOccurrences: number;
  /**
   * Gherkin scenarios with no @SCN tag — feature:scenario locators, sorted.
   * A NEW non-derivable obligation-side datum, so it persists on JSON beside
   * `excludedOccurrences` (project design §3).
   */
  untaggedScenarios: UntaggedScenario[];
  /**
   * @SCN codes that appear only in prose, never as a tag anywhere — the
   * dangling references, sorted. A cross-corpus `proseCodes − tagCodes` difference,
   * distinct from `excludedOccurrences` (raw occurrences). Non-derivable obligation-side
   * datum → persists on JSON beside the others (project design §3).
   */
  proseOnlyCodes: string[];
  /**
   * The codes carried by more than one scenario, and who carries each (@SCN-STG-017) — the names
   * the ledger cannot hold, since its account is keyed by the code. Present only when non-empty.
   */
  sharedScnCodes?: SharedScnCode[];
}

/**
 * Build a EvidenceObligations from the raw-occurrence count, the scenario count,
 * and the untagged scenarios: `excludedOccurrences = raw − scenarioCount` — the ids
 * seen in non-tag context (each scenario contributes exactly one tag-line
 * occurrence). `untaggedScenarios` defaults to empty for callers that don't read them.
 */
export function evidenceObligations(
  raw: number,
  scenarioCount: number,
  untaggedScenarios: UntaggedScenario[] = [],
  proseOnlyCodes: string[] = [],
  sharedScnCodes: SharedScnCode[] = []
): EvidenceObligations {
  return {
    rawScnOccurrences: raw,
    scenarioCount,
    excludedOccurrences: raw - scenarioCount,
    untaggedScenarios,
    proseOnlyCodes,
    // Present only when a code IS shared, so a clean corpus serialises exactly as it did.
    ...(sharedScnCodes.length > 0 ? { sharedScnCodes } : {}),
  };
}

/**
 * The codes the corpus carries on more than one scenario, each with the scenarios carrying it
 * (@SCN-STG-017, 3F-3609), sorted by code — read from each feature file's source over the same
 * tag-inheritance walk the obligations are raised from, so a hoisted `@SCN` names every scenario
 * that inherits it.
 */
export function sharedScnCodesOf(
  files: readonly { feature: string; source: string }[]
): SharedScnCode[] {
  const byCode = new Map<string, UntaggedScenario[]>();
  for (const { feature, source } of files) {
    for (const { scnId, name } of parseTaggedScenarios(source)) {
      byCode.set(scnId, [...(byCode.get(scnId) ?? []), { feature, scenario: name }]);
    }
  }
  return [...byCode]
    .filter(([, scenarios]) => scenarios.length > 1)
    .map(([scnId, scenarios]) => ({ scnId, scenarios }))
    .sort((a, b) => a.scnId.localeCompare(b.scnId));
}
