/**
 * The CHECK-AGNOSTIC measurement artefact — what a measurement IS, where a run posts one, and
 * what posting BESIDE an earlier one means (@SCN-CIP-009, @SCN-CIP-011) — together with the
 * WRAPPER half of a measured producer, the exit code a wrapper carries through (@SCN-CIP-010).
 *
 * EXTRACTED OUT OF `stepTiming.ts` (3F-2754), WHICH IS A NAMING FIX AND NOT A DESIGN ONE. That
 * module held two things that are not the same thing: the timing-specific READING — a band, a
 * variance margin, a wall-clock in seconds — and everything here, which never mentions a clock.
 * A mutation score posting into an artefact imported out of a module called `stepTiming` is the
 * misnaming the vocabulary discipline exists to catch, so the half that is about MEASUREMENT
 * rather than about TIME moved out and took its terms with it.
 *
 * ONE MODULE AGAIN, BECAUSE EVERY CONSUMER IS IN THIS DIRECTORY (3F-2861). The artefact spent a
 * while in `src/measurements/`, promoted into product (3F-2763) so a second repository could lift
 * the measurement RESTORE and reach the vocabulary that restore was written in — `static-checks/`
 * is not in the package's published `files`, so a term defined here is unreachable from outside
 * by construction. The restore is retired (3F-2841): moving a file between two CI runs is
 * `upload-artifact` and `gh run download`, neither of which needs a term from this package. What
 * is left posts and reads a measurement inside this repository's own gate, and every caller of it
 * is a wrapper in this directory — a product module with no product consumer, carried into `dist`
 * on every build. So it folded back into the door that had been re-exporting it, and no caller's
 * import specifier changed, which is what made the fold mechanical.
 *
 * NOTHING HERE NAMES A CHECK, AND THAT IS THE WHOLE POINT. `checkTag` is a string this module
 * never reads for meaning; the artefact is keyed by (`@SCN`, check) and carries a number.
 * A wall-clock in seconds and a score as a percentage are the same shape to it, which lets one
 * artefact hold a run's every measured row and one reader read them all.
 *
 * THE CITATION IS HANDED IN, NOT RESOLVED. A static check's run is a script handle, so its
 * `@SCN` is found over two hops — handle to bare tag through the registry, bare tag to
 * scenario through the corpus. A measurement has no handle: canon puts the check-to-scenario
 * mapping in the runner (`double-entry-manifesto.md` → Fitness Scenario), so the producer is
 * TOLD which scenario it is measuring and the measurement arrives already citing.
 *
 * NOTHING HERE IMPORTS THE READER, AND THAT IS THE POINT OF THE TESTS AROUND IT. The artefact's
 * keys are the keys `parseMeasuredEvidenceObservations` reads, and a producer that agreed with
 * that reader by inspection would agree until the day one of them was edited. A mis-keyed row
 * is not loud — the reader drops it and the obligation reconciles `missing`, which is the one
 * reading this axis exists to keep unreachable — so the agreement is pinned by reading the
 * artefact back through the real reader, in both evidence arms.
 *
 * WHAT ELSE IS HERE IS WHAT ONLY A WRAPPER HAS. `exitCodeOf` answers "how did the command I
 * wrapped end", which is a question about running something rather than about measuring anything,
 * and no consumer of the artefact has a wrapped command to ask it about.
 */

import { constants } from "node:os";

/** One row of the artefact — a measured check's number, already naming the row it posts to. */
export interface Measurement {
  /** The `@SCN` of the stepless fitness scenario this measurement answers. */
  readonly scnId: string;
  /** The bare check tag the measurement IS, naming which obligation it settles. */
  readonly checkTag: string;
  /** The number, in the units the bar above it is authored in. */
  readonly measured: number;
}

/** The artefact a run posts its measurements into, in the shape `balance --measurements` reads. */
export interface MeasurementArtefact {
  readonly measurements: readonly Measurement[];
}

/**
 * Where a run posts its measurements, relative to a repository root.
 *
 * Beneath `runs/`, which `.gitignore` excludes with no re-includes and
 * `lint:no-committed-reports` holds to it, so the artefact lives for the length of the job and
 * cannot be committed by accident.
 */
export const MEASUREMENT_ARTEFACT_PATH = "runs/self-balance/measurements.json";

/** Whether two rows answer the same thing — the @SCN naming the row and the check tag on it. */
function isTheSameRowAs(row: Measurement, measurement: Measurement): boolean {
  // Both terms, because neither is an address on its own (@SCN-LNT-012) — and each read the way
  // `parseMeasuredEvidenceObservations` reads it, since a row this rejected as different and the
  // reader accepted as the same would reach the ledger as two credits for one debit.
  const bare = (term: string): string => term.replace(/^@/, "").trim();
  return (
    bare(row.scnId) === bare(measurement.scnId) &&
    bare(row.checkTag) === bare(measurement.checkTag)
  );
}

/** Whether a row read back out of an artefact is one a producer can post beside. */
function isMeasurement(row: unknown): row is Measurement {
  if (typeof row !== "object" || row === null) return false;
  const { scnId, checkTag, measured } = row as Record<string, unknown>;
  return typeof scnId === "string" && typeof checkTag === "string" && typeof measured === "number";
}

/**
 * The well-formed rows in whatever an artefact's `measurements` key held, in artefact order.
 *
 * ROW BY ROW, like every reader at this edge. A damaged row costs itself and nothing else: the
 * obligation it would have settled reconciles `missing`, which is loud on the ledger, where one
 * bad row costing a whole artefact would be loud nowhere.
 */
export function measurementsOf(rows: unknown): Measurement[] {
  return Array.isArray(rows) ? rows.filter(isMeasurement) : [];
}

/**
 * The rows an earlier step of this run left, or none where there is nothing readable to find.
 *
 * ABSENT, EMPTY AND MALFORMED ALL READ AS NO ROWS, which is the stance every reader at this edge
 * takes rather than a shrug. Throwing would cost the step that is running now its own
 * measurement, and a row that never arrives reconciles as a step that never ran (@SCN-CIP-006) —
 * so a damaged artefact would be turned into a false verdict about a suite that plainly ran.
 */
function alreadyPostedIn(source: string | undefined): Measurement[] {
  if (source === undefined) return [];
  let posted: unknown;
  try {
    posted = JSON.parse(source);
  } catch {
    return [];
  }
  return measurementsOf((posted as { measurements?: unknown } | null)?.measurements);
}

/**
 * The artefact a run posts, carrying this measurement beside every other one the run made
 * (@SCN-CIP-011).
 *
 * ONE ARTEFACT, AS MANY CONTRIBUTING PRODUCERS AS THE RUN HAS MEASURED CHECKS, so a producer is
 * told what is already there and posts INTO it. Writing over it would leave only the last row and
 * every earlier bar reconciling missing — the reading this axis exists to keep unreachable.
 *
 * AND THE ROW IS KEYED, NOT APPENDED. A step that runs twice — a re-run, a retried job — owes its
 * bar one measurement, so it replaces its own row and nobody else's. Appending would hand the
 * reconciler two credits for a debit owed once and leave it choosing between them.
 */
export function measurementArtefactWith(
  measurement: Measurement,
  alreadyPosted: string | undefined,
): MeasurementArtefact {
  return measurementArtefactWithAll([measurement], alreadyPosted);
}

/**
 * The keying rule itself, stated over a whole set of rows.
 *
 * SET-SHAPED BECAUSE THE FILTER IS: what survives from the artefact already there is every row no
 * incoming row keys to. Private — it was exported while a restore carried a whole run's rows
 * through it (3F-2763), and that consumer is gone (3F-2841), leaving `measurementArtefactWith` as
 * the one-row door every producer here posts through.
 */
function measurementArtefactWithAll(
  measurements: readonly Measurement[],
  alreadyPosted: string | undefined,
): MeasurementArtefact {
  const others = alreadyPostedIn(alreadyPosted).filter(
    (row) => !measurements.some((measurement) => isTheSameRowAs(row, measurement)),
  );
  return { measurements: [...others, ...measurements] };
}

/** How a wrapped command ended, in the two fields `spawnSync` reports it in. */
export interface FinishedCommand {
  /** The code it exited with, or null where it never exited under its own power. */
  readonly status: number | null;
  /** The signal that killed it, or null where nothing did. */
  readonly signal: NodeJS.Signals | null;
}

/** What a signalled death is worth as an exit code, before the signal's own number. */
const SIGNAL_EXIT_CODE_BASE = 128;

/**
 * The code the wrapper exits with, which is the wrapped command's own (@SCN-CIP-010).
 *
 * NOT THE WRAPPER'S OPINION OF WHAT IT MEASURED. The verdict on a measurement is the ledger's,
 * and a wrapper that also redded on it would be holding both the number and the bar that number
 * is read against. It would also make a green build depend on two arbiters agreeing, where today
 * a step over its bar reds in exactly one place and says so in exactly one report.
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
