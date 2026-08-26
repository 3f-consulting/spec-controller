#!/usr/bin/env node
/**
 * THE MEASUREMENT PERSIST — what a scheduled run measured, dated with the clock it measured on and
 * left where an upload will collect it (@SCN-MUT-012), and nothing at all where the run had
 * nothing worth persisting (@SCN-MUT-013).
 *
 *     spec-controller-persist-measurements --to <path> [--root <dir>] [--now <iso>]
 *
 * THE OTHER HALF OF THE RESTORE, AND IT WAS THE HALF THAT WAS NOT SHIPPED. `restoreCli.ts` posts a
 * measurement a scheduled run persisted, while it is still young enough to be about this code, and
 * it reads that age off a `measuredAt` the borrowing run never wrote. Something upstream has to
 * write it. Until now that something was a `jq` line inside one repository's own workflow, so the
 * reading half shipped as product and the writing half shipped as a shell snippet — and a second
 * repository standing a nightly up got the reader for free and copied the writer. Half a mechanism
 * shipped is a mechanism that gets forked.
 *
 * THE FIXED END IS THE RUN ARTEFACT; THE VARIABLE END IS THE TRANSPORT. The restore's `--from` is
 * where a download landed and it posts into the canonical path; this reads the canonical path and
 * its `--to` is where an upload will collect. So `--to` is the true mirror of `--from`, and there
 * is no `--from` here to mirror: what a run measured is at `MEASUREMENT_ARTEFACT_PATH` by
 * construction, and a flag naming it would be a flag that can be pointed at the wrong thing.
 *
 * GENERIC, AND DELIBERATELY SO. Nothing here names a check, a runner, a workflow or a repository —
 * which schedule produced these rows and who borrows them are facts about the pipeline. Nor is the
 * WINDOW here: how long a number stays worth posting is a fact about the cadence of whoever
 * borrows it, and it belongs to the restore's caller. This writes a moment and says nothing about
 * what it is worth.
 *
 * IT WRITES A COPY, IT DOES NOT DATE IN PLACE. The run's own artefact is left exactly as its
 * producers left it (@SCN-CIP-009, @SCN-CIP-011): only an artefact that OUTLIVES its run needs a
 * date on it, and a scheduled job that also reconciled would otherwise reconcile against a dated
 * copy of itself.
 *
 * `--now` EXISTS SO A TEST CAN DRIVE THE CLOCK, and nothing else — the same flag, for the same
 * reason, as on the restore. A window's edges cannot be staged into a real run, so the moment is
 * an input to the pure half beneath this and a flag on this. CI never passes it.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { MEASUREMENT_ARTEFACT_PATH } from "./artefact.js";
import { datedArtefactOf } from "./dating.js";

/** Everything the persist was told: where to leave it, which tree it reads, and when it measured. */
interface Persist {
  readonly to: string;
  readonly root: string;
  readonly now: Date;
}

/**
 * A fault in how the persist was CALLED — exit 2, the code the restore, `lint:self-balance` and the
 * ladder emitter already reserve for "this run is broken" as against "the code is wrong".
 *
 * ONLY how it was called, exactly as on the restore. What the run MEASURED never comes here: a run
 * that measured nothing is a schedule with nothing to hand on, not a step that was misused.
 */
function usage(problem: string): never {
  console.error(`persist measurements: ${problem}`);
  console.error(
    "persist measurements: usage — --to <path> [--root <dir>] [--now <iso>]",
  );
  process.exit(2);
}

/** The value a `--flag` was given, or undefined where the flag is absent. */
function flagValue(flags: readonly string[], name: string): string | undefined {
  const at = flags.indexOf(name);
  if (at === -1) return undefined;
  const value = flags[at + 1];
  // A flag swallowing the next flag as its value would write the artefact to a file called
  // "--root", which the upload would then find nothing at and report as a sweep that measured
  // nothing — a lapsed schedule reported where what happened was a typo.
  if (value === undefined || value.startsWith("--")) usage(`${name} needs a value`);
  return value;
}

/** The moment the run measured — the caller's where one was given, otherwise the real one. */
function clockIn(flags: readonly string[]): Date {
  const written = flagValue(flags, "--now");
  if (written === undefined) return new Date();
  const now = new Date(written);
  if (Number.isNaN(now.getTime())) usage(`--now must be a moment; it was given ${written}`);
  return now;
}

/** Read the command line into the persist it names. */
function persistOf(argv: readonly string[]): Persist {
  return {
    to: flagValue(argv, "--to") ?? usage("--to names where to leave what this run measured"),
    root: flagValue(argv, "--root") ?? process.cwd(),
    now: clockIn(argv),
  };
}

/** What is at a path, or nothing where there is nothing readable there. */
function sourceAt(at: string): string | undefined {
  try {
    return readFileSync(at, "utf8");
  } catch {
    return undefined;
  }
}

const persist = persistOf(process.argv.slice(2));

const runArtefactPath = path.join(persist.root, MEASUREMENT_ARTEFACT_PATH);
const dated = datedArtefactOf(sourceAt(runArtefactPath), persist.now);

if (dated === null) {
  // NO FILE, NOT AN EMPTY ONE (@SCN-MUT-013). `if-no-files-found: ignore` is what keeps the upload
  // quiet, and it is the ABSENCE of the file that reaches it; a dated artefact holding no row
  // would be collected, borrowed, and read to zero rows in silence.
  //
  // ON STDERR AND NOT AS A VERDICT, the restore's own stance in the mirror direction. A sweep that
  // measured nothing is a fact about the RUN rather than a fault of this step's, so it ends
  // cleanly and the rows it would have settled read `missing` — already the true sentence.
  console.error(
    `persist measurements: nothing worth persisting at ${runArtefactPath}, so nothing is left ` +
      "for an upload to collect. The rows it would have settled read missing, which is the true " +
      "sentence: this run measured nothing.",
  );
  process.exit(0);
}

// Resolved against the tree that was measured, so a relative name and an absolute one both work
// and neither is relative to wherever this happened to be invoked from — the restore's own reading
// of `--from`, and for the same reason.
const persistedPath = path.resolve(persist.root, persist.to);
// The parent is made rather than assumed: an upload's collection point is whatever the caller
// named, so on any real run the first thing to write there is the thing that creates it.
mkdirSync(path.dirname(persistedPath), { recursive: true });
writeFileSync(persistedPath, `${JSON.stringify(dated, null, 2)}\n`, "utf8");

// EVERY ROW, AND AFTER THE WRITE. Both terms of each address are named, because a run has as many
// of these rows as it has measured checks and a reading nobody can attribute is a reading nobody
// can act on. It stops short of a verdict for the reason the restore's own report does: what a
// number is worth is the borrowing run's ledger's to say.
for (const row of dated.measurements) {
  console.log(
    `persist measurements: ${row.scnId} ${row.checkTag} — persisted ${row.measured}, ` +
      `measured ${dated.measuredAt}. How long that stays worth posting is the borrower's.`,
  );
}
