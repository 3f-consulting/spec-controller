/**
 * The TARGET's feature corpus read into the two readings one reconciliation needs — moved here
 * from the app's ingest edge (3F-3088).
 *
 * WHY IT LIVES IN THE ENGINE. Every line of it is a pure function of sources somebody else already
 * read off disk: the obligation rule and the measured-tag union are `parseScenarios` and
 * `measuredCheckTags`, both core's own. Sitting at the app edge it was the reason a PUBLISHED
 * module imported core's unpublished `/internal` subpath for five symbols — the fault 3F-3086
 * repairs. One line made it impure and it was the only one: the feature discovery, which now
 * happens at the edge and arrives as `sources`.
 *
 * THE REGISTRY-KEYED READING THIS FILE ONCE ALSO PRODUCED — `checkHandles` and `citedScn`, the
 * obligation-side observer's feed — RETIRED WITH THE REGISTRY ITSELF (3F-3161, @SCN-LNT-017, the
 * last registry-`scn` scenario). Every check now either states its own row's code on its CI step
 * (`citedRow`, below) or is a converted `@fitness` row read through `domain/fitnessChecks`
 * directly; there is no second discovery left to key a handle set off.
 */

import type { FitnessCheckIndex } from "../domain/fitnessChecks.js";
import { measuredCheckTags, type ThresholdIndex } from "../domain/thresholds.js";
import { citationOfCitedRow, type ScriptCitation } from "./fitnessCitations.js";
import { parseScenarios, parseTaggedScenarios, unconfiguredFitnessScenarios } from "./scenarios.js";
import type { Scenario } from "../model.js";

/**
 * The target's feature corpus as ONE run reads it — the obligations it raises, the `@SCN` a run
 * whose CI step states a code cites, and the scenarios on the fitness axis no configured row
 * names.
 *
 * THE READINGS ARE ONE, which is why they are produced together. All are derived from the same
 * bytes and the same configured rows, and the fault they exist to foreclose is precisely their
 * disagreeing: a citation resolved against a corpus the ledger was not built from names a row
 * nobody wrote (@SCN-LNT-009). Returning them separately would leave a caller free to assemble
 * them from different reads.
 *
 * EVERY INPUT IS THE TARGET'S (@SCN-LNT-005). `fitnessChecks` came from the target's manifest and
 * the sources from the target's features directory, so a configured row means what that target
 * says it means and the scenario carrying its `@SCN` is one that target wrote.
 */
export interface TargetCorpus {
  /** The `@SCN`-carrying scenarios, with their evidence obligations raised. */
  scenarios: Scenario[];
  /**
   * What a run whose CI step STATES a code cites — the configured row that code names, read for
   * the characteristic a CI step cannot state (@SCN-LNT-031).
   *
   * NO CODE IS THE SAME ANSWER AS AN UNANSWERED ONE — `null`, the run cites nothing, and it posts
   * to suspense. That is the state a consumer starts in, and this seam does not narrow it.
   */
  citedRow: (citedScn: string | undefined) => ScriptCitation | null;
  /**
   * The scenarios ON the fitness axis that no configured row NAMES (@SCN-LNT-020) — the corpus's
   * half-converted checks, in corpus order.
   *
   * It belongs with the other readings because it is the same one: the obligation rule raises
   * nothing for such a scenario, and this says WHICH ones. Produced here, where the corpus walk and
   * the configured rows are both in hand, so the naming and the raising cannot be taken from
   * different reads — the same guarantee `citedRow` is composed here for.
   */
  unconfiguredFitnessScenarios: readonly string[];
}

/**
 * THE SOURCES ARRIVE READ, AND THAT IS THE WHOLE OF WHAT MOVED. The edge discovers the target's
 * feature files and reads them ONCE, so the reading a citing run needs is still taken from the same
 * bytes. Two discoveries could disagree about the corpus, and a citation resolved against a corpus
 * the ledger was not built from is exactly the phantom-row fault (@SCN-LNT-009); passing one array
 * preserves that guarantee where a features directory would have re-opened the question inside the
 * engine.
 */
export function readTargetCorpus(
  sources: readonly string[],
  deferralTags: readonly string[],
  thresholds: ThresholdIndex,
  /**
   * The target's CONFIGURED ROWS (@SCN-LNT-018) — the CONVERTED route's half of the debit side. It
   * reaches `parseScenarios`, which raises the Evidence Obligations, and `citedRow`, which reads a
   * row back for a run whose CI step states its code (@SCN-LNT-031) — the same rows on both sides,
   * which is the whole reason this reading is composed here.
   */
  fitnessChecks: FitnessCheckIndex
): TargetCorpus {
  // THE OBLIGATION-RAISING TAG SET IS THE MEASURED HALF ALONE NOW (@SCN-CIP-001). The registered
  // half of the union retired with the registry (3F-3161): every bare check tag a stepless
  // scenario could carry against a registered handle is gone, and what is left is the measured
  // axis's own tags — a measured check has no runnable script handle, so it can never be
  // registered, and a corpus read against nothing else would raise nothing for it.
  const obligationTags = measuredCheckTags(thresholds);
  const scenarios = sources.flatMap((source) =>
    parseScenarios(source, deferralTags, obligationTags, thresholds, fitnessChecks)
  );
  // THE UNCONFIGURED-SCENARIO READING'S OWN WALK. Kept as its own pass over the sources — the
  // citation hop that once shared it retired with the registry, so there is only the one reader
  // left to hand it to.
  const tagged = sources.flatMap((source) => parseTaggedScenarios(source));
  return {
    scenarios,
    citedRow: (citedScn) => citationOfCitedRow(citedScn, fitnessChecks),
    unconfiguredFitnessScenarios: unconfiguredFitnessScenarios(tagged, fitnessChecks),
  };
}
