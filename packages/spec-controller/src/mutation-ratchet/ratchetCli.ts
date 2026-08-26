#!/usr/bin/env node
/**
 * THE COMMAND — one gate's run reconciled against its record, and the run that asked ending on the
 * answer (@SCN-RAT-015, 3F-2805).
 *
 *     --gate <name> --report <path> [--root <dir>] [--record-file <path>]
 *                   [--bank-command <text>] [--record]
 *
 * WHY THERE IS A COMMAND AT ALL. Every module beneath this one settles what the verdict IS, and a
 * verdict handed back as a value is a verdict nobody's pipeline can read. A pipeline observes one
 * thing about a step — how it ended — so the last piece of this library is the piece that ends.
 *
 * THREE ENDINGS, AND THE THIRD IS THE ONE WORTH BUILDING FOR. A gate that stands ends cleanly and a
 * gate that does not ends in failure; between them they are what a pipeline is watching for, and
 * telling them apart is arithmetic that is already done by the time this file runs. The third is a
 * run that was CALLED wrong, and it must wear neither of the other two. A name left off, reported as
 * a gate that does not stand, sends somebody hunting through their code for a regression that never
 * happened; reported as a gate that stands, it is a bar that quietly stopped being read at all. So
 * it takes the ending this repository already reserves for "this run is broken" as against "the code
 * is wrong", which every other step here that can be misused already uses.
 *
 * A FLAG NEVER SWALLOWS THE NEXT FLAG AS ITS VALUE. `--report --record` read leniently is a report
 * sought at a path called `--record`, found missing, and answered with a sweep that never ran — a
 * reading that sends its reader to look at their runner when what happened was a typo one character
 * long. Anything beginning with two dashes is a flag, never a value.
 *
 * THE REPORT'S PATH IS REQUIRED AND THE RECORD'S NAME IS NOT, and the asymmetry is a ruling rather
 * than an oversight, carried up from the composition beneath. Where a sweep drops its output is a
 * RUNNER'S convention, so a default there would be this file naming a runner. The record's name
 * belongs to whoever owns the record, so the conventional one stands in and a caller who files their
 * bars elsewhere writes it over.
 *
 * AND THE TREE DEFAULTS TO A RELATIVE ONE RATHER THAN TO ANYWHERE THIS FILE CAN FIND. `.` is the
 * caller's own working directory, resolved by the platform at the moment of the read; a root taken
 * from where this file is INSTALLED agrees with its caller for exactly as long as it sits beside
 * that caller's code, and stops the day it ships as a dependency — resolving quietly into a package
 * folder, reading nothing, and reporting a gate that measured perfectly as a gate that never ran.
 *
 * A REFUSAL TO BANK IS AN EXPECTED ENDING RATHER THAN A CRASH. Asking whether there is anything to
 * bank is what an operator types, and most of the time the answer is no. Handed out as an unhandled
 * fall it arrives as a stack trace — a reading that says the tool broke where what happened was the
 * tool working, and one that buries the refusal's own sentence, which is the only part of it anybody
 * needed. So the refusal is caught by its own type, its reason is what the reader gets, and the run
 * ends in failure because there was nothing to bank.
 *
 * AND THERE IS NO WAY PAST THAT REFUSAL HERE EITHER. The recorder beneath takes four inputs and
 * offers no fifth; this file adds no flag that would ask it to write a fall, and @SCN-RAT-012 reads
 * these bytes to say so rather than trusting them. A record that must come down comes down by hand,
 * with the reason in the commit, because an escape hatch a tool holds open is one nobody ever has to
 * justify.
 *
 * NOTHING HERE NAMES A PROJECT, A CHECK, A RUNNER, A WORKFLOW OR A REPOSITORY — the usage line
 * included, which is where such a name most easily hides, being read by people rather than by tests.
 * @SCN-RAT-014 reads these bytes for that too.
 */

import { join } from "node:path";

import { bankRaisedRecord, FallRefusedError } from "./ratchet.js";
import { RECORD_FILE, reconcileGate } from "./reconcile.js";
import { readMutationReport } from "./report.js";

/**
 * What to type to bank a measurement, when the caller has not said.
 *
 * TRUE OF EVERY CALLER, WHICH IS THE ONLY KIND OF DEFAULT THIS TERM CAN HAVE. A project's real
 * instruction is its own sentence — its script, its runner, its file — so one written here would be
 * somebody else's, sitting inside a message, reached only on the runs nobody reads twice. What is
 * left that is true anywhere is this command itself, which can bank a measurement and is already in
 * the reader's hand.
 */
const BANK_IT_WITH = "this same command, asked to bank the measurement";

/** Everything the run was told: which gate, which tree, and what to call things. */
interface Reconciliation {
  readonly gate: string;
  readonly root: string;
  readonly reportPath: string;
  readonly recordFile: string;
  readonly bankCommand: string;
  readonly banking: boolean;
}

/**
 * A fault in how this was CALLED — the ending reserved for "this run is broken".
 *
 * ONLY how it was called. What the record holds and what the report measured never come here: a
 * gate that lost kills is the code being wrong, which is a verdict, and a verdict has an ending of
 * its own two lines below.
 */
function usage(problem: string): never {
  console.error(`ratchet: ${problem}`);
  console.error(
    "ratchet: usage — --gate <name> --report <path> [--root <dir>] " +
      "[--record-file <path>] [--bank-command <text>] [--record]",
  );
  process.exit(2);
}

/** The value a `--flag` was given, or undefined where the flag is absent. */
function flagValue(flags: readonly string[], name: string): string | undefined {
  const at = flags.indexOf(name);
  if (at === -1) return undefined;
  const value = flags[at + 1];
  // Two dashes are a flag, never a value: see the argument at the head of this file.
  if (value === undefined || value.startsWith("--")) usage(`${name} needs a value`);
  return value;
}

/** Read the command line into the reconciliation it names. */
function reconciliationOf(argv: readonly string[]): Reconciliation {
  return {
    gate: flagValue(argv, "--gate") ?? usage("--gate names the gate to reconcile"),
    reportPath:
      flagValue(argv, "--report") ?? usage("--report names where this gate's run left its report"),
    root: flagValue(argv, "--root") ?? ".",
    recordFile: flagValue(argv, "--record-file") ?? RECORD_FILE,
    bankCommand: flagValue(argv, "--bank-command") ?? BANK_IT_WITH,
    banking: argv.includes("--record"),
  };
}

const asked = reconciliationOf(process.argv.slice(2));
const verdict = reconcileGate({
  gate: asked.gate,
  root: asked.root,
  reportPath: asked.reportPath,
  bankCommand: asked.bankCommand,
  recordFile: asked.recordFile,
});

// EVERY RUN, AND BEFORE ANYTHING ELSE HAPPENS. The verdict is what was asked for, whichever way the
// run goes on to end, and a reader whose run banked a measurement still wants to know what it was
// that made banking worth doing.
console.log(verdict.message);

if (!asked.banking) process.exit(verdict.ok ? 0 : 1);

// A run with nothing measured has nothing to bank, and the verdict above has already said so in the
// sentence that belongs to it. There is no second reading of the same absence to write here.
const read = readMutationReport(asked.gate, join(asked.root, asked.reportPath));
if (!read.ok) process.exit(1);

try {
  const at = bankRaisedRecord(asked.root, asked.recordFile, asked.gate, read.measurement);

  console.log(
    `ratchet: ${asked.gate} — the record at ${at} now states ` +
      `${read.measurement.detected} of ${read.measurement.total}.`,
  );
} catch (raised) {
  // BY ITS OWN TYPE, AND NOTHING WIDER. A blanket catch here would answer a record nobody can read,
  // a tree that is not there and a fault nobody has thought of yet with the one sentence written for
  // a run that simply had nothing to bank — which is the reading that sends its reader hunting for a
  // measurement when what they have is a broken file.
  if (!(raised instanceof FallRefusedError)) throw raised;

  console.error(raised.message);
  process.exit(1);
}
