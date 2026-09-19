/**
 * THE FITNESS CHECK ROWS — the `@SCN`s a target's manifest declares as configured checks
 * (`specController.fitnessChecks`), each row carrying a scenario's `@SCN` and the command that is
 * the check.
 *
 *     @SCN          the row                              what the corpus then reads
 *     SCN-FIT-001   { scn: SCN-FIT-001, command: eslint } a @fitness scenario owes `fitness`
 *
 * ONE `@fitness` SCENARIO IS ONE CHECK (3F-3525). Its quality check is `fitness`, exactly as `unit`
 * is for a `@unit` scenario; the obligation is raised by the tag and keyed by the scenario's own
 * `@SCN`, and what the check is ABOUT is the scenario's title. So the row is read for the one
 * thing the ledger needs from it: that this `@SCN` is a configured check. A row once named a
 * characteristic, and the obligation was keyed by that word; the word is retired, and a row still
 * carrying it is named on the report as carrying a retired key (`parse/targetManifest.ts`).
 *
 * NOT THE (RETIRED) CHECK REGISTRY, AND THE DIFFERENCE IS THE SEAM THIS RETIRES. That registry
 * answered "which check is this runnable script handle", because a handle does not know what it
 * is for; the `@SCN` was then resolved through the corpus, a second hop. A converted check is
 * never discovered as a handle — it is a scenario that ran — so the `@SCN` is the KEY here rather
 * than something a lookup has to recover.
 *
 * PURE AND INJECTED — the rows arrive as data, read from the TARGET's own manifest at the app edge.
 * A target that configures nothing raises nothing, so the reading is inert on a corpus nobody has
 * converted.
 */

import { bareTerm } from "../lib/bareTerm.js";

/**
 * The rows as the rule reads them — the set of bare `@SCN`s a target configured as fitness checks.
 *
 * A SET, BECAUSE THE `@SCN` IS THE WHOLE OF WHAT THE LEDGER READS OFF A ROW. The command is the
 * row's other half and is the consumer's pipeline's business, not the ledger's; the characteristic
 * that once sat beside it is retired (3F-3525).
 */
export type FitnessCheckIndex = ReadonlySet<string>;

/**
 * One entry as a manifest spells it, read into the bare `@SCN` it configures, or `null` where it
 * names none.
 *
 * STORED BARE. A manifest written by hand will sooner or later spell an `@SCN` the way a feature
 * file does, and every lookup matches bare; stripping once here rather than at every call site is
 * the family's one spelling rule (`lib/bareTerm`).
 *
 * THE ONE STRING READ IS THE WHOLE GUARD: a string, a number, a list and a function all answer
 * `undefined` for `scn`, so each is refused by the read that matters. The optional chain covers the
 * two values a property read would throw on.
 */
function fitnessCheckOf(entry: unknown): string | null {
  const named = entry as { scn?: unknown } | null | undefined;
  if (typeof named?.scn !== "string") return null;
  const scnId = bareTerm(named.scn);
  return scnId === "" ? null : scnId;
}

/**
 * Build the index from the rows a manifest holds.
 *
 * A LIST, NOT A BLOCK KEYED BY `@SCN`, and the shape is the row's own argument: a row is what a
 * check says about ITSELF — its `@SCN` and its command — so neither is promoted above the other by
 * being the key somebody has to write it under.
 *
 * A MALFORMED ROW IS DROPPED, NOT TRUSTED AND NOT THROWN ON — the defensive stance the whole
 * `specController.*` family takes. Config is data from outside, and a reader that throws on a typo
 * turns one bad character into a run that produces no verdict at all; a dropped row leaves its
 * scenario unconfigured, which the corpus reports (@SCN-LNT-020).
 */
export function fitnessChecksOf(entries: unknown): FitnessCheckIndex {
  if (!Array.isArray(entries)) return new Set();
  const index = new Set<string>();
  for (const entry of entries as readonly unknown[]) {
    const scnId = fitnessCheckOf(entry);
    if (scnId !== null) index.add(scnId);
  }
  return index;
}

/**
 * ONE CONFIGURED ROW THE TARGET'S CORPUS CARRIES NO SCENARIO FOR (3F-3472) — a check the manifest
 * declares and nothing in the corpus specifies.
 *
 * THE MIRROR OF `unconfiguredFitnessScenarios`, AND THE HALF THE BOOKS COULD NOT SEE. That one
 * reads a `@fitness` scenario no row names; this reads a row no scenario names. The asymmetry
 * between what each EARNS is the two facts' own: a scenario no row names is not a configured
 * check, so there is nothing to put on the books and the census says who — a row IS the
 * declaration of a check, so there is a debit, and `features/fitness-checks.feature` promises it as
 * "an Evidence Obligation nothing observed".
 */
export interface UnspecifiedFitnessRow {
  /** The `@SCN` the row states, which no scenario in the target's corpus carries. */
  readonly scnId: string;
}
