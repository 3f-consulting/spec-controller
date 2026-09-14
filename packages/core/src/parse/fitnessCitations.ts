/**
 * THE CITATION SEAM'S SURVIVING ROUTE — a consumer's own CI step states the code of the configured
 * row it answers, and this reads that row back as what the run cites.
 *
 * THE TWO-HOP REGISTRY ROUTE THIS FILE ONCE ALSO HELD IS RETIRED (3F-3161, @SCN-LNT-017 — the last
 * registry-`scn` scenario: a registry entry naming a scenario that carries a different
 * characteristic cited nothing, and no scenario is left needing that resolution at all).
 * The retired registry module (hop 1, script handle → bare check tag) and this module's own
 * `fitnessCitations` / `citationOfScript` (hop 2, bare check tag → the corpus's `@SCN`) went with
 * it. Every check now either states its own row's code on its CI step, or is a converted
 * `@fitness` row read through `domain/fitnessChecks` directly. `citationOfCitedRow` — the `id:`
 * route (@SCN-LNT-031) — is the whole of what is left.
 *
 * NOT A HOP, AND THE DIFFERENCE IS WHERE IT STARTS. The retired hops resolved a runnable script
 * HANDLE into a scenario, because a handle does not know what it is for. An `id:` is not a handle:
 * it is the consumer SAYING which row this check answers — a citation, never a declaration — so
 * there is nothing to resolve. The row keyed by that code carries the characteristic, and both
 * terms come off one configured row rather than one being recovered from the other.
 *
 * IT REFINES, IT DOES NOT MANUFACTURE (@SCN-LNT-031, and 3F-3261's rule kept whole). A code no
 * configured row answers returns `null` rather than a citation half-assembled from the handle that
 * ran: an `id:` names a ROW and never a characteristic, and reaching for the script's name for the
 * missing half is the name-match this axis retired, in a new spelling. A step carrying no code at
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
 * WHAT A RUN CITES — both terms the seam resolved, not just the far one.
 *
 * The `@SCN` says WHICH ROW the credit posts to; the bare check tag says WHICH OBLIGATION on that
 * row it answers. Both are needed, because neither is unique on its own: a row may carry more than
 * one bare check tag, so two runs can honestly cite the same `@SCN` (@SCN-LNT-012), and answering
 * by `@SCN` alone hands the first credit found to every fitness obligation the row raises.
 *
 * THE TAG IS THE OBSERVATION'S OWN CHARACTERISTIC, which is why it is carried rather than looked up
 * again downstream. The obligation names the BARE tag its stepless scenario carries (`typecheck`);
 * the run knows only the RUNNABLE HANDLE that invoked it (`lint:complexity`). Those are two
 * vocabularies by design, and comparing them is name-match in a new spelling — it agrees only where
 * the words happen to coincide, which is the single unprefixed check. Resolving the tag HERE, where
 * the registry is already in hand, is what lets the reconciler compare like with like.
 */
export interface ScriptCitation {
  /** The BARE check tag this handle runs (`complexity`) — the word an obligation names. */
  readonly checkTag: string;
  /** The `@SCN` of the fitness scenario carrying that check — the row the credit posts to. */
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
 * — so there is nothing to resolve. The row keyed by that code carries the characteristic, and both
 * terms come off one configured row rather than one being recovered from the other.
 *
 * IT REFINES, IT DOES NOT MANUFACTURE (@SCN-LNT-031, and 3F-3261's rule kept whole). A code no
 * configured row answers returns `null` rather than a citation half-assembled from the handle that
 * ran: an `id:` names a ROW and never a characteristic, and reaching for the script's name for the
 * missing half is the name-match this axis retired, in a new spelling. A step carrying no code at
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
  const row = fitnessChecks.get(scnId);
  return row === undefined ? null : { checkTag: row.characteristic, scnId };
}
