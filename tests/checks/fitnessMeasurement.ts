/**
 * POSTING A MEASUREMENT FOR A CONVERTED FITNESS CHECK (@SCN-LNT-024) — the row's command, run, the
 * number read off what it printed, and that number written into this run's evidence artefact.
 *
 * WHY THERE IS A SECOND HALF AT ALL, AND WHY THERE IS NOT A THIRD. The static half runs a command
 * and reads an EXIT CODE; this one runs a command and reads a NUMBER off what it printed, then posts
 * that number as a measurement. Two assertions over two kinds of evidence — so two step definitions
 * in `tests/steps/fitness.steps.ts`, and exactly two however many checks convert, because everything
 * that varies between two measured checks is in the configured row.
 *
 * THE BAR IS NOWHERE IN HERE. One bar per characteristic and it is the ledger's (3F-2509): a pass
 * that compared the number it had just produced would be grading its own homework, and the ledger
 * would then transcribe a verdict rather than reconcile one. So the EXIT CODE is not read on this
 * route either — the number IS the evidence, and a command that answered with one has honoured the
 * contract whatever code it went out with. That is the same stance `exitCodeOf` states for the
 * wrappers: a producer is not an arbiter of what it measured.
 *
 * WHY IT IS ITS OWN MODULE, AND WHICH WAY THE EDGE POINTS (3F-3196). The two halves of the fitness
 * pass do different jobs over different evidence — one reads an EXIT CODE, this one reads a NUMBER
 * and posts it — and they shared a file only because they were written in the same week. They
 * share no function. What they do share is the index a target's rows are read into, the quoting of
 * what a command said, and the sentence a scenario no row names is told; all three live with the
 * run side, in `fitnessCommand.ts`, and are imported ACROSS from here.
 *
 * THE EDGE IS ONE-WAY AND THAT IS THE POINT OF THE SPLIT. `fitnessCommand.ts` imports nothing from
 * this file, so a STATIC row's path — the manifest read, the classification, the spawn — never
 * reaches the posting code at all. A re-export from over there would restore the reachability and
 * leave the split as a filename change.
 *
 * Parent: 3F-3138 — the general shape of a converted fitness check.
 */

/**
 * WHY IT IS STILL HERE (3F-3198). PROTOCOL by 3F-3190's discriminator — it runs a row's command,
 * parses a number off what it printed and writes that number into the run's evidence artefact — and
 * held in this tree by the boundary rule at `checkTree.ts`: `FitnessCheckIndex` comes from core's
 * UNPUBLISHED `./internal`, so under `packages/spec-controller/src` this module would travel in the
 * tarball unresolvable (@SCN-API-007, measured).
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { type FitnessCheckIndex } from "@3f-consulting/spec-controller-core/internal";

import {
  NO_ROW,
  quoted,
  type FitnessCommandIndex,
  type RunFitnessCommand,
} from "./fitnessCommand.js";
import {
  MEASUREMENT_ARTEFACT_PATH,
  measurementArtefactWith,
  type Measurement,
} from "./measurementArtefact.js";

/**
 * What running a MEASURED row's command produced — its number, or the fault that says why there
 * is none. Never both, and never neither.
 *
 * TWO FIELDS RATHER THAN A THROWN ERROR, because both halves of the ruling have to be readable
 * from one answer: the scenario fails AND nothing is posted. A shape that could carry a fault
 * beside a measurement would let a caller post from a run it also called broken.
 */
export interface FitnessMeasurementOutcome {
  /** The number the command printed, already citing the row it answers, or `null` on a fault. */
  readonly measurement: Measurement | null;
  /** Why there is no measurement, or `null` where there is one. */
  readonly fault: string | null;
}

/**
 * The number a command's own output holds, or `null` where what it printed is not one.
 *
 * THE WHOLE OF THE OUTPUT, NOT THE FIRST NUMBER IN IT. A measured row's command prints its
 * measurement and nothing else there; anything it wants to say goes to its error stream. Reading a
 * number OUT of prose would make `mutation score: 240` and `240 of 300 killed` both post a number,
 * one of them the wrong one, and silently — which is exactly the second I/O contract this ruling
 * refused to put in the row.
 *
 * A NUMBER THE MEASUREMENT READER WOULD REFUSE IS REFUSED HERE, WHERE IT IS LOUD.
 * `parseMeasuredEvidenceObservations` takes a finite, non-negative number and drops anything else —
 * so a negative or an infinity posted from here would be dropped on the way back in and the row
 * would read `missing` with nothing red anywhere. That is the silent failure this scenario exists
 * to foreclose, so the refusal happens at the point where it fails the scenario instead. The two
 * readings are held together by both arms reading the artefact back through that real reader; a
 * comment asserting they must agree would agree until one of them was edited.
 *
 * ZERO IS A MEASUREMENT. A suite can kill nothing and a step can take no time, and reading zero as
 * "no number" would turn the worst real answer into a missing one.
 */
export function measuredNumberOf(printed: string): number | null {
  const said = printed.trim();
  // `Number("")` is 0, so an empty stream would otherwise post the measurement of a command that
  // measured nothing at all.
  if (said === "") return null;
  const measured = Number(said);
  return Number.isFinite(measured) && measured >= 0 ? measured : null;
}

/** What a command that printed no usable number is told, and the contract it is sent back to. */
const NOT_A_NUMBER =
  "printed no measurement. A measured row's command prints its number, and nothing else, on its " +
  "own output; anything else it has to say goes to its error stream. The number must also be one " +
  "the measurement reader takes — finite, and not negative — or the row it posts would be dropped " +
  "on the way back in and read as a check that never ran.";

/**
 * Run the measured check the running scenario's `@SCN` names, and read the number it printed.
 *
 * BOTH READINGS OF THE ROW ARE REQUIRED, AND A SCENARIO MISSING EITHER IS THE SAME FAULT. A row
 * that named a command and no characteristic would leave a number with nothing to cite; one that
 * named a characteristic and no command would leave a scenario with nothing to run. Neither is a
 * measurement, and both send the author to the same place — write the row.
 *
 * THE CITATION IS IN HAND BEFORE THE COMMAND STARTS. The `@SCN` came off the running scenario's own
 * tag line and the characteristic off the row keyed by it, so the measurement arrives already citing
 * rather than being attributed afterwards — which is the two-hop seam conversion retires.
 *
 * NOTHING IS POSTED ON A FAULT, and that is half the ruling rather than an implementation detail: a
 * scenario that failed having posted a number would hand the ledger a credit from a run it had just
 * called broken, and one that passed having posted nothing would leave its row reading `missing`
 * with nothing red anywhere. Two mechanisms, both loud, neither standing in for the other.
 */
export function fitnessMeasurement(
  scnId: string,
  checks: FitnessCheckIndex,
  commands: FitnessCommandIndex,
  run: RunFitnessCommand
): FitnessMeasurementOutcome {
  const row = commands.get(scnId);
  const check = checks.get(scnId);
  if (row === undefined || check === undefined) {
    return { measurement: null, fault: `${scnId}: ${NO_ROW}` };
  }
  // THE MEASURED ROUTE READS NO EXIT CODE AT ALL, so it reads no code a row could name for one
  // either: the number IS the evidence here, and a command that answered with one has honoured the
  // contract whatever code it went out with. Only the command half of the row is this half's
  // business.
  const command = row.command;
  const result = run(command);
  const measured = measuredNumberOf(result.stdout);
  if (measured === null) {
    return {
      measurement: null,
      // The command verbatim and what it said, for the reason the static half quotes them: whoever
      // has to fix this should not first have to work out which of a target's rows spoke.
      fault: `${scnId}: \`${command}\` ${NOT_A_NUMBER}\n${quoted(result)}`,
    };
  }
  return { measurement: { scnId, checkTag: check.characteristic, measured }, fault: null };
}

/** What this run has already posted into the artefact, or nothing where there is nothing to read. */
function alreadyPostedIn(artefactPath: string): string | undefined {
  try {
    return readFileSync(artefactPath, "utf8");
  } catch {
    // The first producer of a run finds no file, which is the ordinary case and not a fault. What
    // is unreadable for any other reason is `measurementArtefactWith`'s to decide, one layer up.
    return undefined;
  }
}

/**
 * Post a measurement into this run's artefact under `evidenceRoot`, beside every row already there.
 *
 * THE BASE IS THE EVIDENCE ROOT AND NOT A TARGET ROOT (3F-3099), which is a change of MEANING with
 * no change of signature — a planted arm handing its own `mkdtemp` in resolves exactly where it
 * always did. The caller that moved is the real fitness pass, which named no target and so used to
 * post into spec-controller's own source tree; it now resolves the base through the one resolver.
 *
 * BESIDE, NEVER OVER. A run has as many measurements as it has measured checks and they all answer
 * through the one artefact `balance --measurements` reads, so this hands the keying rule what is
 * already there and writes what comes back. Writing over it would leave only the last row and every
 * earlier bar reconciling as a check that never ran.
 *
 * `null` WRITES NOTHING AT ALL — not an empty artefact. An empty one would be this producer claiming
 * the run measured nothing, over the top of whatever a sibling had already posted; the caller that
 * hands `null` in is a scenario that is about to fail, and a failing scenario has no business
 * touching the run's credit stream.
 *
 * THE I/O IS THIS PRODUCER'S AND THE KEYING IS NOT, which is the arrangement every producer in this
 * directory already has. `measurementArtefactWith` is deliberately file-free — it takes the artefact
 * as a string and answers with the object — so the rule that decides which rows survive is stated
 * once and each producer supplies its own reading and writing around it.
 */
export function postFitnessMeasurement(evidenceRoot: string, measurement: Measurement | null): void {
  if (measurement === null) return;
  const artefactPath = path.join(evidenceRoot, MEASUREMENT_ARTEFACT_PATH);
  // The parent is made rather than assumed: the evidence root is a directory nothing else creates,
  // so the first producer of a run is the thing that creates it.
  mkdirSync(path.dirname(artefactPath), { recursive: true });
  writeFileSync(
    artefactPath,
    `${JSON.stringify(measurementArtefactWith(measurement, alreadyPostedIn(artefactPath)), null, 2)}\n`,
    "utf8"
  );
}
