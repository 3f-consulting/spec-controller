/**
 * THE RUNNER BEHIND A CONVERTED FITNESS CHECK (@SCN-LNT-023) — the row's command, run, and its
 * exit code read as the scenario's verdict.
 *
 * IT RUNS THE COMMAND. ALWAYS. There is no read-an-artefact second shape in this model: what a
 * target puts BEHIND the command is the target's business, and a target that types a sweep there
 * gets the sweep inside its fitness pass, which is exactly what it asked for. One shape means the
 * row stays three fields and the pass does the same thing for every check that converts.
 *
 * THE EXIT CODE ANSWERS ONE QUESTION AND THE SCENARIO ANSWERS THE OTHER. `did the check run` is
 * answered by the scenario appearing in the fitness pass's report, which the credit reader takes;
 * `did it find anything` is answered here. Two questions, two mechanisms — which is why nothing in
 * this module posts a credit, and why a command exiting 0 having examined nothing cannot pass as
 * silence: its silence is only ever half the answer.
 *
 * WHY THIS IS A MODULE AND NOT THE STEP DEFINITION ITSELF. `tests/steps/fitness.steps.ts` is the
 * cucumber wiring — a hook that reads the running scenario's tag line and one step that calls in
 * here — and wiring is the one part no unit test can reach. Everything a verdict depends on is
 * here instead, with the process injected, so resolving a row and reading an exit code are proved
 * without spawning anything and the step definition holds no reasoning of its own.
 *
 * THE PROCESS IS INJECTED, WHICH IS THE WHOLE OF THE SEAM. `spawnFitnessCommand` is the one
 * implementation that reaches a shell; every other export takes it as an argument. A verdict rule
 * that spawned for itself would be provable only by planting executables, and the arms that matter
 * — a command that exits non-zero saying nothing, a command killed before it answered — are ones a
 * plant can barely stage.
 *
 * Parent: 3F-3138 — the general shape of a converted fitness check.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  bareTerm,
  fitnessChecksOf,
  type FitnessCheckRegistry,
} from "@3f-consulting/spec-controller-core/internal";

import {
  MEASUREMENT_ARTEFACT_PATH,
  measurementArtefactWith,
  type Measurement,
} from "./measurementArtefact.js";

/**
 * The command each configured row names, keyed by the bare `@SCN` that row is about.
 *
 * SEPARATE FROM `FitnessCheckRegistry`, WHICH THE LEDGER READS, and deliberately so: that registry
 * holds the characteristic and the bar — the DEBIT's half of the row — and states in its own header
 * that the command is the runner's half and nothing on that side reads it. This is that half. The
 * two readings share the row and the key, and neither borrows the other's fields.
 */
export type FitnessCommandRegistry = ReadonlyMap<string, string>;

/** What running one row's command produced, as much of it as a verdict or a message reads. */
export interface FitnessCommandResult {
  /** The exit code, or `null` where the command never got to answer with one. */
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

/** How the runner reaches a process — injected, so every verdict below is provable without one. */
export type RunFitnessCommand = (command: string) => FitnessCommandResult;

/**
 * The command each row of a target's `specController.fitnessChecks` names, keyed by the bare `@SCN`
 * that row is about.
 *
 * BOTH TERMS OR NEITHER, which is the stance the ledger's reading of these same rows takes. A row
 * naming a scenario and no command, or a command and no scenario, says nothing this can act on —
 * half-reading it would either leave a scenario resolving to a command the target never wrote or
 * attach a command to no scenario at all. A row spelling a blank command is the same fault with a
 * quieter spelling, so it is dropped by the same clause.
 *
 * THE `@SCN` IS STORED BARE, through the ONE reading of what a term bare is. The running scenario's
 * tag line arrives bare, so a row filed under `"@SCN-MUT-011"` would be filed under a key no lookup
 * ever asks for — the silent-miss class `bareTerm` exists to close.
 *
 * A MALFORMED ROW IS DROPPED, NOT THROWN ON. Configuration is data from outside, and a reader that
 * threw on a typo would turn one bad character into a pass that produced no verdict at all. A
 * dropped row leaves its scenario naming no command, which is a fault this module reports loudly at
 * the scenario it belongs to.
 */
export function fitnessCommandsOf(entries: unknown): FitnessCommandRegistry {
  const commands = new Map<string, string>();
  if (!Array.isArray(entries)) return commands;
  for (const entry of entries as readonly unknown[]) {
    const row = entry as { scn?: unknown; command?: unknown } | null | undefined;
    if (typeof row?.scn !== "string" || typeof row.command !== "string") continue;
    const scnId = bareTerm(row.scn);
    if (scnId === "" || row.command.trim() === "") continue;
    commands.set(scnId, row.command);
  }
  return commands;
}

/**
 * The same, read from the manifest at the root the fitness pass is running in.
 *
 * THE ROOT IS WHERE THE PASS RUNS, and that is what makes `enforcedOverRealSource` an OBSERVED fact
 * on this route rather than one inferred from a workflow file: the rows come from the target's own
 * manifest and the commands run against the tree beside it.
 */
export function fitnessCommandsAt(root: string): FitnessCommandRegistry {
  return fitnessCommandsOf(fitnessRowsAt(root));
}

/**
 * The rows themselves, as the target's manifest spells them, before either reading of them.
 *
 * ONE READ FOR TWO READINGS. The runner takes the command half of a row and the ledger's reader
 * takes the characteristic half, and both are asked at the same moment about the same file — so the
 * FILE is read once here and each reader is handed the same rows. Two reads would be two chances
 * for a manifest edited mid-pass to hand one half of the pass a row the other half never saw.
 */
function fitnessRowsAt(root: string): unknown {
  const manifest = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
    specController?: { fitnessChecks?: unknown };
  };
  return manifest.specController?.fitnessChecks;
}

/** What the command said, on either stream, or a plain statement that it said nothing. */
function quoted(result: FitnessCommandResult): string {
  const said = [result.stdout, result.stderr]
    .map((stream) => stream.trim())
    .filter((stream) => stream !== "")
    .join("\n");
  // A silent non-zero exit is a fault report of its own, and a message that trailed off into
  // nothing would read as though the quoting had broken rather than as what the command did.
  return said === "" ? "(it printed nothing)" : said;
}

/** What a scenario no configured row names is told, and the one remedy it is sent to. */
const NO_ROW =
  "no row of specController.fitnessChecks names this scenario, so there is no command to run. " +
  "Write its row: the @SCN it is about, the characteristic it asserts, and the command that " +
  "returns a violation.";

/**
 * Run the check the running scenario's `@SCN` names, and answer the fault where there is one — or
 * `null` where the command ran and found nothing.
 *
 * A SCENARIO NO ROW NAMES IS A FAULT, and nothing is run for it. Such a scenario has said which
 * axis it is on and then said nothing about what it asserts, so nothing was examined — and letting
 * it pass would put a scenario in the fitness pass's report saying a check ran when no check ran at
 * all, which is the enumeration this axis exists to gain telling the first lie it is capable of.
 * The ledger says the same thing from the other side (@SCN-LNT-020 raises no Evidence Obligation
 * and reports the scenario as one no configured row names), and the two are deliberately not one
 * mechanism: the run reds where the person is, the reconciliation reds where the row is missing.
 *
 * `null` STATUS IS ITS OWN SENTENCE. A command killed by a signal, or one that could not be
 * started, never answered with a code — folding it into the non-zero arm would print `exited null`
 * at somebody trying to work out what their check did.
 *
 * THE MESSAGE NAMES THE COMMAND AND QUOTES IT, because a fitness scenario that reds is a violation
 * somebody has to go and fix, and a bare exit code sends them to work out which of a target's rows
 * spoke before they can begin.
 */
export function fitnessCheckFault(
  scnId: string,
  commands: FitnessCommandRegistry,
  run: RunFitnessCommand
): string | null {
  const command = commands.get(scnId);
  if (command === undefined) return `${scnId}: ${NO_ROW}`;
  const result = run(command);
  if (result.status === 0) return null;
  const how = result.status === null ? "did not run to completion" : `exited ${result.status}`;
  return `${scnId}: \`${command}\` ${how}.\n${quoted(result)}`;
}

/**
 * The one implementation that reaches a shell.
 *
 * `shell: true` BECAUSE THE ROW HOLDS A COMMAND LINE, not an argument list — `eslint src/` states
 * its own scope in the same string, which is the reason the row needs no fourth field for scope.
 * Splitting it here would be this module inventing a quoting grammar the target never agreed to.
 *
 * BOTH STREAMS ARE CAPTURED RATHER THAN INHERITED, so the failure message can quote what the
 * command said. Inheriting would print the findings straight through — which reads well until the
 * pass runs several checks and the reader has to work out which of them spoke.
 */
export const spawnFitnessCommand: RunFitnessCommand = (command) => {
  const finished = spawnSync(command, { shell: true, encoding: "utf8" });
  return {
    status: finished.status,
    stdout: finished.stdout ?? "",
    stderr: finished.stderr ?? "",
  };
};

/* ═══ THE MEASURED HALF (@SCN-LNT-024) ═══════════════════════════════════════════════════════ */

/**
 * WHY THERE IS A SECOND HALF AT ALL, AND WHY THERE IS NOT A THIRD. The static half runs a command
 * and reads an EXIT CODE; this one runs a command and reads a NUMBER off what it printed, then posts
 * that number as a measurement. Two assertions over two kinds of evidence — so two step definitions
 * in `tests/steps/fitness.steps.ts`, and exactly two however many checks convert, because everything
 * that varies between two measured checks is in the configured row.
 *
 * THE BAR IS NOWHERE IN HERE. One bar per characteristic and it is the ledger's (3F-2509): a runner
 * that compared the number it had just produced would be grading its own homework, and the ledger
 * would then transcribe a verdict rather than reconcile one. So the EXIT CODE is not read on this
 * route either — the number IS the evidence, and a command that answered with one has honoured the
 * contract whatever code it went out with. That is the same stance `exitCodeOf` states for the
 * wrappers: a producer is not an arbiter of what it measured.
 */

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

/**
 * The rows as the LEDGER reads them, at the root the fitness pass is running in.
 *
 * THE RUNNER READS ONLY THE CHARACTERISTIC OFF THIS, AND IT READS IT THROUGH THE LEDGER'S OWN
 * READER. The word a measured credit cites is the same word the Evidence Obligation was raised
 * against, so a second reading of "what characteristic does this row name" would let the credit post
 * under one spelling while the debit stood under another — one row, an obligation with no credit and
 * a credit with no obligation, and loud nowhere. The BAR on these rows is not this module's business
 * and nothing here reaches for it.
 */
export function fitnessChecksAt(root: string): FitnessCheckRegistry {
  return fitnessChecksOf(fitnessRowsAt(root));
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
  checks: FitnessCheckRegistry,
  commands: FitnessCommandRegistry,
  run: RunFitnessCommand
): FitnessMeasurementOutcome {
  const command = commands.get(scnId);
  const check = checks.get(scnId);
  if (command === undefined || check === undefined) {
    return { measurement: null, fault: `${scnId}: ${NO_ROW}` };
  }
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
 * Post a measurement into this run's artefact at `root`, beside every row already there.
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
export function postFitnessMeasurement(root: string, measurement: Measurement | null): void {
  if (measurement === null) return;
  const artefactPath = path.join(root, MEASUREMENT_ARTEFACT_PATH);
  // The parent is made rather than assumed: `runs/` is gitignored, so on a fresh clone the first
  // producer of a run is the thing that creates it.
  mkdirSync(path.dirname(artefactPath), { recursive: true });
  writeFileSync(
    artefactPath,
    `${JSON.stringify(measurementArtefactWith(measurement, alreadyPostedIn(artefactPath)), null, 2)}\n`,
    "utf8"
  );
}
