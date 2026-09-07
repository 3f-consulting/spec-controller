/**
 * The TARGET's feature corpus read into the three readings one reconciliation needs — moved here
 * from the app's ingest edge (3F-3088).
 *
 * WHY IT LIVES IN THE ENGINE. Every line of it is a pure function of sources somebody else already
 * read off disk: the obligation rule, the tag union and the citation hop are `parseScenarios`,
 * `measuredCheckTags` and `fitnessCitations`, all three core's own. Sitting at the app edge it was
 * the reason a PUBLISHED module imported core's unpublished `/internal` subpath for five symbols —
 * the fault 3F-3086 repairs. One line made it impure and it was the only one: the feature
 * discovery, which now happens at the edge and arrives as `sources`.
 */

import { registeredCheckTags, type CheckRegistry } from "../domain/checkRegistry.js";
import type { FitnessCheckIndex } from "../domain/fitnessChecks.js";
import { measuredCheckTags, type ThresholdIndex } from "../domain/thresholds.js";
import {
  citationOfScript,
  fitnessCitations,
  type FitnessCitations,
  type ScriptCitation,
} from "./fitnessCitations.js";
import { parseScenarios, parseTaggedScenarios, unconfiguredFitnessScenarios } from "./scenarios.js";
import type { Scenario } from "../model.js";

/**
 * The runnable script handles the OBLIGATION-side observer is asked about — the reader that carries
 * exists-but-unwired, and so the only one able to produce a watermelon.
 *
 * THE REGISTRY'S INVERSE, NARROWED BY THE CORPUS. A fitness obligation names the BARE check tag its
 * stepless scenario carries, which is not a script and would be observed as one nobody wrote; the
 * runnable handle for it is what the registry maps onto that tag. A handle joins only when the
 * corpus actually carries a scenario for its check, because a registered check nobody wrote a
 * scenario for is the UNCITED case — it must reach no row and surface in suspense, not be asked
 * about here as though something obliged it.
 *
 * A SECOND SOURCE STOOD HERE and is gone with the by-name route (3F-2590): the corpus's named
 * HANDLES, from the retired `@lint=<handle>` form. That form raises no obligation at all now
 * (@SCN-LNT-007), so the set it contributed is empty by construction — and every bare check a
 * fitness obligation names is a REGISTERED tag, which the old filter dropped anyway.
 *
 * It doubles as the no-double-observe key: the running-check stream drops whatever appears here,
 * because a check this reader covers already carries the authoritative exists / enforced detail.
 */
function observedCheckHandles(
  registry: CheckRegistry,
  citations: FitnessCitations
): Set<string> {
  const handles = new Set<string>();
  for (const [handle, entry] of registry) {
    if (citations.has(entry.check)) handles.add(handle);
  }
  return handles;
}

/**
 * The target's feature corpus as ONE run reads it — the obligations it raises, the runnable check
 * handles those obligations reach, and the `@SCN` a run of any handle cites.
 *
 * THE THREE ARE ONE READING, which is why they are produced together. All three are derived from
 * the same bytes and the same registry, and the fault they exist to foreclose is precisely their
 * disagreeing: a citation resolved against a corpus the ledger was not built from names a row
 * nobody wrote (@SCN-LNT-009), and a handle set derived from a second discovery observes checks the
 * obligations never asked about. Returning them separately would leave a caller free to assemble
 * them from different reads.
 *
 * EVERY INPUT IS THE TARGET'S (@SCN-LNT-005). `registry` came from the target's manifest and the
 * sources from the target's features directory, so a bare check tag means what that target says it
 * means and the scenario carrying it is one that target wrote.
 */
export interface TargetCorpus {
  /** The `@SCN`-carrying scenarios, with their evidence obligations raised. */
  scenarios: Scenario[];
  /** The runnable script handles the obligation-side observer is asked about. */
  checkHandles: ReadonlySet<string>;
  /**
   * What a run of this script handle cites — the bare check tag it IS and the `@SCN` carrying that
   * check — or `null` where the seam reaches none. Both terms, because the `@SCN` picks the ROW and
   * the tag picks which of that row's fitness obligations the credit answers (@SCN-LNT-012).
   */
  citedScn: (script: string) => ScriptCitation | null;
  /**
   * The scenarios ON the fitness axis that no configured row NAMES (@SCN-LNT-020) — the corpus's
   * half-converted checks, in corpus order.
   *
   * It belongs with the other three because it is the same reading: the obligation rule raises
   * nothing for such a scenario, and this says WHICH ones. Produced here, where the corpus walk and
   * the configured rows are both in hand, so the naming and the raising cannot be taken from
   * different reads — the same guarantee the citation hop is composed here for.
   */
  unconfiguredFitnessScenarios: readonly string[];
}

/**
 * THE SOURCES ARRIVE READ, AND THAT IS THE WHOLE OF WHAT MOVED. The edge discovers the target's
 * feature files and reads them ONCE, so the two readings a citing run needs — the obligations, and
 * the corpus hop's `check tag → @SCN` — are still taken from the same bytes. Two discoveries could
 * disagree about the corpus, and a citation resolved against a corpus the ledger was not built from
 * is exactly the phantom-row fault (@SCN-LNT-009); passing one array preserves that guarantee where
 * a features directory would have re-opened the question inside the engine.
 */
export function readTargetCorpus(
  sources: readonly string[],
  deferralTags: readonly string[],
  registry: CheckRegistry,
  thresholds: ThresholdIndex,
  /**
   * The target's CONFIGURED ROWS (@SCN-LNT-018) — the CONVERTED route's half of the debit side. It
   * reaches `parseScenarios` and nothing else here: a converted check is never discovered as a
   * script handle, so it has no business in `fitnessCitations`, which answers "which scenario does
   * a run of this HANDLE cite". Its credit arrives already citing, off the scenario's own tag line.
   */
  fitnessChecks: FitnessCheckIndex
): TargetCorpus {
  const checkTags = registeredCheckTags(registry);
  // THE OBLIGATION-RAISING TAG SET IS THE UNION (@SCN-CIP-001); the CITATION hop below is the
  // registry's alone. A measured check has no runnable script handle — nothing invokes
  // `ci-run-time` — so it can never be registered, and a corpus read against the registry's tags
  // alone would raise nothing for it. It equally has no business in `fitnessCitations`, which
  // answers "which scenario does a run of this HANDLE cite": a measured credit arrives already
  // citing, because canon puts the check-to-scenario mapping in the runner that measures.
  const obligationTags = [...new Set([...checkTags, ...measuredCheckTags(thresholds)])];
  const scenarios = sources.flatMap((source) =>
    parseScenarios(source, deferralTags, obligationTags, thresholds, fitnessChecks)
  );
  // ONE WALK, TWO READERS. The citation hop and the unconfigured-scenario reading both ask which
  // scenario carries what, so they are handed the same tag walk rather than each taking its own —
  // two walks would be free to disagree about which scenario they are looking at.
  const tagged = sources.flatMap((source) => parseTaggedScenarios(source));
  const citations = fitnessCitations(tagged, checkTags);
  return {
    scenarios,
    checkHandles: observedCheckHandles(registry, citations),
    citedScn: (script) => citationOfScript(script, registry, citations),
    unconfiguredFitnessScenarios: unconfiguredFitnessScenarios(tagged, fitnessChecks),
  };
}
