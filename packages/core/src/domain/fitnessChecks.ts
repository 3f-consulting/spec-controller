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
 * NOT `checkRegistry`, AND THE DIFFERENCE IS THE SEAM THIS RETIRES. That registry answers "which
 * check is this runnable script handle", because a handle does not know what it is for; the `@SCN`
 * is then resolved through the corpus, a second hop. A converted check is never discovered as a
 * handle — it is a scenario that ran, carrying its own tag line — so the `@SCN` is the KEY here
 * rather than something a lookup has to recover.
 *
 * PURE AND INJECTED — the rows arrive as data, read from the TARGET's own manifest at the app edge
 * (`specController.fitnessChecks`), the stance `checkRegistry` and the threshold index already
 * take. A target that configures nothing raises nothing, so the reading is inert on a corpus
 * nobody has converted.
 */

import { bareTerm } from "../lib/bareTerm.js";
import { barOf, type ThresholdBar } from "./thresholds.js";

/**
 * ONE CONFIGURED ROW as the obligation rule reads it.
 *
 * The `scn` a row states is not a member here: it is this index's KEY, so a row cannot name one
 * scenario and be filed under another. The command a row states is not a member either — it is the
 * COMMAND half of the row and nothing on the debit side reads it. The BAR is, because whether the
 * row names one is what says the check is measured (@SCN-LNT-019).
 *
 * AND SO IS THE ENDING BY WHICH THAT COMMAND SAYS `I EXAMINED NOTHING` (3F-3177). It is not the
 * command: it is the row's sentence about how the command SPEAKS, and the credit side has to ask
 * it, because a skip in the run's step record is honest exactly where the row named the ending that
 * produced it and incidental everywhere else. One field read by two sides belongs in the ONE
 * reading of the rows, beside the bar — a second copy elsewhere is two readers of one fact.
 */
export interface FitnessCheck {
  /** The bare characteristic this check asserts (`complexity`). */
  readonly characteristic: string;
  /**
   * The BAR this check's number is held to (@SCN-LNT-019), and the field whose PRESENCE says the
   * check is measured at all.
   *
   * THREE STATES, AND THE MIDDLE ONE IS THE POINT. Absent: the row named no bar key, so the check
   * is static — the discrimination `thresholdsOf` has always made, where a check with no entry is
   * already the static case. A bar: the row named one and it read. `null`: the row named one and
   * authored none this could read, which keeps the check MEASURED with nothing to hold it to —
   * `barOf`'s own way with an entry it cannot read, and the shape @SCN-CIP-002 exists to report.
   *
   * READ THROUGH `carriesBar`, NEVER BY REACHING FOR THIS FIELD, because both sides of the ledger
   * ask the same question of it and one spelling is what keeps their answers the same.
   */
  readonly bar?: ThresholdBar | null;
}

/**
 * THE ONE PREDICATE — does this row carry a bar (@SCN-LNT-019).
 *
 * The DEBIT asks it to decide whether to raise a measured obligation or a static one; the CREDIT
 * asks it to decide whether a step's outcome raises a credit at all, a measured row's credit
 * being its NUMBER. Two questions, one fact, and one spelling: two readers over this field would
 * eventually differ, and the row whose bar nothing can read — measured, with `null` beside it — is
 * exactly where they would differ first, producing an obligation with no credit or two credits for
 * one obligation.
 */
export function carriesBar(check: FitnessCheck): boolean {
  return check.bar !== undefined;
}

/** The rows as the rule reads them — bare `@SCN` → the row naming that scenario's check. */
export type FitnessCheckIndex = ReadonlyMap<string, FitnessCheck>;

/**
 * The two keys a row names its bar with. Either one makes the row MEASURED, whatever stands beside
 * it — the key is the target saying this check produces a number, and only the value can fail to
 * read.
 */
const BAR_DIRECTIONS = ["atLeast", "atMost"] as const;

/**
 * One entry as a manifest spells it, read into the pair a lookup can use, or `null` where it names
 * nothing one can.
 *
 * BOTH TERMS ARE STORED BARE. A manifest written by hand will sooner or later spell an `@SCN` — and
 * a characteristic — the way a feature file does, and both lookups match bare; stripping once here
 * rather than at every call site is the stance `checkRegistryOf` and `thresholdsOf` already take.
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
  // THE ROW'S SHAPE SAYS WHICH KIND OF CHECK IT IS — no type field, no second tag, no roster of
  // measured characteristics somebody has to keep in step with the rows. The bar is read by the
  // threshold index's OWN reader, handed the row whole: one grammar for `atLeast` / `atMost`, so a
  // converted row and a threshold entry cannot come to disagree about what a target wrote.
  const row = named as Record<string, unknown>;
  if (!BAR_DIRECTIONS.some((direction) => direction in row)) return [scnId, { characteristic }];
  return [scnId, { characteristic, bar: barOf(row) }];
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
