#!/usr/bin/env node
/**
 * THE COMMAND — `pnpm fitness:bank`, which reads how many fitness rows the tree holds and writes
 * that number into the record, upward only (@SCN-SLF-004, 3F-3192).
 *
 *     [--root <dir>] [--record-file <path>]
 *
 * TWO FLAGS, AND NEITHER OF THEM IS AN ESCAPE HATCH. `--root` names the tree, so the arm that
 * proves this works can plant one outside the working directory; `--record-file` names where that
 * tree files its bars, because which file holds a project's bars is that project's own fact. There
 * is no third flag and there must not be one: `quality-thresholds.yml`'s own header states why the
 * absence is deliberate — an escape hatch a tool holds open is one nobody ever has to justify, and
 * it would be reached for on the first red night rather than the first honest one. A record that
 * must come down comes down by hand, with the reason in the commit. @SCN-SLF-004's @unit arm reads
 * these bytes to say so rather than trusting them.
 *
 * A FLAG NEVER SWALLOWS THE NEXT FLAG AS ITS VALUE. `--root --record-file` read leniently is a tree
 * sought at a path called `--record-file`, found empty, and banked as zero rows — a reading that
 * sends its reader hunting for a deleted check when what happened was a typo one character long.
 * Anything beginning with two dashes is a flag, never a value.
 *
 * THREE ENDINGS, AND THE THIRD IS THE ONE WORTH BUILDING FOR. A banking that raised the record ends
 * cleanly; one that had nothing to bank, or a record that cannot be read, ends in failure carrying
 * the sentence that is the only part anybody needed. A run CALLED wrong takes the ending this
 * repository reserves for "this run is broken" rather than either, because a fall reported as a
 * usage fault sends somebody to their command line and a usage fault reported as a fall sends them
 * to their manifest.
 *
 * A REFUSAL IS AN EXPECTED ENDING RATHER THAN A CRASH. Asking whether there is anything to bank is
 * what an operator types, and most of the time the answer is no. Handed out as an unhandled throw
 * it arrives as a stack trace — a reading that says the tool broke where what happened was the tool
 * working.
 */

import { RECORD_FILE } from "../../packages/spec-controller/src/mutation-ratchet/reconcile.js";
import { MalformedRecordError } from "../../packages/spec-controller/src/mutation-ratchet/record.js";

import { bankFitnessRows, FitnessFallRefusedError } from "./fitnessRowBank.js";

/** A fault in how this was CALLED — the ending reserved for "this run is broken". */
function usage(problem: string): never {
  console.error(`fitness:bank: ${problem}`);
  console.error("fitness:bank: usage — [--root <dir>] [--record-file <path>]");
  process.exit(2);
}

/** The value a `--flag` was given, or undefined where the flag is absent. */
function flagValue(argv: readonly string[], name: string): string | undefined {
  const at = argv.indexOf(name);
  if (at === -1) return undefined;
  const value = argv[at + 1];
  if (value === undefined || value.startsWith("--")) usage(`${name} needs a value`);
  return value;
}

const argv = process.argv.slice(2);
// The tree defaults to a RELATIVE one rather than to anywhere this file can find: `.` is the
// caller's own working directory, resolved at the moment of the read.
const root = flagValue(argv, "--root") ?? ".";
const recordFile = flagValue(argv, "--record-file") ?? RECORD_FILE;

try {
  const banked = bankFitnessRows(root, recordFile);

  console.log(
    `fitness:bank: the record at ${banked.at} now states ${banked.rows} fitness row(s), ` +
      "read off this tree's own manifest.",
  );
} catch (raised) {
  // BY THEIR OWN TYPES, AND NOTHING WIDER. A blanket catch here would answer a tree that is not
  // there, and a fault nobody has thought of yet, with the sentence written for a run that simply
  // had nothing to bank — the reading that sends its reader hunting for a lost row when what they
  // have is a broken path.
  if (!(raised instanceof FitnessFallRefusedError) && !(raised instanceof MalformedRecordError)) {
    throw raised;
  }

  console.error(raised.message);
  process.exit(1);
}
