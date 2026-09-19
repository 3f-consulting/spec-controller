/**
 * THE CITATION SEAM'S SURVIVING ROUTE — a consumer's own CI step states the code of the configured
 * row it answers, and this reads that row back as what the run cites.
 *
 * THE TWO-HOP REGISTRY ROUTE THIS FILE ONCE ALSO HELD IS RETIRED (3F-3161, @SCN-LNT-017 — the last
 * registry-`scn` scenario: a registry entry naming a scenario that carries a different
 * check word cited nothing, and no scenario is left needing that resolution at all).
 * The retired registry module (hop 1, script handle → bare check tag) and this module's own
 * `fitnessCitations` / `citationOfScript` (hop 2, bare check tag → the corpus's `@SCN`) went with
 * it. Every check now either states its own row's code on its CI step, or is a converted
 * `@fitness` row read through `domain/fitnessChecks` directly. `citationOfCitedRow` — the `id:`
 * route (@SCN-LNT-031) — is the whole of what is left.
 *
 * NOT A HOP, AND THE DIFFERENCE IS WHERE IT STARTS. The retired hops resolved a runnable script
 * HANDLE into a scenario, because a handle does not know what it is for. An `id:` is not a handle:
 * it is the consumer SAYING which row this check answers — a citation, never a declaration — so
 * there is nothing to resolve: the code IS the citation, and the row keyed by it is the
 * consumer's declaration that the code names a configured check.
 *
 * IT REFINES, IT DOES NOT MANUFACTURE (@SCN-LNT-031, and 3F-3261's rule kept whole). A code no
 * configured row answers returns `null` rather than a citation half-assembled from the handle that
 * ran: an `id:` names a ROW, and reaching for the script's name when it names none is the
 * name-match this axis retired, in a new spelling. A step carrying no code at
 * all is the same answer for the same reason — the target has said nothing about that check, so its
 * run cites nothing and posts to suspense, which is the state a consumer starts in.
 *
 * BARED ON THE WAY IN, because a manifest's `scn` is stored bare and a workflow is hand-authored:
 * the one spelling rule this repository has (`lib/bareTerm`) is what keeps a code written with a
 * sigil or a stray space from being looked up under a key no row is filed at.
 */

import type { FitnessCheckIndex } from "../domain/fitnessChecks.js";
import { bareTerm } from "../lib/bareTerm.js";

/**
 * WHAT A RUN CITES — the `@SCN` of the configured row its step's code names, which is the row the
 * credit posts to and the one fitness obligation on it that the credit answers.
 *
 * ONE TERM SINCE 3F-3525. A citation once also carried the characteristic the row named, because
 * a row could raise more than one fitness obligation and the word said which one a run answered.
 * One `@fitness` scenario is one check now, so the `@SCN` is the whole address.
 */
export interface ScriptCitation {
  /** The `@SCN` of the configured row the run's step names — the row the credit posts to. */
  readonly scnId: string;
}

/**
 * THE CONSUMER'S OWN CITATION — the configured row a code written on a CI check step names, read
 * back as what that step's run cites.
 *
 * NOT A HOP, AND THE DIFFERENCE IS WHERE IT STARTS — the same point the file's own docblock makes,
 * repeated here because this function is where it is proved. The retired hops resolved a runnable
 * script HANDLE into a scenario, because a handle does not know what it is for. An `id:` is not a
 * handle: it is the consumer SAYING which row this check answers — a citation, never a declaration
 * — so there is nothing to resolve: the code IS the citation, and the row keyed by it is the
 * consumer's declaration that the code names a configured check.
 *
 * IT REFINES, IT DOES NOT MANUFACTURE (@SCN-LNT-031, and 3F-3261's rule kept whole). A code no
 * configured row answers returns `null` rather than a citation half-assembled from the handle that
 * ran: an `id:` names a ROW, and reaching for the script's name when it names none is the
 * name-match this axis retired, in a new spelling. A step carrying no code at
 * all is the same answer for the same reason — the target has said nothing about that check, so its
 * run cites nothing and posts to suspense, which is the state a consumer starts in.
 *
 * BARED ON THE WAY IN, because a manifest's `scn` is stored bare and a workflow is hand-authored:
 * the one spelling rule this repository has (`lib/bareTerm`) is what keeps a code written with a
 * sigil or a stray space from being looked up under a key no row is filed at.
 */
export function citationOfCitedRow(
  citedScn: string | undefined,
  fitnessChecks: FitnessCheckIndex
): ScriptCitation | null {
  if (citedScn === undefined) return null;
  const scnId = bareTerm(citedScn);
  return fitnessChecks.has(scnId) ? { scnId } : null;
}
