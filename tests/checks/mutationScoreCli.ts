/**
 * The mutation producer — runs a mutation sweep and posts the score its mutants imply, as a
 * percentage of the valid ones (@SCN-MUT-007, @SCN-MUT-008 — features/mutation-score.feature).
 *
 *     tsx mutationScoreCli.ts --scn <SCN-ID> --check <tag> [--root <dir>] -- <command> [args…]
 *
 * BUILT THE WAY THE TIMING WRAPPER WAS, because it is the same producer over a different number.
 * `timeStepCli.ts` wraps a step and reads a clock; this wraps a sweep and reads the report the
 * sweep left. Both are told which scenario and which check they are measuring, both write a row in
 * the one shape `balance --measurements` reads, and both carry the wrapped command's exit code out
 * unchanged. What is genuinely different is where the number comes from — and, since 3F-3152,
 * which FILE it lands in: a timed step measures the run it is part of and credits it, a sweep on
 * its own cadence leaves a record for a later run to place.
 *
 * THE CITATION IS AN ARGUMENT, NOT A LOOKUP. A static check's credit resolves its `@SCN` over two
 * hops from a script handle; a measurement has no handle to resolve, so canon puts the
 * check-to-scenario mapping in the runner that measures (`double-entry-manifesto.md` → Fitness
 * Scenario). Here the runner is a command line, and the measurement it writes arrives already
 * citing.
 *
 * IT IS NOT AN ARBITER: its exit code is the wrapped command's, always (@SCN-CIP-010). The
 * verdict on a mutation measurement is the self-reconciliation's alone — which is the same argument, one
 * artefact further out, as the one that keeps this file away from the runner's own `thresholds`
 * block. A producer holding both the number and the bar that number is judged against would make
 * a green build depend on two arbiters agreeing.
 *
 * AND THE UNIT CROSSES A RUN BOUNDARY, THE WAY THE @SCN DID (3F-3335). This runs nightly and the
 * reader runs on this push, so for the length of one sweep cycle after the unit moves, the newest
 * record any build can reach was written by the PREVIOUS unit's code — a kill count where a
 * percentage is now expected. Nothing reds on it: 807 clears a bar of 80 as comfortably as 96.53
 * does, which is the same green the old unit gave against the new bar and is satisfied for the
 * same empty reason. It ends the first time a nightly sweeps this tree. Written down rather than
 * glossed over, because the row reads satisfied either way and nothing else in the system would
 * say which of the two it was.
 *
 * IT WRITES A SWEEP RECORD, NOT THIS RUN'S CREDIT STREAM (3F-3152). A sweep on its own cadence is
 * not measuring the tree the run reading it is judging — that gap is the whole reason the number
 * has to cross a run boundary — so what it leaves behind is a RECORD of what it measured, at
 * `SWEEP_RECORD_PATH`, and a push places it there. Under a CONVERTED mutation check the credit is
 * posted by the row's own command from the number this record holds, so a row written straight into
 * the credit stream would be a second credit for one Evidence Obligation. The shape of the file and
 * every rule about writing into it are unchanged; only which question it answers is.
 *
 * IT READS THE RECORD BEFORE IT WRITES ONE (@SCN-CIP-011) and posts BESIDE what it finds rather
 * than over it. What that read is worth — and what an unreadable one is worth — is
 * `measurementArtefact.ts`'s to decide.
 *
 * A SWEEP THAT LEFT NO READABLE REPORT LEFT NO NUMBER, SO IT POSTS NOTHING (@SCN-MUT-008).
 * Absent, empty and unparseable are one answer, and that answer is not zero: a zero is the score
 * of a suite that killed nothing, which would be a claim about the CODE assembled out of a fault
 * in the harness measuring it. The row then reads `missing` — the true sentence, no measurement
 * arrived, and the same one a sweep that never ran produces.
 *
 * AND IT IS NOT THIS PRODUCER'S FAULT EITHER, so the exit code is still the wrapped command's. A
 * sweep that died takes its own code out through here; a sweep that ended cleanly having written
 * no report is a wiring fault, and the place that reports it is the ledger, out loud, on the row
 * that owed the measurement. A producer redding on it as well would be the second arbiter
 * @SCN-CIP-010 exists to refuse — which is why only a fault in how this was CALLED exits 2.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { readMutationReport } from "../../packages/spec-controller/src/mutation-ratchet/index.js";

import {
  SWEEP_RECORD_PATH,
  exitCodeOf,
  measurementArtefactWith,
  resolveEvidenceRoot,
} from "./measurementArtefact.js";
import { MUTATION_REPORT_PATH } from "./mutationScore.js";

/**
 * What this producer calls the gate it is sweeping, carried only because the reader takes a name.
 *
 * IT NEVER LEAVES THIS CALL, WHICH IS WHY A SECOND SPELLING OF IT COULD NOT DRIFT INTO ANYTHING.
 * The reader puts its caller's word into the measurement it hands back; what is taken out of that
 * measurement below is two counts, so nothing this producer posts, prints or exits on carries the
 * string. A refusal names the path it looked at, never the gate.
 */
const GATE = "domain";

/** Everything the producer was told: what it is measuring, where, and what to run. */
interface MutationSweep {
  readonly scnId: string;
  readonly checkTag: string;
  /** Where the sweep runs and where its report is read from. */
  readonly root: string;
  /**
   * The root as it was GIVEN — `undefined` where `--root` was absent, never the default above.
   *
   * Separate from `root` for the reason `timeStepCli`'s is: whether a self-contained target was
   * NAMED is what decides where this run's output may land, and a producer comparing `root`
   * against `process.cwd()` could not tell that from a target that happens to be the working tree.
   */
  readonly namedRoot: string | undefined;
  readonly command: readonly string[];
}

/**
 * A fault in how the producer was CALLED — exit 2, the code the self-reconciliation and the ladder
 * emitter already reserve for "this run is broken" as against "the code is wrong".
 *
 * ONLY how it was called (@SCN-MUT-008). What the SWEEP left behind never comes here: a report
 * this cannot read is a run with nothing to post, not a producer that was misused, and the verdict
 * on a measurement that never arrived belongs to the ledger like every other verdict on this axis.
 */
function usage(problem: string): never {
  console.error(`mutation score: ${problem}`);
  console.error(
    "mutation score: usage — --scn <SCN-ID> --check <tag> [--root <dir>] -- <command> [args…]",
  );
  process.exit(2);
}

/** The value a `--flag` was given, or undefined where the flag is absent. */
function flagValue(flags: readonly string[], name: string): string | undefined {
  const at = flags.indexOf(name);
  if (at === -1) return undefined;
  const value = flags[at + 1];
  // A flag swallowing the next flag as its value would post a row citing "--check", which the
  // reader drops and the ledger reports as a sweep that never ran.
  if (value === undefined || value.startsWith("--")) usage(`${name} needs a value`);
  return value;
}

/** Read the command line into the sweep it names. */
function sweepOf(argv: readonly string[]): MutationSweep {
  const separator = argv.indexOf("--");
  if (separator === -1) usage("the mutation sweep to run goes after a `--` separator");
  const command = argv.slice(separator + 1);
  if (command.length === 0) usage("nothing to run after the `--` separator");

  const flags = argv.slice(0, separator);
  return {
    scnId: flagValue(flags, "--scn") ?? usage("--scn names the scenario this sweep answers"),
    checkTag: flagValue(flags, "--check") ?? usage("--check names the measured check"),
    root: flagValue(flags, "--root") ?? process.cwd(),
    namedRoot: flagValue(flags, "--root"),
    command,
  };
}

const sweep = sweepOf(process.argv.slice(2));

const finished = spawnSync(sweep.command[0]!, sweep.command.slice(1), {
  cwd: sweep.root,
  stdio: "inherit",
});

const reportPath = path.join(sweep.root, MUTATION_REPORT_PATH);
// READ FROM THE MUTANTS AND NOWHERE ELSE (@SCN-MUT-007), THROUGH THE ONE READER THAT COUNTS THEM
// (3F-2927). The report carries a `thresholds` block beside them, and a producer transcribing it
// would be handing the ledger the runner's verdict to reconcile against the ledger's own bar — two
// arbiters of one characteristic. The reader refuses that block on the same argument, so the count
// this posts and the count the ratchet reconciles are now one figure read twice rather than two
// that agree.
//
// AND ITS REFUSAL IS THIS PRODUCER'S `null`, WHICH IS WHAT KEEPS @SCN-MUT-008 SAYING WHAT IT SAYS.
// Absent, empty, unparseable, no files section, and no scored mutant are one answer here as they
// were before: there is no number, so there is nothing to post.
const read = readMutationReport(GATE, reportPath);
// THE SCORE, AND ITS DENOMINATOR IS THE READER'S OWN `total` (3F-3335). The count was the right
// unit while the bar was a banked kill floor — a figure in the same unit, moving when a kill was
// lost. The bar is now the conventional percentage the runner breaks on, read off SCN-FIT-002's
// own row, and a count held against it clears at 807 and at 81 alike: satisfied by any suite, for
// no reason.
//
// AND `total` IS THE VALID POPULATION, WHICH IS THE HALF THIS TREE CANNOT CHECK ITSELF ON. It is
// detected plus survived plus never-covered — precisely what Stryker divides by when it decides
// whether to break — and the uncompilable, the errored and the ignored are outside it. This
// repository's own sweep has none of those three, so `detected/total` and detected over every
// mutant found are the same number here and a run against this tree would tell them apart never;
// the planted report under @SCN-MUT-007 carries all three for exactly that reason. Reading both
// figures off ONE read is what makes the runner's number and the ledger's one formula rather than
// two that agree until a report arrives holding a mutant nobody could have caught.
//
// AND IT IS UNROUNDED, BECAUSE THE BAR IS. Stryker rounds to two places for the human reading its
// log and breaks on the full figure. A producer rounding here would be a third number in a
// characteristic this increment spent its length getting down to one.
const measured = read.ok ? (read.measurement.detected / read.measurement.total) * 100 : null;

if (measured === null) {
  // ON STDERR AND NOT AS A VERDICT. This is not the measurement report below — it is the reason
  // there is none, which is a fact about the RUN rather than about the code, and the code's own
  // report is the row that will read `missing`.
  console.error(
    `mutation score: ${sweep.scnId} ${sweep.checkTag} — no readable mutation report at ` +
      `${reportPath}, so no measurement is posted. The row reads missing, which is the true ` +
      "sentence: no measurement arrived.",
  );
  process.exit(exitCodeOf(finished));
}

/** What an earlier producer of this run left in the artefact, or nothing where it is not there. */
function alreadyPostedIn(artefactPath: string): string | undefined {
  try {
    return readFileSync(artefactPath, "utf8");
  } catch {
    // The first producer of a job finds no file, which is the ordinary case and not a fault. What
    // is unreadable for any other reason is handled the same way, one layer up: this sweep's own
    // measurement is worth more than the rows it could not read.
    return undefined;
  }
}

// AGAINST THE EVIDENCE ROOT, NOT AGAINST `sweep.root` (3F-3099) — the same move the timed step
// makes, and it must be the same one: the nightly names no root, so this is the write whose base
// used to be spec-controller's own source tree.
const artefactPath = path.join(resolveEvidenceRoot(sweep.namedRoot), SWEEP_RECORD_PATH);
// The parent is made rather than assumed: the evidence root is a directory nothing else creates,
// so the first producer of a job is the thing that creates it.
mkdirSync(path.dirname(artefactPath), { recursive: true });
writeFileSync(
  artefactPath,
  `${JSON.stringify(
    measurementArtefactWith(
      { scnId: sweep.scnId, checkTag: sweep.checkTag, measured },
      alreadyPostedIn(artefactPath),
    ),
    null,
    2,
  )}\n`,
  "utf8",
);

// EVERY RUN, AND AFTER THE WRITE. Both terms of the address open the line, because a job has as
// many of these lines as it has measured checks and a reading nobody can attribute is a reading
// nobody can act on. It stops short of a verdict for the reason the exit code does.
console.log(
  `mutation score: ${sweep.scnId} ${sweep.checkTag} — measured ${measured}. ` +
    "The verdict on that is the ledger's.",
);

process.exit(exitCodeOf(finished));
