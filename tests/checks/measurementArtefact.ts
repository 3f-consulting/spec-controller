/**
 * How a spawned command ended, as one exit code — all that is left of the measurement artefact.
 *
 * THE ARTEFACT ITSELF HAS LEFT, AND THIS FILE KEEPS ONLY WHAT A CALLER STILL IMPORTS. It used to
 * hold what a measurement IS, where a run posted one, and what posting beside an earlier one meant,
 * for this repository's measured producers. The last of them was the nightly mutation sweep's
 * score producer, and it left with the sweep record it wrote (3F-3505): the push reads that sweep's
 * own verdict through one stock `gh` step instead (3F-3483). What remains is the wrapper half,
 * `exitCodeOf`, whose one caller is `tests/steps/toolIdentity.steps.ts`, for its own spawns. Whether
 * that remnant belongs in `tests/checks/` at all is a question 3F-3483 named and did not answer.
 */

import { constants } from "node:os";

/** How a spawned command ended, in the two fields `spawnSync` reports it in. */
export interface FinishedCommand {
  /** The code it exited with, or null where it never exited under its own power. */
  readonly status: number | null;
  /** The signal that killed it, or null where nothing did. */
  readonly signal: NodeJS.Signals | null;
}

/** What a signalled death is worth as an exit code, before the signal's own number. */
const SIGNAL_EXIT_CODE_BASE = 128;

/** The code a command's ending is worth, the way a shell would report it. */
export function exitCodeOf(command: FinishedCommand): number {
  if (command.status !== null) return command.status;
  // A command killed by a signal never exited and has no code of its own, so the shell's
  // arithmetic answers for it — 128 + n, the spelling a CI log's reader already knows.
  if (command.signal !== null) return SIGNAL_EXIT_CODE_BASE + constants.signals[command.signal];
  // Neither: it could not be started at all. Whose fault that is belongs to whoever reads the
  // log; the one reading that must be unreachable here is the one that greens the build.
  return 1;
}
