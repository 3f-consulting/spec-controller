/**
 * THE CITATION SEAM — the `@SCN` a fitness check's run cites, resolved in two hops.
 *
 *     script handle  ──registry──▶  bare check tag  ──corpus──▶  the fitness scenario's @SCN
 *     lint:complexity              complexity                   SCN-CPX-0NN
 *
 * Hop 1 is `domain/checkRegistry`'; hop 2 is here, and it reads the CORPUS. That direction is the
 * point: the feature file stays the one place a check's scenario is named, so moving a fitness
 * scenario or renumbering it moves the citation with it. A second roster of `check → @SCN` pairs
 * held anywhere else would be a copy that agrees until it doesn't, and the disagreement would
 * surface as a check posting to a row it does not belong to.
 *
 * WHAT THIS DOES NOT DECIDE. Whether a scenario is stepless, and whether a bare tag RAISES an
 * Evidence Obligation, are the shape and obligation rules (@SCN-STG-005, @SCN-LNT-006). This
 * answers one question only — which scenario CARRIES this check — so the two readings cannot
 * disagree about steplessness by each having an opinion about it.
 */

import type { CheckRegistry } from "../domain/checkRegistry.js";
import { checkTagOfScript } from "../domain/checkRegistry.js";
import type { TaggedScenario } from "./scenarios.js";

/** Bare check tag → the `@SCN` of the fitness scenario carrying it. */
export type FitnessCitations = ReadonlyMap<string, string>;

/**
 * HOP 2 — read the corpus for the scenario carrying each registered check tag.
 *
 * FIRST IN CORPUS ORDER WINS, and the runners-up are dropped rather than merged. Two scenarios
 * tagged with one bare check is a corpus fault, not a shape this seam smooths over: one run is one
 * credit, so it can cite one `@SCN`, and the second scenario's obligation is left with no
 * observation — it reconciles `missing`, out loud (the LNT-011 ruling, 2026-08-09). Returning both
 * would have to invent a rule for which one the credit means, and the honest answer is that the
 * corpus has not said.
 *
 * A registered check no scenario carries is simply ABSENT from the map — the uncited-check case,
 * whose whole value is that it reaches no row and surfaces in suspense.
 */
export function fitnessCitations(
  scenarios: readonly TaggedScenario[],
  checkTags: readonly string[]
): FitnessCitations {
  const known = new Set(checkTags);
  const citations = new Map<string, string>();
  for (const scenario of scenarios) {
    for (const tag of scenario.tags) {
      if (known.has(tag) && !citations.has(tag)) citations.set(tag, scenario.scnId);
    }
  }
  return citations;
}

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
 * BOTH HOPS — what a run of this script handle cites, or `null` when the seam does not reach a
 * scenario (the handle is unregistered, or no scenario carries its check).
 *
 * The two `null`s are deliberately not told apart here. They are different faults with different
 * remedies — register the handle, or write the fitness scenario — but they are the same fact at
 * this seam: the observation cites nothing, so it posts to suspense, and suspense is where the
 * distinction is drawn against the running-check stream rather than guessed at from a lookup miss.
 *
 * ALL OR NOTHING, and that is deliberate too. A handle whose tag resolves but whose check no
 * scenario carries returns `null` rather than a half-citation, so an uncited observation carries no
 * citation keys at all and its JSON stays byte-identical to what it was before the tag was added.
 */
export function citationOfScript(
  script: string,
  registry: CheckRegistry,
  citations: FitnessCitations
): ScriptCitation | null {
  const checkTag = checkTagOfScript(registry, script);
  if (checkTag === null) return null;
  const scnId = citations.get(checkTag);
  return scnId === undefined ? null : { checkTag, scnId };
}
