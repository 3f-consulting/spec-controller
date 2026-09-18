/**
 * THE FITNESS CHECK ROWS — what a CONVERTED check says about itself, keyed by the `@SCN` it is
 * about.
 *
 *     @SCN          the row                       what the corpus then reads
 *     SCN-FIT-001   { characteristic: complexity } a @fitness scenario owes `complexity`
 *
 * THE TAG NAMES THE AXIS AND THE ROW NAMES THE SUBJECT. A bare characteristic tag answered two
 * questions at once — how a claim is proved, and what it is about — and the tier tags answer only
 * the first. So a converted scenario carries `@fitness` alone, and the characteristic moves here,
 * where it stays a first-class word the roll-up still groups by.
 *
 * NOT A SECOND OBLIGATION SHAPE. What a `@fitness` scenario raises is the same
 * `{ qualityCheck: "lint", staticCheck: <characteristic> }` a registered bare tag raises today, so
 * the pair key, the reconciler's static arm and the report's roll-up are all untouched. What
 * changed is only where the word came from.
 *
 * NOT THE (RETIRED) CHECK REGISTRY, AND THE DIFFERENCE IS THE SEAM THIS RETIRES. That registry
 * answered "which check is this runnable script handle", because a handle does not know what it
 * is for; the `@SCN`
 * is then resolved through the corpus, a second hop. A converted check is never discovered as a
 * handle — it is a scenario that ran, carrying its own tag line — so the `@SCN` is the KEY here
 * rather than something a lookup has to recover.
 *
 * PURE AND INJECTED — the rows arrive as data, read from the TARGET's own manifest at the app edge
 * (`specController.fitnessChecks`), the stance the retired `thresholdsOf` took. A target that
 * configures nothing raises nothing, so the reading is inert on a corpus
 * nobody has converted.
 */

import { bareTerm } from "../lib/bareTerm.js";

/**
 * ONE CONFIGURED ROW as the obligation rule reads it.
 *
 * The `scn` a row states is not a member here: it is this index's KEY, so a row cannot name one
 * scenario and be filed under another. The command a row states is not a member either — it is the
 * COMMAND half of the row and nothing on the debit side reads it. Every row is credited by its own
 * step's outcome in the run's record, so the characteristic is the whole of what the ledger reads.
 */
export interface FitnessCheck {
  /** The bare characteristic this check asserts (`complexity`). */
  readonly characteristic: string;
}

/** The rows as the rule reads them — bare `@SCN` → the row naming that scenario's check. */
export type FitnessCheckIndex = ReadonlyMap<string, FitnessCheck>;

/**
 * One entry as a manifest spells it, read into the pair a lookup can use, or `null` where it names
 * nothing one can.
 *
 * BOTH TERMS ARE STORED BARE. A manifest written by hand will sooner or later spell an `@SCN` — and
 * a characteristic — the way a feature file does, and both lookups match bare; stripping once here
 * rather than at every call site is the stance the retired `thresholdsOf` took.
 *
 * A ROW NAMING NEITHER TERM IS DROPPED WHOLE, never half-read. The two terms make one claim
 * together — THIS scenario asserts THIS characteristic — so a row missing either says nothing a
 * lookup can act on, and there is no lenient reading that does not invent one of them.
 */
function fitnessCheckOf(entry: unknown): readonly [string, FitnessCheck] | null {
  // THE TWO STRING READS ARE THE WHOLE GUARD, and a shape test ahead of them would add no teeth: a
  // string, a number, a list and a function all answer `undefined` here, so each is refused by the
  // read that matters rather than by a clause restating it. The optional chain is what covers the
  // two values a property read would throw on.
  const named = entry as { scn?: unknown; characteristic?: unknown } | null | undefined;
  if (typeof named?.scn !== "string" || typeof named.characteristic !== "string") return null;
  const scnId = bareTerm(named.scn);
  const characteristic = bareTerm(named.characteristic);
  if (scnId === "" || characteristic === "") return null;
  return [scnId, { characteristic }];
}

/**
 * Build the index from the rows a manifest holds.
 *
 * A LIST, NOT A BLOCK KEYED BY `@SCN`, and the shape is the row's own argument: a row is what a
 * check says about ITSELF — its `@SCN`, its characteristic, its command — so no one of those three
 * is promoted above the others by being the key somebody has to write it under. The `@SCN` becomes
 * the key HERE, where a lookup needs one.
 *
 * A MALFORMED ROW IS DROPPED, NOT TRUSTED AND NOT THROWN ON — the defensive stance the whole
 * `specController.*` family takes. Config is data from outside, and a reader that throws on a typo
 * turns one bad character into a run that produces no verdict at all, which is loud nowhere; a
 * dropped row leaves its scenario naming no characteristic, which the corpus reports.
 */
export function fitnessChecksOf(entries: unknown): FitnessCheckIndex {
  if (!Array.isArray(entries)) return new Map();
  const index = new Map<string, FitnessCheck>();
  for (const entry of entries as readonly unknown[]) {
    const row = fitnessCheckOf(entry);
    if (row !== null) index.set(row[0], row[1]);
  }
  return index;
}

/**
 * ONE CONFIGURED ROW THE TARGET'S CORPUS CARRIES NO SCENARIO FOR (3F-3472) — a check the manifest
 * declares and nothing in the corpus specifies.
 *
 * THE MIRROR OF `unconfiguredFitnessScenarios`, AND THE HALF THE BOOKS COULD NOT SEE. That one
 * reads a `@fitness` scenario no row names; this reads a row no scenario names. The asymmetry
 * between what each EARNS is the two facts' own: a scenario naming no row names no characteristic,
 * so there is nothing to put on the books and the census says who — a row names one, so there IS a
 * debit, and `features/fitness-checks.feature` promises it as "an Evidence Obligation nothing
 * observed".
 *
 * IT CARRIES THE CHARACTERISTIC BECAUSE THE OBLIGATION IT RAISES NAMES ONE. The `@SCN` alone would
 * leave the reader of this reading to go back to the index for the other half, which is the second
 * read `readTargetCorpus` composes its readings together to foreclose.
 */
export interface UnspecifiedFitnessRow {
  /** The `@SCN` the row states, which no scenario in the target's corpus carries. */
  readonly scnId: string;
  /** The bare characteristic the row asserts (`complexity`) — what its debit is owed at. */
  readonly characteristic: string;
}
