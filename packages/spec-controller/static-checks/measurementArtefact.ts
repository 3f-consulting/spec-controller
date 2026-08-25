/**
 * The WRAPPER half of a measured producer — the exit code a wrapper carries through
 * (@SCN-CIP-010) — and this directory's door onto the measurement artefact itself.
 *
 * EXTRACTED OUT OF `stepTiming.ts` (3F-2754), WHICH IS A NAMING FIX AND NOT A DESIGN ONE. That
 * module held two things that are not the same thing: the timing-specific READING — a band, a
 * variance margin, a wall-clock in seconds — and everything here, which never mentions a clock.
 * A mutation score posting into an artefact imported out of a module called `stepTiming` is the
 * misnaming the vocabulary discipline exists to catch, so the half that is about MEASUREMENT
 * rather than about TIME moved out and took its terms with it.
 *
 * THE ARTEFACT ITSELF THEN MOVED ONE STEP FURTHER OUT, INTO PRODUCT (3F-2763). `static-checks/`
 * is not in the package's published `files`, so terms defined here are unreachable from another
 * repository by construction — and the measurement restore is ruled generic and liftable, so the
 * vocabulary it is written in belongs where a dependency can reach it
 * (`../src/measurements/artefact.ts`). The wrappers in this directory were built against this
 * module, and they still import it: what they get is the one product definition, re-exported, not
 * a second copy of it.
 *
 * WHAT STAYS HERE IS WHAT ONLY A WRAPPER HAS. `exitCodeOf` answers "how did the command I wrapped
 * end", which is a question about running something rather than about measuring anything, and no
 * consumer of the artefact has a wrapped command to ask it about.
 */

import { constants } from "node:os";

// The artefact, re-exported rather than redefined. A second spelling of any of these would be
// two things keyed by the same word that agree until the day one of them is edited, and the
// failure that produces here is not loud: a wrapper writing one path while the gate reads
// another leaves every measured row reconciling missing, which reads as a suite that never ran.
export {
  MEASUREMENT_ARTEFACT_PATH,
  measurementArtefactWith,
  measurementArtefactWithAll,
  measurementsOf,
} from "../src/measurements/artefact.js";
export type { Measurement, MeasurementArtefact } from "../src/measurements/artefact.js";

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
