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
import { measuredCheckTags, type ThresholdRegistry } from "../domain/thresholds.js";
import {
  citationOfScript,
  fitnessCitations,
  type FitnessCitations,
  type ScriptCitation,
} from "./fitnessCitations.js";
import { parseScenarios, parseTaggedScenarios } from "./scenarios.js";
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
  thresholds: ThresholdRegistry
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
    parseScenarios(source, deferralTags, obligationTags, thresholds)
  );
  const citations = fitnessCitations(
    sources.flatMap((source) => parseTaggedScenarios(source)),
    checkTags
  );
  return {
    scenarios,
    checkHandles: observedCheckHandles(registry, citations),
    citedScn: (script) => citationOfScript(script, registry, citations),
  };
}
