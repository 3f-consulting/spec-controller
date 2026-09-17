/**
 * THE MEASURED ITEM'S WHERE-TO-FIX (@SCN-CIP-008) — the two numbers a measured reconciling item
 * carries into the report: the check, what was measured, and the bar it was held to.
 *
 * AND WHICH SIDE OF THAT BAR IT HAD TO BE ON (@SCN-MUT-006). "91.4 against 91.87" reads as a
 * comfortable pass to a reader who has met this axis as a ceiling and as a red to one who has met
 * it as a floor, so the comparison is named in words beside the number. Both directions, because
 * naming one and leaving the other bare leaves the second reader in the ambiguity the first was
 * rescued from. It is read off the obligation and never off the check tag: which side satisfies is
 * half of what the bar says, and an engine that knew `mutation` to be a floor would be holding the
 * roster of tag meanings @SCN-LNT-005 puts in the target's hands.
 *
 * WHY THIS IS NOT A CREDIT-SIDE SUFFIX. Every other where-to-fix on a reconciling item belongs to
 * an unmatched CREDIT — a test file's locator, or the handle of a check nobody named. A measured
 * item's belongs to the PAIR: a reader needs the bar and the number together, and on a `missing`
 * row there is no credit at all, only the bar the suite was supposed to meet. Rendering nothing
 * there would leave the loudest row on the ledger the least informative one.
 *
 * NO BAR SAYS SO IN WORDS, and names no comparison — there is no number to name a side of.
 * Rendered as a blank a reader has to interpret, the fault @SCN-CIP-002 makes loud on the DATA goes
 * quiet again on the PAGE; rendered as a zero it reads as a bar OF zero, which is a different and
 * much louder claim than nobody having set one.
 *
 * Its own module rather than a further function in `markdown.ts`, which sits at a `max-lines`
 * exception — and an exception excuses existing debt, never headroom.
 */

import { isMeasuredObservation } from "../model.js";
import type { ScenarioReconciliation } from "../model.js";

/** The parenthesised where-to-fix for a measured item, or "" for any other item. */
export function measuredSuffix(
  item: ScenarioReconciliation["reconcilingItems"][number]
): string {
  const obligation = item.evidenceObligation;
  if (obligation?.measured !== true) return "";
  const check = item.staticCheck ?? "";
  const bar =
    obligation.threshold === undefined
      ? "no threshold configured"
      : `${obligation.atLeast === true ? "at least" : "at most"} ${obligation.threshold}`;
  const observation = item.evidenceObservation;
  const measured =
    observation !== undefined && isMeasuredObservation(observation)
      ? `measured ${observation.measured} against `
      : "";
  return ` (${check}: ${measured}${bar})`;
}
