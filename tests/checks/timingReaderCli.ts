/**
 * The command behind this repository's CONVERTED `ci-run-time` checks — it prints the number an
 * earlier step of THIS run left behind, and nothing else, on stdout (3F-3166, under 3F-3139).
 *
 *     tsx timingReaderCli.ts --scn <SCN-ID> --check <tag> [--root <dir>]
 *
 * `mutationScoreReaderCli`'S SIBLING, AND DELIBERATELY THE SAME SHAPE. The two differ in one fact —
 * which record they read — because their producers run on different cadences and nothing else about
 * them differs at all. A sweep record is written by a nightly hours ago and placed in; a timings
 * record is written by the suite this job has already run. Both are `(@SCN, check) → number`,
 * read back through the artefact's own row reader, and both print the number alone.
 *
 * AND THE RECORD IT READS IS THE ROW'S OWN (3F-3200). One file per measured row, named for the row,
 * so that each timed row is placed or refused on its own record's age. The reader gains nothing
 * from that and holds no clock: it resolves a path from the `@SCN` it was handed and reads what
 * is there, exactly as it did when there was one file.
 *
 * WHICH IS THE GENERAL FORM RATHER THAN AN EXEMPTION (3F-3138's Ruling 1). A converted check's step
 * definition RUNS its row's command, always; what a target puts BEHIND that command is the target's
 * business. `@ci-run-time` is the motivating case for the reader shape, not an awkward member of the
 * set: what a suite took to run cannot be measured from inside the pass that reads it, so the
 * measuring happens where the suite runs and the reading happens here.
 *
 * SO THE FITNESS PASS RUNS LAST, AND THAT IS LOAD-BEARING RATHER THAN CONVENTIONAL. This reader has
 * something to print only because `pnpm test` and `pnpm cucumber` — both wrapped in `timeStepCli` —
 * have already run and written their rows. A pipeline that puts the fitness call first meets an
 * absent record and a wall of `missing` rows while doing exactly what it was told.
 *
 * THE NUMBER IS THE WHOLE OF STDOUT, AND THAT IS A CONTRACT RATHER THAN A HABIT (3F-3138's Ruling
 * 2). `measuredNumberOf` reads the trimmed WHOLE of what a measured row's command printed, never
 * the first number it can find in prose — so a banner, a path or a units suffix here would not be
 * ignored, it would fail the scenario. Everything this has to say goes to stderr, which is the
 * same split every measured producer in this directory already honours.
 *
 * AN ABSENT OR UNREADABLE RECORD PRINTS NOTHING AND EXITS NON-ZERO, WHICH SAYS THE TRUE THING
 * TWICE. The scenario fails, because its command could not answer; and nothing is posted, so the
 * row reconciles `missing` on the ledger — no measurement arrived, which is precisely
 * @SCN-CIP-006's clause: a step that never ran is never balanced. Printing a zero instead would
 * turn a fault in the harness into a claim that a suite took no time at all, which is the reading
 * this axis exists to keep unreachable.
 *
 * IT IS NOT AN ARBITER AND HOLDS NO BAR. One bar per characteristic and it is the ledger's
 * (3F-2509). This prints a number; whether that number is inside the ceiling its row states is
 * settled in exactly one place, on the row that owes the measurement.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import {
  MEASUREMENT_ARTEFACT_PATH,
  measurementAnswering,
  measurementsOf,
  postMeasurement,
  resolveEvidenceRoot,
  timingsRecordPath,
} from "./measurementArtefact.js";

/** Everything the reader was told: which row of the record to print, and which tree to read. */
interface TimingRead {
  readonly scnId: string;
  readonly checkTag: string;
  /**
   * The root as it was GIVEN — `undefined` where `--root` was absent (3F-3099).
   *
   * THE READER MOVES WITH THE PRODUCER OR IT READS NOTHING. The wrapper writes the record under the
   * evidence root; a reader resolving a different base would find no file, print nothing, and leave
   * the row reconciling `missing` — wearing the words this repository reserves for a producer that
   * never ran.
   */
  readonly namedRoot: string | undefined;
}

/**
 * A fault in how the reader was CALLED — exit 2, the code the ladder emitter and the
 * self-reconciliation
 * already reserve for "this run is broken" as against "the code is wrong".
 *
 * ONLY how it was called. A record that is not there, or holds no such row, is not a misuse: it is
 * a suite whose timing nobody took, and it leaves through the ordinary refusal below.
 */
function usage(problem: string): never {
  console.error(`ci run time: ${problem}`);
  console.error("ci run time: usage — --scn <SCN-ID> --check <tag> [--root <dir>]");
  process.exit(2);
}

/** The value a `--flag` was given, or undefined where the flag is absent. */
function flagValue(flags: readonly string[], name: string): string | undefined {
  const at = flags.indexOf(name);
  if (at === -1) return undefined;
  const value = flags[at + 1];
  if (value === undefined || value.startsWith("--")) usage(`${name} needs a value`);
  return value;
}

/** Read the command line into the row it names. */
function timingReadOf(argv: readonly string[]): TimingRead {
  return {
    scnId: flagValue(argv, "--scn") ?? usage("--scn names the scenario whose number to print"),
    checkTag: flagValue(argv, "--check") ?? usage("--check names the measured check"),
    namedRoot: flagValue(argv, "--root"),
  };
}

const asked = timingReadOf(process.argv.slice(2));
const recordPath = path.join(
  resolveEvidenceRoot(asked.namedRoot),
  timingsRecordPath(asked.scnId),
);

/** Whatever the record holds, or nothing where there is nothing readable to find. */
function recordAt(file: string): unknown {
  let held: unknown;
  try {
    held = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    // Absent, unreadable and unparseable are one answer here, as they are at every reader on this
    // edge: there is no number, and telling those three apart would send whoever is reading the
    // failure to three different places for one fact.
    return undefined;
  }
  return held;
}

// THROUGH THE ARTEFACT'S OWN ROW READER, never a hand-walk of the JSON. The wrapper wrote this file
// with `measurementArtefactWith`, and a second reading of what a row IS would be free to accept a
// row that producer never writes — or to refuse one it does — with the disagreement showing up as
// a ledger row that quietly reads `missing`.
const rows = measurementsOf((recordAt(recordPath) as { measurements?: unknown } | undefined)?.measurements);
// THROUGH THE ARTEFACT'S OWN MATCHING RULE, for the reason the row reader above is shared: this
// used to spell both-terms-bare for itself beside a sweep reader spelling it identically, and two
// copies of one rule agree until the day one of them is edited (@SCN-MUT-019).
//
// AND IT STATES NO SUPERSEDED CODE, WHICH IS THE ORDINARY CASE. The producer here is an earlier
// step of THIS run, so it cannot be out of step with the row it answers: a rename moves the wrapper
// and the reader in one commit. Only a producer on another cadence needs the other answer.
const row = measurementAnswering(rows, {
  scnId: asked.scnId,
  checkTag: asked.checkTag,
  supersededScnId: null,
});

if (row === undefined) {
  console.error(
    `ci run time: ${asked.scnId} ${asked.checkTag} — no such row in the timings record at ` +
      `${recordPath}, so there is no number to print. The timed suites write it: run \`pnpm test\` ` +
      "and `pnpm cucumber` first. This row's step runs BEHIND them for exactly this reason — put " +
      "it ahead of them and every timing row reads missing, which is the true sentence: no " +
      "measurement arrived."
  );
  process.exit(1);
}

// AND THE NUMBER IS WRITTEN INTO THIS RUN'S CREDIT STREAM, NOT ONLY PRINTED (@SCN-LNT-024). The
// command a measured row names is what writes its number down: a CI step's outcome is an exit code
// and an exit code cannot carry a measurement, so the step says the check RAN (@SCN-LNT-027) and
// the number arrives on the measurement artefact, already citing both terms. Printing alone left
// the writing to the pass that spawned this command, and there is no pass — the consumer's pipeline
// runs this as its own step, and `balance` reads what it wrote.
//
// BESIDE WHAT THE RUN HAS ALREADY MEASURED, never over it, which is the artefact's own keying rule
// and is why the write goes through its one door.
postMeasurement(path.join(resolveEvidenceRoot(asked.namedRoot), MEASUREMENT_ARTEFACT_PATH), {
  scnId: asked.scnId,
  checkTag: asked.checkTag,
  measured: row.measured,
});

// THE NUMBER, ALONE ON STDOUT. Nothing else may reach this stream: it is what a human reading the
// step's log sees, and what a consumer piping this command anywhere else takes as its answer.
console.log(String(row.measured));
