/**
 * The command behind this repository's CONVERTED mutation check — it prints the number the
 * scheduled sweep left behind, and nothing else, on stdout (3F-3152, under 3F-3138).
 *
 *     tsx mutationScoreReaderCli.ts --scn <SCN-ID> --check <tag> [--supersedes <SCN-ID>] [--root <dir>]
 *
 * WHY THIS EXISTS RATHER THAN THE SWEEP ITSELF. 3F-3138's Ruling 1 is that a converted check's
 * step definition RUNS its row's command, always — what a target puts BEHIND that command is the
 * target's business. This repository's sweep costs 8-12 minutes against a ~2-minute ladder and is
 * nightly for that reason, which predates the conversion, so what its row names is a cheap reader
 * over the record the sweep already left. A target that types a sweep into its row gets the sweep
 * as its own CI step, which is exactly what it asked for; this one did not ask for that.
 *
 * THE NUMBER IS THE WHOLE OF STDOUT, AND THAT IS A CONTRACT RATHER THAN A HABIT (3F-3138's Ruling
 * 2). `measuredNumberOf` reads the trimmed WHOLE of what a measured row's command printed, never
 * the first number it can find in prose — so a banner, a path or a units suffix here would not be
 * ignored, it would fail the scenario. Everything this has to say goes to stderr, which is the
 * same split every measured producer in this directory already honours.
 *
 * AN ABSENT OR UNREADABLE RECORD PRINTS NOTHING AND EXITS NON-ZERO, WHICH SAYS THE TRUE THING
 * TWICE. The scenario fails, because its command could not answer; and nothing is posted, so the
 * row reconciles `missing` on the ledger — no measurement arrived. Those are the two sentences
 * CONTRIBUTING already promises for a sweep that has lapsed, reached the same way. Printing a zero
 * instead would be a claim about the CODE assembled out of a fault in the harness measuring it,
 * which is the reading @SCN-MUT-008 exists to keep unreachable.
 *
 * AND IT CHECKS NO AGE, WHICH IS A DIVISION OF LABOUR RATHER THAN AN OVERSIGHT — BUT IT IS THE
 * HALF A CONSUMER COPYING THIS FILE DOES NOT GET (3F-3156). A record's age is settled where the
 * record is PLACED, against the producing run's own clock, before the payload is fetched at all.
 * Nothing here holds a window, and there is no timestamp in a `Measurement` for one to be held
 * against. So the account of failure modes above is complete about ABSENCE and about nothing else:
 * hand this reader a record from any distance in the past and it prints the number and exits 0 —
 * measured at six years and seven months, which is not a generous bound, it is the lack of one.
 *
 * SO COPYING THIS FILE WITHOUT A WINDOWED PLACEMENT BUYS A CHECK THAT GREENS OVER A NUMBER NOBODY
 * REFRESHED. The placement is the half that costs something, and it does not look like this: here
 * it is a step in `ci.yml` weighing a nightly run's own `createdAt` against a thirty-six hour
 * window and placing nothing once that lapses, so the row reads `missing` and the sentence above
 * is reached honestly (@SCN-MUT-020, @SCN-MUT-021 — the two arms that RUN that step rather than
 * reading it). Whoever adopts the expensive-producer pattern owes themselves that half in whatever
 * shape their own pipeline takes. Taking this file alone is taking the cheap half of a pair.
 *
 * AND LOCALLY THERE IS NO PLACEMENT AT ALL — AN ACCEPTED COST, STATED HERE RATHER THAN LEFT TO BE
 * DISCOVERED. The placement is a CI step, and the local ladder is derived from the `ci.yml` steps that
 * invoke a package.json script, which that one does not. So nothing windows the record `pnpm
 * mutation` leaves behind: locally the number is whatever was last swept, of unbounded age, and
 * the row reads satisfied over it. That is a true contract rather than a fault — the developer's
 * own sweep IS the placement — and it is deliberately not repaired by putting a clock here. The
 * only clock available locally is the file's mtime, which a copy resets and which says when the
 * record MOVED rather than when it was MEASURED; a bar resting on that would be the dishonest
 * clock 3F-2841 retired, wearing a filesystem's costume.
 *
 * IT IS NOT AN ARBITER AND HOLDS NO BAR. One bar per characteristic and it is the ledger's
 * (3F-2509). This prints a number — a mutation score, since 3F-3335 — and whether that number
 * clears the bar is settled in exactly one place, on the row that owes the measurement.
 *
 * AND IT ANSWERS TO A SUPERSEDED CODE WHERE THE ROW NAMES ONE, WHICH IS ABOUT THE CODE AND NEVER
 * ABOUT THE RECORD (@SCN-MUT-019). The sweep stamps its measurement with the `@SCN` of the row it
 * was told to measure, and it runs nightly on the gated branch — so a commit that renames the row
 * is not a commit the producer is in, and until a sweep has run on the renamed tree the newest
 * record any build can reach is keyed under the code being replaced. `--supersedes` is the expand
 * half of that expand/contract, named on the row's own command line beside the two terms the row
 * already states there.
 *
 * WHAT IT DOES NOT WIDEN IS WHICH RECORD COUNTS. A superseded code answers because the record
 * PREDATES the rename, never because the record is old. Nothing here reads a clock and there is no
 * clock here to read: the sweep record carries two terms and a number per row. The window that
 * keeps a lapsed sweep's number out is applied where the record is PLACED — against the producing
 * run's own clock, and before the payload is fetched at all — so no code inside it, superseded or
 * current, can reach a decision the age has already made. The full reasoning is at
 * `MeasurementAsk.supersededScnId`.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import {
  MEASUREMENT_ARTEFACT_PATH,
  SWEEP_RECORD_PATH,
  measurementAnswering,
  measurementsOf,
  postMeasurement,
  resolveEvidenceRoot,
} from "./measurementArtefact.js";

/** Everything the reader was told: which row of the record to print, and which tree to read. */
interface ScoreRead {
  readonly scnId: string;
  readonly checkTag: string;
  /**
   * The `@SCN` this row's code SUPERSEDED, whose measurement still answers it, or `null` where the
   * command named none (@SCN-MUT-019).
   *
   * IT ARRIVES ON THE COMMAND LINE BECAUSE THAT IS WHERE THIS ROW'S OTHER TWO TERMS ARRIVE. The
   * row already states `--scn` and `--check` to this reader through the command it names; a third
   * fact about the same row taken from somewhere else would give one row two sources that agree
   * until one of them moves. The row is still where it is written down — a row's command is part of
   * the row — and it is the form a consumer can copy, because a consumer's reader is their own
   * program and no manifest field of ours can reach inside it.
   *
   * A COMMAND THAT NAMES NONE ANSWERS ONLY TO ITS OWN CODE, which is today's reading and the safe
   * default. The whole of why a row would ever name one, and why this widens which CODE counts
   * rather than which RECORD counts, is at `MeasurementAsk.supersededScnId`.
   */
  readonly supersededScnId: string | null;
  /**
   * The root as it was GIVEN — `undefined` where `--root` was absent (3F-3099).
   *
   * THE READER MOVES WITH THE PRODUCER OR IT READS NOTHING, which is why this is here at all. The
   * sweep writes the record under the evidence root; a reader still joining the constant to the
   * working directory would find no file, print nothing, and leave the row reconciling `missing` —
   * wearing, exactly, the words this repository reserves for a nightly that has lapsed.
   */
  readonly namedRoot: string | undefined;
}

/**
 * A fault in how the reader was CALLED — exit 2, the code the ladder emitter and the
 * self-reconciliation already reserve for "this run is broken" as against "the code is wrong".
 *
 * ONLY how it was called. A record that is not there, or holds no such row, is not a misuse: it is
 * a sweep that has not run, and it leaves through the ordinary refusal below.
 */
function usage(problem: string): never {
  console.error(`mutation score: ${problem}`);
  console.error(
    "mutation score: usage — --scn <SCN-ID> --check <tag> [--supersedes <SCN-ID>] [--root <dir>]"
  );
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
function scoreReadOf(argv: readonly string[]): ScoreRead {
  return {
    scnId: flagValue(argv, "--scn") ?? usage("--scn names the scenario whose number to print"),
    checkTag: flagValue(argv, "--check") ?? usage("--check names the measured check"),
    // A BLANK IS NOT A NAMING. `--supersedes ""` reaches here as the empty string, and taken at its
    // word it would be a code no row can carry and every `bareTerm` comparison would refuse — which
    // is the same answer as naming none, reached the long way round and reported nowhere.
    supersededScnId: namedCode(flagValue(argv, "--supersedes")),
    namedRoot: flagValue(argv, "--root"),
  };
}

/** A `--flag`'s value where it is one, or `null` where the flag was absent or spelled blank. */
function namedCode(value: string | undefined): string | null {
  return value !== undefined && value.trim() !== "" ? value : null;
}

const asked = scoreReadOf(process.argv.slice(2));
const recordPath = path.join(resolveEvidenceRoot(asked.namedRoot), SWEEP_RECORD_PATH);

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

// THROUGH THE ARTEFACT'S OWN ROW READER, never a hand-walk of the JSON. The sweep wrote this file
// with `measurementArtefactWith`, and a second reading of what a row IS would be free to accept a
// row that producer never writes — or to refuse one it does — with the disagreement showing up as
// a ledger row that quietly reads `missing`.
const rows = measurementsOf((recordAt(recordPath) as { measurements?: unknown } | undefined)?.measurements);
// THROUGH THE ARTEFACT'S OWN MATCHING RULE, for the reason the row reader above is shared: this
// used to spell both-terms-bare for itself beside a timings reader spelling it identically, and two
// copies of one rule agree until the day one of them is edited (@SCN-MUT-019).
const row = measurementAnswering(rows, {
  scnId: asked.scnId,
  checkTag: asked.checkTag,
  supersededScnId: asked.supersededScnId,
});

if (row === undefined) {
  // THE SUPERSEDED CODE IS NAMED IN THE REFUSAL WHERE ONE WAS ASKED FOR. A reader that looked under
  // two codes and reported only one sends whoever is reading the failure to check a record for a
  // key it was never the only key looked for.
  const alsoLookedFor =
    asked.supersededScnId === null
      ? ""
      : ` (nor under ${asked.supersededScnId}, the code this row supersedes)`;
  console.error(
    `mutation score: ${asked.scnId} ${asked.checkTag}${alsoLookedFor} — no such row in the sweep record at ` +
      `${recordPath}, so there is no number to print. Run the sweep (\`pnpm mutation\`), or, on ` +
      "CI, this is the nightly having lapsed: the scenario fails and the row reads missing, " +
      "which is the true sentence — no measurement arrived."
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
