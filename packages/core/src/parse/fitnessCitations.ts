/**
 * THE CITATION SEAM'S SURVIVING ROUTE — a consumer's own CI step states the `@SCN` of the scenario
 * it answers, and this reads that code back as what the run cites.
 *
 * THE TWO-HOP REGISTRY ROUTE THIS FILE ONCE ALSO HELD IS RETIRED (3F-3161, @SCN-LNT-017 — the last
 * registry-`scn` scenario: a registry entry naming a scenario that carries a different
 * check word cited nothing, and no scenario is left needing that resolution at all).
 * The retired registry module (hop 1, script handle → bare check tag) and this module's own
 * `fitnessCitations` / `citationOfScript` (hop 2, bare check tag → the corpus's `@SCN`) went with
 * it. `citationOfCitedRow` — the `id:` route (@SCN-LNT-031) — is the whole of what is left, and
 * since 3F-3582 it resolves the code against NOTHING: the manifest list it used to be checked
 * against is retired, so the `@SCN` a step states IS the citation.
 *
 * NOT A HOP, AND THE DIFFERENCE IS WHERE IT STARTS. The retired hops resolved a runnable script
 * HANDLE into a scenario, because a handle does not know what it is for. An `id:` is not a handle:
 * it is the consumer SAYING which scenario this check answers — a citation, never a declaration —
 * so there is nothing to resolve, and since 3F-3582 nothing is consulted at all.
 *
 * IT REFINES, IT DOES NOT MANUFACTURE (@SCN-LNT-031, and 3F-3261's rule kept whole). A step
 * carrying no `id:` returns `null` rather than a citation half-assembled from the handle that ran:
 * reaching for the script's name when the step states no code is the name-match this axis retired,
 * in a new spelling. The target has said nothing about that check, so its run cites nothing and
 * posts to suspense, which is the state a consumer starts in.
 *
 * AN `id:` THAT IS NOT AN `@SCN` CITES NOTHING EITHER, and that is the whole of what is checked
 * (3F-3582). Consumers put `id:` on steps for their own reasons — `counter`, `meta`, a step another
 * step's `if:` reads — and those are not citations; a rule taking every id would post each of them
 * to a phantom scenario and fill a consumer's report with rows about their own plumbing. What it
 * does NOT check is whether any scenario CARRIES the code: a code no scenario carries is a phantom
 * (@SCN-LNT-009), which is canon's answer rather than silence.
 *
 * BARED ON THE WAY IN, because a manifest's `scn` is stored bare and a workflow is hand-authored:
 * the one spelling rule this repository has (`lib/bareTerm`) is what keeps a code written with a
 * sigil or a stray space from being looked up under a key no row is filed at.
 */

import { bareTerm } from "../lib/bareTerm.js";
// THE ONE BARE-@SCN PATTERN, read from the corpus reader beside it rather than restated
// (@SCN-TRM-001). A second copy here would agree with it by coincidence, and what this decides is
// whether a step's `id:` is a citation at all. The BARE form, because `bareTerm` has already
// stripped one sigil: a doubled sigil bares to `@SCN-…` and is a different spelling, not this one.
import { SCN_CODE } from "./scenarios.js";

/**
 * WHAT A RUN CITES — the `@SCN` its step states, which is the row the credit posts to and the one
 * fitness obligation on it that the credit answers.
 *
 * ONE TERM SINCE 3F-3525. A citation once also carried the characteristic the row named, because
 * a row could raise more than one fitness obligation and the word said which one a run answered.
 * One `@fitness` scenario is one check now, so the `@SCN` is the whole address.
 */
export interface ScriptCitation {
  /** The `@SCN` the run's step states — the row the credit posts to, real or phantom. */
  readonly scnId: string;
}

/**
 * THE CONSUMER'S OWN CITATION — the `@SCN` written on a CI check step, read back as what that
 * step's run cites.
 *
 * NOT A HOP, AND THE DIFFERENCE IS WHERE IT STARTS — the same point the file's own docblock makes,
 * repeated here because this function is where it is proved. The retired hops resolved a runnable
 * script HANDLE into a scenario, because a handle does not know what it is for. An `id:` is not a
 * handle: it is the consumer SAYING which scenario this check answers — a citation, never a
 * declaration — so there is nothing to resolve: the code IS the citation.
 *
 * IT REFINES, IT DOES NOT MANUFACTURE (@SCN-LNT-031, and 3F-3261's rule kept whole). A step
 * carrying no `id:` returns `null` rather than a citation half-assembled from the handle that ran:
 * reaching for the script's name when the step states no code is the name-match this axis retired,
 * in a new spelling. The target has said nothing about that check, so its run cites nothing and
 * posts to suspense, which is the state a consumer starts in.
 *
 * AN `id:` THAT IS NOT AN `@SCN` CITES NOTHING EITHER, and that is the whole of what is checked
 * (3F-3582). Consumers put `id:` on steps for their own reasons — `counter`, `meta`, a step another
 * step's `if:` reads — and those are not citations; a rule taking every id would post each of them
 * to a phantom scenario and fill a consumer's report with rows about their own plumbing. What it
 * does NOT check is whether any scenario CARRIES the code: a code no scenario carries is a phantom
 * (@SCN-LNT-009), which is canon's answer rather than silence.
 *
 * BARED ON THE WAY IN, because a manifest's `scn` is stored bare and a workflow is hand-authored:
 * the one spelling rule this repository has (`lib/bareTerm`) is what keeps a code written with a
 * sigil or a stray space from being looked up under a key no row is filed at.
 */
export function citationOfCitedRow(citedScn: string | undefined): ScriptCitation | null {
  if (citedScn === undefined) return null;
  const scnId = bareTerm(citedScn);
  return SCN_CODE.test(scnId) ? { scnId } : null;
}
