/**
 * The mutation-regression detector's edge — it finds the recorded sweep and this run's own report,
 * puts the two of them in front of the comparison, and carries the verdict out of the process that
 * reached it (@SCN-MRG-006 — features/mutation-regression.feature).
 *
 *     tsx mutationRegressionCli.ts --scn <SCN-ID> --check <tag> [--root <dir>]
 *
 * IT READS TWO REPORTS AND RUNS NOTHING, WHICH IS THE SHAPE THE EXPENSIVE-PRODUCER PATTERN ALREADY
 * HAS HERE. A measured row's command is run BY the fitness pass to read its number, so a row naming
 * a command that launched an 8-to-12-minute sweep would put that sweep inside the pass — which is
 * the cost `mutationScoreReaderCli` exists to keep out of it. The sweep has a command of its own
 * (`pnpm mutation`) and leaves its report where this reads it; this is the cheap half that follows,
 * exactly as the score's reader follows the score's producer.
 *
 * WHICH LEAVES THE PIPELINE ONE OBLIGATION, NAMED HERE RATHER THAN ASSUMED. The record must be the
 * one a PUSH PLACED, not the file the sweep wrote back into: a run told to mutate incrementally
 * reads its incremental file and rewrites it with this run's own results merged in, so a comparison
 * pointed at that file afterwards reads this run's report against a copy of itself and never finds
 * a loss. `RECORDED_SWEEP_PATH` is its own name at the evidence root for that reason, written once
 * by the placement and read by nothing that edits it.
 *
 * ITS EXIT CODE IS THE VERDICT, WHICH IS THE ONE PLACE THIS EDGE PARTS FROM ITS SIBLINGS. Every
 * other producer in this directory carries the wrapped command's code out untouched, because the
 * verdict on a MEASUREMENT is the ledger's and a producer holding both the number and the bar would
 * be two arbiters of one characteristic. Nothing here reads a bar: a lost kill is not a number over
 * a threshold, it is a kill the record made that this run does not, found by the comparison itself.
 * So the run ends in failure on the fact rather than on an opinion, and the bar — `atMost: 0` on the
 * row — still lives in exactly one place. Both, deliberately: somebody watching the log should not
 * have to wait for a reconciliation to learn that a kill went missing.
 *
 * A RECORD IT COULD NOT READ ENDS THE RUN CLEANLY, AND THAT IS NOT LENIENCE. Nothing was compared,
 * so nothing was lost and nothing was measured — there is no verdict to fail on. It posts no number,
 * the row reads as a check that never ran, and the ledger reds it out loud. Posting a nought instead
 * would be a claim about the suite assembled out of a fault in the machinery reading it, which is
 * the reading `@SCN-MUT-008` already keeps unreachable on the score's side.
 *
 * AND THE REASON IS THE READER'S OWN SENTENCE, NEVER A STACK TRACE. Nothing at the name is the
 * ordinary case on the first push after this gate is turned on; reached by an unhandled fault it
 * would arrive naming a line of somebody's source rather than the record, saying nothing about what
 * was looked for. `recordIn` decides which of the four readings applied and `describeUnsettled`
 * words it; this carries that out unchanged rather than composing a second account beside it.
 *
 * THE NUMBER IS THE WHOLE OF STDOUT, AS IT IS AT EVERY MEASURED ROW'S COMMAND HERE.
 * `measuredNumberOf` reads the trimmed WHOLE of what the command printed, never the first number it
 * can find in prose, so a banner on this stream would not be ignored — it would fail the row.
 * Everything this has to say goes to stderr, which is where a log's reader finds the comparison's
 * three numbers and every lost kill by name.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import {
  MEASUREMENT_ARTEFACT_PATH,
  RECORDED_SWEEP_PATH,
  postMeasurement,
  resolveEvidenceRoot,
} from "./measurementArtefact.js";
import {
  comparisonOf,
  describeComparison,
  describeLostKill,
  describeUnsettled,
  lostKills,
  recordIn,
  type Mutant,
  type RecordReading,
} from "./mutationRegression.js";
import { MUTATION_REPORT_PATH } from "./mutationScore.js";

/** Everything the check was told: which row it answers, and which tree and evidence root to read. */
interface RegressionRead {
  readonly scnId: string;
  readonly checkTag: string;
  /** The tree whose own mutation report is read — the working directory where none was named. */
  readonly root: string;
  /**
   * The root as it was GIVEN — `undefined` where `--root` was absent, never the default above.
   *
   * Separate from `root` for the reason every producer here keeps them apart: whether a
   * self-contained target was NAMED is what decides where this run's evidence is read and written,
   * and a resolver comparing against `process.cwd()` could not tell that from a target that happens
   * to be the working tree.
   */
  readonly namedRoot: string | undefined;
}

/**
 * A fault in how the check was CALLED — exit 2, the code the ladder emitter and the
 * self-reconciliation already reserve for "this run is broken" as against "the code is wrong".
 *
 * ONLY how it was called. A record that is not there is not a misuse: it is a placement that
 * fetched nothing or a scheduled sweep that has not run, and it leaves through the refusal below.
 */
function usage(problem: string): never {
  console.error(`mutation regression: ${problem}`);
  console.error("mutation regression: usage — --scn <SCN-ID> --check <tag> [--root <dir>]");
  process.exit(2);
}

/** The value a `--flag` was given, or undefined where the flag is absent. */
function flagValue(flags: readonly string[], name: string): string | undefined {
  const at = flags.indexOf(name);
  if (at === -1) return undefined;
  const value = flags[at + 1];
  // A flag swallowing the next flag as its value would post a row citing "--check", which the
  // reader drops and the ledger reports as a check that never ran.
  if (value === undefined || value.startsWith("--")) usage(`${name} needs a value`);
  return value;
}

/** Read the command line into the row it answers. */
function regressionReadOf(argv: readonly string[]): RegressionRead {
  return {
    scnId: flagValue(argv, "--scn") ?? usage("--scn names the scenario this check answers"),
    checkTag: flagValue(argv, "--check") ?? usage("--check names the measured check"),
    root: flagValue(argv, "--root") ?? process.cwd(),
    namedRoot: flagValue(argv, "--root"),
  };
}

const asked = regressionReadOf(process.argv.slice(2));
const evidenceRoot = resolveEvidenceRoot(asked.namedRoot);
const recordPath = path.join(evidenceRoot, RECORDED_SWEEP_PATH);
const reportPath = path.join(asked.root, MUTATION_REPORT_PATH);

/**
 * The bytes at a name, or nothing at all where there is no file there.
 *
 * THESE TWO LINES ARE THE EDGE'S AND NOT THE COMPARISON'S. `mutationRegression.ts` reads no file —
 * which is what lets every status a run can reach be put in front of it — so the one fact only a
 * filesystem can learn is learned here and handed in as the absence of any text. What that absence
 * MEANS is decided there, with the other three readings, by a rule a scenario reads.
 */
function bytesAt(file: string): string | undefined {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return undefined;
  }
}

/**
 * Say what a reading that settled nothing says, and end the run having measured nothing.
 *
 * THE SECOND LINE IS THE HALF THAT KEEPS THE TWO SENTENCES APART. The first is the reader's own
 * account of which of the four readings applied; the second says what follows from it — no number
 * is posted, so the row reads as a check that never ran, and the verdict on that belongs to the
 * ledger. Without it a reader meets a refusal on a stream the build went green on and has to work
 * out for themselves whether anything reds.
 */
function settledNothing(reading: Extract<RecordReading, { settled: false }>): never {
  console.error(`mutation regression: ${describeUnsettled(reading)}`);
  console.error(
    `mutation regression: ${asked.scnId} ${asked.checkTag} — nothing is posted, so the row reads ` +
      "missing. That is where this reds: a run that compared no mutant has no verdict of its own.",
  );
  process.exit(0);
}

/** The mutants a reading holds, or the run ending on the reason it holds none. */
function mutantsOf(reading: RecordReading): readonly Mutant[] {
  return reading.settled ? reading.mutants : settledNothing(reading);
}

// THE RECORD FIRST, BECAUSE ITS ABSENCE IS THE ORDINARY CASE AND ITS REASON IS THE MORE USEFUL ONE.
// On the first push after this gate is turned on there is no record to place, and a reader told
// about this run's report before being told there was nothing to read it against would be sent to
// the wrong half of the pipeline.
const recorded = mutantsOf(recordIn(recordPath, bytesAt(recordPath)));
const current = mutantsOf(recordIn(reportPath, bytesAt(reportPath)));

const comparison = comparisonOf(recorded, current);

// THE THREE NUMBERS FIRST, THEN THE LOSSES, AND BOTH ON STDERR. The comparison's own sentence says
// how much of the record the answer is about, so a reader meets the scope before the verdict — "no
// kill was lost" over 41 of a record's 836 mutants is worth almost nothing, and this is the line
// that lets them tell that run from the one that read the whole of it.
console.error(`mutation regression: ${describeComparison(comparison)}`);
for (const lost of lostKills(recorded, current)) {
  console.error(`mutation regression: ${describeLostKill(lost)}`);
}

// AND THE COUNT IS WRITTEN INTO THIS RUN'S CREDIT STREAM, NOT ONLY PRINTED. A CI step's outcome is
// an exit code and an exit code cannot carry a measurement, so the command a measured row names is
// what writes its number down — beside what the run has already measured, never over it, which is
// the artefact's own keying rule and is why the write goes through its one door.
postMeasurement(path.join(evidenceRoot, MEASUREMENT_ARTEFACT_PATH), {
  scnId: asked.scnId,
  checkTag: asked.checkTag,
  measured: comparison.lost,
});

// THE NUMBER, ALONE ON STDOUT. Nothing else may reach this stream: it is what the fitness pass reads
// as this row's measurement, and anything beside it would not be ignored — it would fail the row.
console.log(String(comparison.lost));

// THE VERDICT, AND IT IS THE SAME FIGURE THE LEDGER IS HELD TO. Read off the comparison rather than
// off a second count of the losses: two readings of "lost" written down separately are two arbiters,
// and they agree until one of them is edited.
process.exit(comparison.lost === 0 ? 0 : 1);
