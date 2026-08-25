/**
 * THE FRESHNESS WINDOW — how long a measurement taken by an earlier run is still about the code
 * this run is judging (@SCN-MUT-009, @SCN-MUT-010).
 *
 * NOTHING HERE NAMES A CHECK, A RUNNER OR A REPOSITORY, and that is the ruling rather than a
 * happy accident. A sweep that costs more than a per-push ladder can afford is a general shape,
 * so the window is an INPUT: a scheduled job at 03:17 UTC wants a different one from a job at
 * 03:41, and a constant would have to be edited by whoever lifted this.
 *
 * PURE, AND THE CLOCK ARRIVES AS AN ARGUMENT. `now` is handed in rather than read, which is what
 * lets the @unit arm drive it and is why the reconciler never has to learn what time it is: the
 * expiry belongs to the EDGE that restores, and a row that has aged out simply never reaches the
 * reconciler. The row then reads `missing` — already the true sentence, already out-of-balance,
 * already rendered — so per-push teeth cost the ledger no eleventh outcome.
 *
 * AND AN UNDATED ARTEFACT IS NOT A FRESH ONE. Absent, unreadable and aged-out are one answer
 * here, which is the stance every reader at this edge already takes with something it cannot
 * read — and on this question it is also the only safe one. A measurement whose age nobody can
 * state is a measurement nothing can vouch for, and reading it as recent enough would reconcile
 * this push against a tree that may never have been measured at all. The loud default is the one
 * that reds.
 */

import { measurementsOf, type Measurement } from "./artefact.js";

/** How many milliseconds a second is, spelled once so the arithmetic below reads in seconds. */
const MILLISECONDS_PER_SECOND = 1000;

/**
 * When a persisted artefact says it was measured, or `null` where it does not say, or says
 * something no reader can turn into a moment.
 */
function measuredAtIn(artefact: unknown): number | null {
  const measuredAt = (artefact as { measuredAt?: unknown } | null)?.measuredAt;
  if (typeof measuredAt !== "string") return null;
  const at = Date.parse(measuredAt);
  return Number.isNaN(at) ? null : at;
}

/**
 * The measurements a persisted artefact is still worth, or none where it has aged out.
 *
 * AT THE WINDOW IS INSIDE IT, the reading @SCN-CIP-004 and @SCN-MUT-004 already take of a bar.
 * The off-by-one is silent in both directions — a run measured exactly on the boundary is either
 * reported or dropped and nothing downstream can tell which — so it is pinned rather than left
 * to whichever comparison was typed first.
 *
 * @param persisted the artefact an earlier run left, as its source, or `undefined` where there
 *   is none to read
 * @param now this run's clock, handed in so the reader stays pure
 * @param maxAgeSeconds how long a measurement stays close enough to true about this code
 */
export function freshMeasurementsOf(
  persisted: string | undefined,
  now: Date,
  maxAgeSeconds: number,
): Measurement[] {
  if (persisted === undefined) return [];
  let artefact: unknown;
  try {
    artefact = JSON.parse(persisted);
  } catch {
    return [];
  }
  const measuredAt = measuredAtIn(artefact);
  if (measuredAt === null) return [];
  if (now.getTime() - measuredAt > maxAgeSeconds * MILLISECONDS_PER_SECOND) return [];
  // A fresh artefact is not a well-formed one: the rows are validated the way the run artefact's
  // own rows are, so a row missing half its address is dropped here — where the run can still say
  // what it posted — rather than downstream, where it would be indistinguishable from a row that
  // was never restored.
  return measurementsOf((artefact as { measurements?: unknown }).measurements);
}
