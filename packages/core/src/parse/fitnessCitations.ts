/**
 * THE CITATION SEAM — the `@SCN` a fitness check's run cites, resolved in two hops.
 *
 *     script handle  ──registry──▶  bare check tag  ──corpus──▶  the fitness scenario's @SCN
 *     lint:complexity              complexity                   SCN-CPX-0NN
 *
 * Hop 1 is `domain/checkRegistry`'; hop 2 is here, and it reads the CORPUS. That direction is the
 * point: the feature file stays the one place a check's scenario is named, so moving a fitness
 * scenario or renumbering it moves the citation with it. A registry entry may NAME the `@SCN` it
 * credits (@SCN-LNT-015) — canon's runner-side join for a static check, whose only identifier is a
 * script handle — but that never makes it a second roster this hop defers to: the name is checked
 * against the carriers read here, and an `@SCN` the corpus does not carry with that characteristic
 * cites nothing rather than being smoothed into a near-match (@SCN-LNT-016, @SCN-LNT-017). The
 * register discriminates; the corpus still decides.
 *
 * AND ONE CITATION NEEDS NO HOPS AT ALL (@SCN-LNT-031). A consumer who writes the code of the row
 * a check answers onto that check's own CI step has said which row it posts to, so the resolution
 * above has nothing left to do: `citationOfCitedRow` reads the configured row that code names and
 * takes both terms off it. Same seam, same two terms, a shorter route — and it is a route the
 * consumer opens, which is why it beats a derived citation where both are available.
 *
 * WHAT THIS DOES NOT DECIDE. Whether a scenario is stepless, and whether a bare tag RAISES an
 * Evidence Obligation, are the shape and obligation rules (@SCN-STG-005, @SCN-LNT-006). This
 * answers one question only — which scenario CARRIES this check — so the two readings cannot
 * disagree about steplessness by each having an opinion about it.
 */

import type { CheckRegistry } from "../domain/checkRegistry.js";
import type { FitnessCheckIndex } from "../domain/fitnessChecks.js";
import { bareTerm } from "../lib/bareTerm.js";
import type { TaggedScenario } from "./scenarios.js";

/** Bare check tag → the `@SCN` of every fitness scenario carrying it, in corpus order. */
export type FitnessCitations = ReadonlyMap<string, readonly string[]>;

/**
 * HOP 2 — read the corpus for EVERY scenario carrying each registered check tag, in corpus order.
 *
 * WHY EVERY CARRIER, AND NOT JUST THE FIRST. Canon asks one tag to name several scenarios — several
 * checks of one characteristic, told apart by `@SCN` — so the tag alone stops identifying a row and
 * the registry entry names it instead (@SCN-LNT-015). Answering "does the `@SCN` this entry names
 * carry this characteristic?" reads the corpus in the other direction, and there were two ways to
 * supply it: a second structure passed alongside, which grows `citationOfScript`'s arity, or this
 * hop carrying what it already walked past. It visits every carrier either way; keeping them costs
 * nothing and makes both readings fall out of ONE lookup, with no signature widened.
 *
 * FIRST IN CORPUS ORDER STILL WINS where an entry names no scenario — the CHOICE moved one function
 * along, to `citationOfScript`, and the ruling is unchanged (@SCN-LNT-008): one run is one credit,
 * so it cites one `@SCN`, and a runner-up left with no observation reconciles `missing`, out loud.
 * Order is therefore load-bearing here and is the corpus's own.
 *
 * A registered check no scenario carries is simply ABSENT from the map — the uncited-check case,
 * whose whole value is that it reaches no row and surfaces in suspense.
 */
export function fitnessCitations(
  scenarios: readonly TaggedScenario[],
  checkTags: readonly string[]
): FitnessCitations {
  const known = new Set(checkTags);
  const citations = new Map<string, string[]>();
  for (const scenario of scenarios) {
    for (const tag of scenario.tags) {
      if (!known.has(tag)) continue;
      const carriers = citations.get(tag) ?? [];
      if (!carriers.includes(scenario.scnId)) carriers.push(scenario.scnId);
      citations.set(tag, carriers);
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
  const entry = registry.get(script);
  if (entry === undefined) return null;
  const carriers = citations.get(entry.check) ?? [];
  // THE ENTRY'S OWN @SCN WHERE IT HAS ONE, the corpus's first carrier where it has none. The
  // `find` is a MEMBERSHIP test, not a lookup: an `@SCN` the corpus does not carry with this
  // characteristic is absent from these carriers however it is wrong — misspelt, renumbered, or
  // carrying a different characteristic — so it resolves to nothing and the citation is withheld
  // whole. No near-match branch, because a renumbered scenario must not green a row by resembling
  // one.
  const scnId = entry.scn === null ? carriers[0] : carriers.find((id) => id === entry.scn);
  return scnId === undefined ? null : { checkTag: entry.check, scnId };
}

/**
 * THE CONSUMER'S OWN CITATION — the configured row a code written on a CI check step names, read
 * back as what that step's run cites.
 *
 * NOT A THIRD HOP, AND THE DIFFERENCE IS WHERE IT STARTS. The two hops above resolve a runnable
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
