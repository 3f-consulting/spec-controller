#!/usr/bin/env node
/**
 * THE MEASUREMENT RESTORE — a measurement an earlier run persisted, posted into this run's
 * artefact while it is still young enough to be about this code (@SCN-MUT-009, @SCN-MUT-010).
 *
 *     spec-controller-restore-measurements --from <path> --max-age <seconds> [--root <dir>] [--now <iso>]
 *
 * WHY A RUN POSTS A NUMBER IT DID NOT MEASURE. Some checks cost more than a per-push ladder can
 * afford, so they run on a schedule and their number is last night's. Reading last night's number
 * as though it were this push's would be reporting a measurement about a tree nobody measured;
 * refusing to read it at all would leave the bar it settles reconciling `missing` on every push,
 * which reds a build over a cadence rather than over the code. What makes the borrowing honest is
 * an EXPIRY: the number is posted only while it is still close enough to true, and past that it
 * is not posted at all — the row then reads `missing`, which is the same reading a scheduled job
 * that quietly stopped running produces. A pipeline nobody runs cannot go quiet.
 *
 * GENERIC, AND DELIBERATELY SO. Every term this needs is an argument: WHICH artefact (`--from`),
 * HOW LONG its number stays worth posting (`--max-age`), and WHICH tree it posts into (`--root`).
 * Nothing here names a check, a runner, a workflow or a repository — the schedule that produced
 * the artefact is the caller's business, and a second repository with a different cadence changes
 * a flag rather than this file. The window is a flag rather than a manifest field for the same
 * reason: a manifest is about BARS, and a bar is a fact about the code, where a cadence is a fact
 * about the pipeline reading it.
 *
 * IT POSTS BESIDE, NEVER OVER (@SCN-CIP-011). A push has as many measurements as it has measured
 * checks, and they all post into the one artefact `balance --measurements` reads, so what is
 * already there is read first and the restored rows are keyed in among it. Writing over it would
 * leave every measurement this push made for itself reconciling missing.
 *
 * AND IT IS NOT AN ARBITER (@SCN-CIP-010). Having nothing fresh to post is not a fault of this
 * step's — it is the ordinary reading of a schedule that has lapsed, and the place that reports
 * it is the ledger, out loud, on the row that owed the measurement. So the only non-zero exit
 * here is 2, and only for a fault in how this was CALLED.
 *
 * `--now` EXISTS SO A TEST CAN DRIVE THE CLOCK, and nothing else. A window's edges cannot be
 * staged into a real run — waiting a day to assert one is not a test — so the clock is an input
 * to the reader beneath this and a flag on this. CI never passes it.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  MEASUREMENT_ARTEFACT_PATH,
  measurementArtefactWithAll,
} from "./artefact.js";
import { freshMeasurementsOf } from "./freshness.js";

/** Everything the restore was told: which artefact, how long it counts for, and where to post. */
interface Restore {
  readonly from: string;
  readonly maxAgeSeconds: number;
  readonly root: string;
  readonly now: Date;
}

/**
 * A fault in how the restore was CALLED — exit 2, the code `lint:self-balance` and the ladder
 * emitter already reserve for "this run is broken" as against "the code is wrong".
 *
 * ONLY how it was called. What the artefact CONTAINS never comes here: an artefact that is
 * missing, unreadable or too old is a push with nothing to post, not a step that was misused, and
 * the verdict on a measurement that never arrived belongs to the ledger like every other verdict
 * on this axis.
 */
function usage(problem: string): never {
  console.error(`restore measurements: ${problem}`);
  console.error(
    "restore measurements: usage — --from <path> --max-age <seconds> [--root <dir>] [--now <iso>]",
  );
  process.exit(2);
}

/** The value a `--flag` was given, or undefined where the flag is absent. */
function flagValue(flags: readonly string[], name: string): string | undefined {
  const at = flags.indexOf(name);
  if (at === -1) return undefined;
  const value = flags[at + 1];
  // A flag swallowing the next flag as its value would restore from a path called "--max-age",
  // find nothing, and report a lapsed schedule where what happened was a typo.
  if (value === undefined || value.startsWith("--")) usage(`${name} needs a value`);
  return value;
}

/** The window, in seconds, read from what the caller wrote. */
function windowIn(flags: readonly string[]): number {
  const written = flagValue(flags, "--max-age") ?? usage("--max-age names the window, in seconds");
  const seconds = Number(written);
  // A window nobody can read is not a window of zero: zero would silently drop every measurement
  // and read exactly like a schedule that has lapsed, which is the one reading this must never
  // manufacture.
  if (!Number.isFinite(seconds) || seconds < 0) {
    usage(`--max-age must be a number of seconds; it was given ${JSON.stringify(written)}`);
  }
  return seconds;
}

/** This run's clock — the caller's where one was given, otherwise the real one. */
function clockIn(flags: readonly string[]): Date {
  const written = flagValue(flags, "--now");
  if (written === undefined) return new Date();
  const now = new Date(written);
  if (Number.isNaN(now.getTime())) usage(`--now must be a moment; it was given ${written}`);
  return now;
}

/** Read the command line into the restore it names. */
function restoreOf(argv: readonly string[]): Restore {
  return {
    from: flagValue(argv, "--from") ?? usage("--from names the artefact to restore"),
    maxAgeSeconds: windowIn(argv),
    root: flagValue(argv, "--root") ?? process.cwd(),
    now: clockIn(argv),
  };
}

/** What is at a path, or nothing where there is nothing readable there. */
function sourceAt(at: string): string | undefined {
  try {
    return readFileSync(at, "utf8");
  } catch {
    // A schedule that has not run yet, an artefact nobody uploaded, a download that found
    // nothing: all of them are this push having no measurement to restore, which is the ledger's
    // to report and not a fault of this step's.
    return undefined;
  }
}

const restore = restoreOf(process.argv.slice(2));

// Resolved against the tree being posted into, so a relative name and an absolute one both work
// and neither is relative to wherever this happened to be invoked from.
const persistedPath = path.resolve(restore.root, restore.from);
const fresh = freshMeasurementsOf(
  sourceAt(persistedPath),
  restore.now,
  restore.maxAgeSeconds,
);

if (fresh.length === 0) {
  // ON STDERR AND NOT AS A VERDICT. This is the reason there is no measurement, which is a fact
  // about the RUN rather than about the code; the code's own report is the row that will read
  // `missing`.
  console.error(
    `restore measurements: nothing fresh at ${persistedPath} within ${restore.maxAgeSeconds}s, ` +
      "so nothing is posted. The rows it would have settled read missing, which is the true " +
      "sentence: no measurement arrived.",
  );
  process.exit(0);
}

const artefactPath = path.join(restore.root, MEASUREMENT_ARTEFACT_PATH);
// The parent is made rather than assumed: `runs/` is gitignored, so on a fresh clone the first
// contributor to a job is the thing that creates it.
mkdirSync(path.dirname(artefactPath), { recursive: true });
writeFileSync(
  artefactPath,
  `${JSON.stringify(
    measurementArtefactWithAll(fresh, sourceAt(artefactPath)),
    null,
    2,
  )}\n`,
  "utf8",
);

// EVERY RUN, AND AFTER THE WRITE. Both terms of each address are named, because a job has as many
// of these rows as it has measured checks and a reading nobody can attribute is a reading nobody
// can act on. It stops short of a verdict for the reason the exit code does.
for (const row of fresh) {
  console.log(
    `restore measurements: ${row.scnId} ${row.checkTag} — restored ${row.measured}, ` +
      "measured inside its window. The verdict on that is the ledger's.",
  );
}
