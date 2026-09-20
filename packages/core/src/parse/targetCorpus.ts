/**
 * The TARGET's feature corpus read into the readings one reconciliation needs — moved here from
 * the app's ingest edge (3F-3088).
 *
 * WHY IT LIVES IN THE ENGINE. Every line of it is a pure function of sources somebody else already
 * read off disk: the obligation rule is `parseScenarios`, core's own. Sitting at the app edge it
 * was the reason a PUBLISHED module imported core's unpublished `/internal` subpath for five
 * symbols — the fault 3F-3086 repairs. One line made it impure and it was the only one: the feature discovery, which now
 * happens at the edge and arrives as `sources`.
 *
 * THE REGISTRY-KEYED READING THIS FILE ONCE ALSO PRODUCED — `checkHandles` and `citedScn`, the
 * obligation-side observer's feed — RETIRED WITH THE REGISTRY ITSELF (3F-3161, @SCN-LNT-017, the
 * last registry-`scn` scenario). A check now states its own scenario's `@SCN` on its CI step
 * (`citedRow`, below), and the scenario's `@fitness` tag raises the obligation (3F-3582); there is
 * no second discovery left to key a handle set off, and no manifest reading either.
 */

import { citationOfCitedRow, type ScriptCitation } from "./fitnessCitations.js";
import {
  parseScenarios,
  parseTaggedScenarios,
} from "./scenarios.js";
import type { Scenario } from "../model.js";

/**
 * The target's feature corpus as ONE run reads it — the obligations it raises, and the `@SCN` a
 * run whose CI step states a code cites.
 *
 * THE READINGS ARE ONE, which is why they are produced together. Both are derived from the same
 * bytes, and the fault they exist to foreclose is precisely their disagreeing: a citation resolved
 * against a corpus the ledger was not built from names a row nobody wrote (@SCN-LNT-009).
 * Returning them separately would leave a caller free to assemble them from different reads.
 *
 * EVERY INPUT IS THE TARGET'S (@SCN-LNT-005). The sources come from the target's features
 * directory, so the scenario carrying an `@SCN` is one that target wrote. Nothing of the target's
 * MANIFEST reaches this reading any more (3F-3582): a `@fitness` scenario raises its obligation
 * from its own tag.
 */
export interface TargetCorpus {
  /** The `@SCN`-carrying scenarios, with their evidence obligations raised. */
  scenarios: Scenario[];
  /**
   * What a run whose CI step STATES a code cites — the configured row that code names, read for
   * the row a step's `id:` names (@SCN-LNT-031).
   *
   * NO CODE IS THE SAME ANSWER AS AN UNANSWERED ONE — `null`, the run cites nothing, and it posts
   * to suspense. That is the state a consumer starts in, and this seam does not narrow it.
   */
  citedRow: (citedScn: string | undefined) => ScriptCitation | null;
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
  deferralTags: readonly string[]
): TargetCorpus {
  // NOTHING BUT THE AXIS TAG RAISES A FITNESS OBLIGATION ON A TARGET'S CORPUS. The registered half
  // of the union retired with the registry (3F-3161), the measured half with the measured axis
  // (3F-3516), `parseScenarios`' check-tag parameter with them (3F-3561), and the manifest list
  // last (3F-3582): a fitness obligation is raised by the axis word and by nothing else.
  return {
    scenarios: sources.flatMap((source) => parseScenarios(source, deferralTags)),
    citedRow: (citedScn) => citationOfCitedRow(citedScn),
  };
}
