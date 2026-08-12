/**
 * The timing wrapper's pure half — what a timed step's measurement IS, and the artefact it
 * posts into (@SCN-CIP-009, 3F-2738).
 *
 * THE PRODUCER 3F-2283 LEFT OUT. That slice built the whole consumer side of the
 * `@ci-run-time` axis — an Evidence Obligation carrying a ceiling, a measurement read into a
 * citing Evidence Observation, the reconciliation between them — and deliberately stopped
 * short of producing a measurement here. This module is the first half of that producer; the
 * spawn, the clock and the write live next door in `timeStepCli.ts`, the split
 * `localLadder.ts` / `localLadderCli.ts` already sets for a non-check in this directory.
 *
 * THE CITATION IS HANDED IN, NOT RESOLVED. A static check's run is a script handle, so its
 * `@SCN` is found over two hops — handle to bare tag through the registry, bare tag to
 * scenario through the corpus. A measurement has no handle: canon puts the check-to-scenario
 * mapping in the runner (`double-entry-manifesto.md` → Fitness Scenario), so the wrapper is
 * TOLD which scenario it is measuring and the measurement arrives already citing.
 *
 * NOTHING HERE IMPORTS THE READER, AND THAT IS THE POINT OF THE TEST BESIDE IT. The artefact's
 * keys are the keys `parseMeasuredEvidenceObservations` reads, and a producer that agreed with
 * that reader by inspection would agree until the day one of them was edited. A mis-keyed row
 * is not loud — the reader drops it and the obligation reconciles `missing`, which is the one
 * reading this axis exists to keep unreachable — so the agreement is pinned by reading the
 * artefact back through the real reader, in both evidence arms.
 */

import { constants } from "node:os";

/** How a wrapped command ended, in the two fields `spawnSync` reports it in. */
export interface FinishedCommand {
  /** The code it exited with, or null where it never exited under its own power. */
  readonly status: number | null;
  /** The signal that killed it, or null where nothing did. */
  readonly signal: NodeJS.Signals | null;
}

/** One row of the timing artefact — a step's wall-clock, already naming the row it posts to. */
export interface StepMeasurement {
  /** The `@SCN` of the stepless fitness scenario this measurement answers. */
  readonly scnId: string;
  /** The bare check tag the measurement IS — `ci-run-time` — naming which obligation it settles. */
  readonly checkTag: string;
  /** The wall-clock, in the seconds the ceiling above it is authored in. */
  readonly measured: number;
}

/** The artefact a run posts its measurements into, in the shape `balance --timings` reads. */
export interface TimingArtefact {
  readonly measurements: readonly StepMeasurement[];
}

/**
 * Where a run posts its measurements, relative to a repository root.
 *
 * Beneath `runs/`, which `.gitignore` excludes with no re-includes and
 * `lint:no-committed-reports` holds to it, so the artefact lives for the length of the job and
 * cannot be committed by accident.
 */
export const TIMINGS_ARTEFACT_PATH = "runs/self-balance/timings.json";

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
export function timingReport(measurement: StepMeasurement, gate: number | null): string {
  const band = timingBandOf(measurement.measured, gate);
  const against =
    gate === null ? "" : ` against a trigger of ${triggerFor(gate)}s and a gate of ${gate}s`;
  return (
    `time step: ${measurement.scnId} ${measurement.checkTag} — ` +
    `measured ${measurement.measured}s${against}: ${BAND_READING[band]}`
  );
}

/** Whether two rows answer the same thing — the @SCN naming the row and the check tag on it. */
function isTheSameRowAs(row: StepMeasurement, measurement: StepMeasurement): boolean {
  // Both terms, because neither is an address on its own (@SCN-LNT-012) — and each read the way
  // `parseMeasuredEvidenceObservations` reads it, since a row this rejected as different and the
  // reader accepted as the same would reach the ledger as two credits for one debit.
  const bare = (term: string): string => term.replace(/^@/, "").trim();
  return (
    bare(row.scnId) === bare(measurement.scnId) &&
    bare(row.checkTag) === bare(measurement.checkTag)
  );
}

/** Whether a row read back out of an artefact is one this producer can post beside. */
function isStepMeasurement(row: unknown): row is StepMeasurement {
  if (typeof row !== "object" || row === null) return false;
  const { scnId, checkTag, measured } = row as Record<string, unknown>;
  return typeof scnId === "string" && typeof checkTag === "string" && typeof measured === "number";
}

/**
 * The rows an earlier step of this run left, or none where there is nothing readable to find.
 *
 * ABSENT, EMPTY AND MALFORMED ALL READ AS NO ROWS, which is the stance every reader at this edge
 * takes rather than a shrug. Throwing would cost the step that is running now its own
 * measurement, and a row that never arrives reconciles as a step that never ran (@SCN-CIP-006) —
 * so a damaged artefact would be turned into a false verdict about a suite that plainly ran.
 */
function alreadyPostedIn(source: string | undefined): StepMeasurement[] {
  if (source === undefined) return [];
  let posted: unknown;
  try {
    posted = JSON.parse(source);
  } catch {
    return [];
  }
  const rows = (posted as { measurements?: unknown } | null)?.measurements;
  return Array.isArray(rows) ? rows.filter(isStepMeasurement) : [];
}

/**
 * The artefact a run posts, carrying this step's measurement beside every other step's
 * (@SCN-CIP-011).
 *
 * ONE ARTEFACT, AS MANY CONTRIBUTING STEPS AS THE RUN HAS TIMED SUITES, so this step is told what
 * is already there and posts INTO it. Writing over it would leave only the last suite's row and
 * every earlier ceiling reconciling missing — the reading this axis exists to keep unreachable.
 *
 * AND THE ROW IS KEYED, NOT APPENDED. A step that runs twice — a re-run, a retried job — owes its
 * ceiling one measurement, so it replaces its own row and nobody else's. Appending would hand the
 * reconciler two credits for a debit owed once and leave it choosing between them.
 */
export function timingArtefactWith(
  measurement: StepMeasurement,
  alreadyPosted: string | undefined,
): TimingArtefact {
  const others = alreadyPostedIn(alreadyPosted).filter(
    (row) => !isTheSameRowAs(row, measurement),
  );
  return { measurements: [...others, measurement] };
}

/** What a signalled death is worth as an exit code, before the signal's own number. */
const SIGNAL_EXIT_CODE_BASE = 128;

/**
 * The code the wrapper exits with, which is the wrapped command's own (@SCN-CIP-010).
 *
 * NOT THE WRAPPER'S OPINION OF THE TIME IT MEASURED. The timing verdict is the ledger's, and a
 * wrapper that also redded on it would be holding both the number and the bar that number is
 * read against. It would also make a green build depend on two arbiters agreeing, where today
 * a suite over its ceiling reds in exactly one place and says so in exactly one report.
 */
export function exitCodeOf(command: FinishedCommand): number {
  if (command.status !== null) return command.status;
  // A command killed by a signal never exited and has no code of its own, so the shell's
  // arithmetic answers for it — 128 + n, the spelling a CI log's reader already knows.
  if (command.signal !== null) return SIGNAL_EXIT_CODE_BASE + constants.signals[command.signal];
  // Neither: it could not be started at all. Whose fault that is belongs to whoever reads the
  // log; the one reading that must be unreachable here is the one that greens the build.
  return 1;
}
