/**
 * The command behind this repository's CONVERTED mutation check — it prints the number the
 * scheduled sweep left behind, and nothing else, on stdout (3F-3152, under 3F-3138).
 *
 *     tsx mutationScoreReaderCli.ts --scn <SCN-ID> --check <tag> [--root <dir>]
 *
 * WHY THIS EXISTS RATHER THAN THE SWEEP ITSELF. 3F-3138's Ruling 1 is that a converted check's
 * step definition RUNS its row's command, always — what a target puts BEHIND that command is the
 * target's business. This repository's sweep costs 8-12 minutes against a ~2-minute ladder and is
 * nightly for that reason, which predates the conversion, so what its row names is a cheap reader
 * over the record the sweep already left. A target that types a sweep into its row gets the sweep
 * inside its fitness pass, which is exactly what it asked for; this one did not ask for that.
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
 * IT IS NOT AN ARBITER AND HOLDS NO BAR. One bar per characteristic and it is the ledger's
 * (3F-2509). This prints a number; whether that number clears the `domain` gate's kill floor is
 * settled in exactly one place, on the row that owes the measurement.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { bareTerm } from "@3f-consulting/spec-controller-core/internal";

import { SWEEP_RECORD_PATH, measurementsOf } from "./measurementArtefact.js";

/** Everything the reader was told: which row of the record to print, and which tree to read. */
interface ScoreRead {
  readonly scnId: string;
  readonly checkTag: string;
  readonly root: string;
}

/**
 * A fault in how the reader was CALLED — exit 2, the code the ladder emitter and
 * `lint:self-balance` already reserve for "this run is broken" as against "the code is wrong".
 *
 * ONLY how it was called. A record that is not there, or holds no such row, is not a misuse: it is
 * a sweep that has not run, and it leaves through the ordinary refusal below.
 */
function usage(problem: string): never {
  console.error(`mutation score: ${problem}`);
  console.error("mutation score: usage — --scn <SCN-ID> --check <tag> [--root <dir>]");
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
    root: flagValue(argv, "--root") ?? process.cwd(),
  };
}

const asked = scoreReadOf(process.argv.slice(2));
const recordPath = path.join(asked.root, SWEEP_RECORD_PATH);

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
// BOTH TERMS, BARE, because neither is an address on its own (@SCN-LNT-012) and a record may hold
// several rows: the sweep record is keyed exactly as the credit stream is.
const row = rows.find(
  (held) =>
    bareTerm(held.scnId) === bareTerm(asked.scnId) &&
    bareTerm(held.checkTag) === bareTerm(asked.checkTag)
);

if (row === undefined) {
  console.error(
    `mutation score: ${asked.scnId} ${asked.checkTag} — no such row in the sweep record at ` +
      `${recordPath}, so there is no number to print. Run the sweep (\`pnpm mutation\`), or, on ` +
      "CI, this is the nightly having lapsed: the scenario fails and the row reads missing, " +
      "which is the true sentence — no measurement arrived."
  );
  process.exit(1);
}

// THE NUMBER, ALONE. Nothing else may reach this stream: the step definition reads the whole of it
// as the measurement.
console.log(String(row.measured));
