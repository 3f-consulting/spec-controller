/**
 * THE DATING A RUN LEAVES ON WHAT IT PERSISTS — the moment it measured, written into an artefact
 * that will OUTLIVE the run that made it (@SCN-MUT-012), and nothing at all where the run had
 * nothing worth persisting (@SCN-MUT-013).
 *
 * THE COUNTERPART OF `freshness.ts`, AND DELIBERATELY NOT COUPLED TO IT. That module reads an age
 * off `measuredAt`; this one writes it. The tidy-looking move is a shared key constant, and it is
 * refused for the reason `artefact.ts` gives about the artefact's own keys: a producer and a
 * reader that agree because they read the same constant agree by construction, and the round-trip
 * that is supposed to PROVE they agree becomes a tautology. The two spellings are deliberate, and
 * what holds them together is @SCN-MUT-012 reading this artefact back through `freshMeasurementsOf`
 * at an age either side of a window.
 *
 * NOTHING HERE NAMES A CHECK, A RUNNER, A WORKFLOW OR A REPOSITORY — the restore's own discipline,
 * applied to its counterpart. A run's measurements are rows carrying numbers; which schedule
 * produced them and who borrows them are facts about the pipeline, and neither reaches this file.
 *
 * AND THE WINDOW IS NOT HERE EITHER. How long a number stays worth posting is a fact about the
 * cadence of whoever borrows it, so it belongs to the restore's caller. This writes a moment and
 * says nothing about what it is worth.
 *
 * THE CLOCK ARRIVES AS AN ARGUMENT, exactly as it does on the reader beneath the restore. A window
 * has two edges and neither can be staged in a real run — waiting a day to assert one is not a
 * test — so the moment is an input here and a flag on the edge above.
 *
 * IT DOES NOT DATE THE RUN'S OWN ARTEFACT, IT MAKES A NEW ONE. `artefact.ts` is untouched by this
 * module (@SCN-CIP-009, @SCN-CIP-011): only an artefact that outlives its run needs to say when it
 * was measured, and a run posting into its own artefact is already talking about now. Dating in
 * place would also leave a scheduled job that went on to reconcile reconciling against a dated
 * copy of itself.
 */

import { measurementsOf, type Measurement } from "./artefact.js";

/** The artefact a run leaves for a LATER run to borrow — its measurements, and when it took them. */
export interface DatedMeasurementArtefact {
  /** The moment the run measured, in the spelling a reader can turn back into a moment. */
  readonly measuredAt: string;
  /** Every measurement the run made, as it posted them. */
  readonly measurements: readonly Measurement[];
}

/**
 * The rows a run's own measurement artefact holds, or none where there is nothing readable to find.
 *
 * ABSENT, UNPARSEABLE AND HOLDING-NO-WELL-FORMED-ROW ARE ONE ANSWER, which is the stance every
 * reader at this edge already takes — `alreadyPostedIn` beside this and `freshMeasurementsOf`
 * beneath the restore both read them alike. Throwing on the middle one would end a scheduled job
 * in failure for a fault that is not its own: a half-written artefact is a fact about whatever
 * stopped mid-write, and the run that finds it simply has nothing to hand on.
 */
function measuredRowsIn(measured: string | undefined): Measurement[] {
  if (measured === undefined) return [];
  let artefact: unknown;
  try {
    artefact = JSON.parse(measured);
  } catch {
    return [];
  }
  return measurementsOf((artefact as { measurements?: unknown } | null)?.measurements);
}

/**
 * The dated artefact a run's own measurements make, or nothing where it made none worth persisting.
 *
 * EVERY ROW, NOT THE LAST ONE. A run has as many measurements as it has measured checks and they
 * all live in the one artefact `balance --measurements` reads, so what is persisted is the whole
 * of it: a persist that carried one row would leave every other bar the schedule settles
 * reconciling `missing`.
 *
 * THE ROWS GO THROUGH THE SAME READER THE RUN'S OWN ARTEFACT IS READ WITH. A row missing half its
 * address is dropped by every reader downstream, so persisting it would hand a later run an
 * artefact that appears to settle a bar and does not — and the reading that produces, `missing`,
 * is indistinguishable from a sweep that never ran.
 *
 * AND NOTHING IS PERSISTED AS NOTHING, NOT AS A DATED EMPTY ARTEFACT (@SCN-MUT-013). Both reconcile
 * `missing` downstream, so the ledger reads the same either way and what differs is where it is
 * SAID. `null` here becomes no file at all on the edge above, which lets an upload stay quiet and
 * lets the source say out loud that this run measured nothing — where a well-formed artefact
 * holding no row would be collected, borrowed, and read to zero rows in silence.
 *
 * WHICH IS WHY THE COUNT IS TAKEN AFTER THE READER AND NOT BEFORE IT. An artefact that parses and
 * holds no row any reader will accept is nothing worth persisting, exactly as an absent one is —
 * and reading the rows rather than copying the file across is the only thing that can tell the
 * difference. A blind copy would carry that row happily and settle nothing with it.
 *
 * @param measured the run's own measurement artefact, as its source, or `undefined` where there is
 *   none to read
 * @param now the moment the run measured, handed in so this stays pure
 */
export function datedArtefactOf(
  measured: string | undefined,
  now: Date,
): DatedMeasurementArtefact | null {
  const measurements = measuredRowsIn(measured);
  if (measurements.length === 0) return null;
  return { measuredAt: now.toISOString(), measurements };
}
