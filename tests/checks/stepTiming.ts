/**
 * The timing wrapper's pure half — how a wall-clock is READ against the ceiling above it
 * (@SCN-CIP-009, @SCN-CIP-012; 3F-2738, 3F-2741).
 *
 * THE PRODUCER 3F-2283 LEFT OUT. That slice built the whole consumer side of the
 * `@ci-run-time` axis — an Evidence Obligation carrying a ceiling, a measurement read into a
 * citing Evidence Observation, the reconciliation between them — and deliberately stopped
 * short of producing a measurement here. This module is the first half of that producer; the
 * spawn, the clock and the write live next door in `timeStepCli.ts` — the pure half here, the
 * process boundary there, so what is about time can be tested without spawning anything.
 *
 * WHAT IS LEFT HERE IS ONLY WHAT IS ABOUT TIME (3F-2754). The artefact a measurement posts
 * into, what a measurement IS, and the exit code a wrapper carries through are about MEASURING
 * rather than about timing, and they live in `measurementArtefact.ts` — where a mutation
 * producer can import them without importing a module named after somebody else's clock. This
 * module keeps the band, the variance margin and the seconds, none of which mean anything to a
 * check whose number is a percentage.
 */

/**
 * WHY IT IS A CHECK RATHER THAN PROTOCOL (3F-3198). It classifies a measurement, which is the shape
 * 3F-3190's discriminator sends to the product — but not the substance. Everything in it is about ONE
 * characteristic and about THIS repository's own gate: the band, the seconds, and a variance margin
 * read out of `technical-design/fitness-functions.md`'s `trigger x 1.25`. Nothing a target configures
 * reaches any of it, and the product already has its one reading of a number against its bar, in
 * core's domain. A second band-reading inside the product would be that reading twice.
 */

import type { Measurement } from "./measurementArtefact.js";

/**
 * A wall-clock span, as the seconds a ceiling is authored in.
 *
 * ONE DECIMAL, WHICH IS A RESOLUTION AND NOT A VERDICT. The ceilings on this axis are 75 and
 * 150 seconds, so a tenth is three orders of magnitude finer than the bar it is read against:
 * rounding can only move a run whose measurement already sits within 0.05 s of its ceiling,
 * and a run that close crossed the trigger band long before and was printed as such. Writing
 * the raw millisecond quotient instead would put a number nobody can hold in their head on a
 * report whose whole job is to be read at a glance.
 */
export function measuredSecondsOf(elapsedMs: number): number {
  return Math.round(elapsedMs / 100) / 10;
}

/** Which reading a measurement got against its ceiling, or that its pair has none. */
export type TimingBand = "inside-trigger" | "inside-variance" | "over-gate" | "no-threshold";

/**
 * How far above the engineering anchor a suite may run before it reds.
 *
 * Canon's own arithmetic, read the other way round: `technical-design/fitness-functions.md` →
 * *The CI run-time thresholds* sets the gate at `trigger × 1.25`, a band wide enough that the
 * variance of a shared runner cannot red a suite nobody changed. Only the gate is the ledger's
 * business, so the manifest authors that and the anchor is divided back out of it — two numbers
 * authored side by side could disagree, and a manifest whose anchor sat above its own ceiling
 * would print a run as comfortable and red it in the same job.
 */
export const VARIANCE_MARGIN = 1.25;

/** A number as the report reads it, which is the resolution a measurement arrives in. */
function toTenths(seconds: number): number {
  return Math.round(seconds * 10) / 10;
}

/**
 * The engineering anchor beneath a ceiling — the threshold the substrate decisions were made
 * against, and the one a suite crosses long before it reds.
 *
 * ROUNDED, so the boundary printed is the boundary applied. A trigger carried at full precision
 * would put a run just above 0.32 on the far side of a line the report shows as 0.3, and the
 * report is the only place this band can be read at all.
 */
export function triggerFor(gate: number): number {
  return toTenths(gate / VARIANCE_MARGIN);
}

/**
 * Which of the three bands a measurement landed in, or that its pair was given no ceiling.
 *
 * AT THE GATE IS NOT OVER IT, and at the trigger is not over that either — a threshold is a
 * ceiling (@SCN-CIP-004), so both comparisons are at-or-below. A boundary here disagreeing with
 * the ledger's would put one run in two bands, and the report is what a person acts on.
 *
 * NO CEILING IS NOT A BAND AND IS NOT GIVEN A DEFAULT. `thresholdFor` answers `null` and this
 * carries that answer: Infinity would read every un-ceilinged run as comfortably inside an
 * anchor nobody set, which is the reading @SCN-CIP-002 exists to keep loud on the ledger.
 */
export function timingBandOf(measured: number, gate: number | null): TimingBand {
  if (gate === null) return "no-threshold";
  if (measured > gate) return "over-gate";
  if (measured > triggerFor(gate)) return "inside-variance";
  return "inside-trigger";
}

/**
 * What each band reads as on the line, which is the deliverable rather than decoration.
 *
 * THE MIDDLE ONE IS WHY THERE ARE TWO NUMBERS AT ALL. Its run reds nothing and reconciles
 * satisfied, so this line is the only place the crossed anchor can be read — and a band named
 * without the word green would send a reader hunting a failure that is not there.
 *
 * THE LAST ONE STOPS SHORT OF A VERDICT. The wrapper holds the number; the bar that number is
 * judged against is the ledger's, and a wrapper that redded on its own reading would be grading
 * its own homework and would make a green build depend on two arbiters agreeing.
 */
const BAND_READING: Readonly<Record<TimingBand, string>> = {
  "inside-trigger": "inside the trigger.",
  "inside-variance":
    "over the trigger and under the gate — still green, and this is the warning before the red.",
  "over-gate": "over the gate. The verdict on that is the ledger's.",
  "no-threshold": "no threshold is configured.",
};

/**
 * What every run prints: the measurement, the numbers it is read against, and its band.
 *
 * BOTH TERMS OF THE ADDRESS OPEN THE LINE, because a job has as many of these lines as it has
 * timed suites and a reading nobody can attribute is a reading nobody can act on.
 */
export function timingReport(measurement: Measurement, gate: number | null): string {
  const band = timingBandOf(measurement.measured, gate);
  const against =
    gate === null ? "" : ` against a trigger of ${triggerFor(gate)}s and a gate of ${gate}s`;
  return (
    `time step: ${measurement.scnId} ${measurement.checkTag} — ` +
    `measured ${measurement.measured}s${against}: ${BAND_READING[band]}`
  );
}
