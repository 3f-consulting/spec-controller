/**
 * WHAT EACH BUNDLED COMMAND'S OWN WORK LOOKS LIKE, and how to watch it happen somewhere nothing is
 * installed (@SCN-ACT-001).
 *
 * SHARED BY BOTH TIERS ON PURPOSE. The @unit pin and the @integration arm assert the same thing
 * about the same three files, and what makes that assertion worth anything is that "its own work"
 * asks something rather than "the process ended cleanly". A bundle missing a dependency it
 * needed exits non-zero, but so does one handed a bad flag, and a bundle that silently inlined
 * nothing at all can still print a usage line and stop. Written once, the bar is the same in both
 * places; written twice, one of them softens.
 *
 * THE BUNDLE IS COPIED OUT OF THE REPOSITORY BEFORE IT IS RUN, and that is the whole probe. Left
 * where it is committed, node resolves a bare import by walking up from the file — and every parent
 * of `.github/actions/` in this checkout has this workspace's `node_modules` above it, so a bundle
 * that inlined nothing would run here perfectly and die on the first cross-repository `uses:`. Run
 * from a temporary directory there is no such ancestor, which is the tree a caller actually has.
 *
 * AND EACH PROBE PLANTS THE TREE ITS COMMAND READS. These three do file work — they find something
 * a producer left, and leave something a later step collects — so "did its own work" is asserted
 * against what is on disk afterwards, never against what was printed. Only the ratchet is asserted
 * through its output, because a verdict is the thing it produces.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/** How a spawned bundle ended, and everything it said on the way. */
export interface BundleRun {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

/** One action's bundled command, and what it means for that command to have done its work. */
export interface BundledWorkProbe {
  /** The action directory the bundle travels with — the key into `ACTION_BUNDLES`. */
  readonly action: string;
  /** Plant the tree this command reads at `root`, and answer with the command line it is run on. */
  readonly plant: (root: string) => readonly string[];
  /**
   * The fault in what the command left behind, or `undefined` where it did its work.
   *
   * A SENTENCE RATHER THAN A BOOLEAN, because the two ways this fails read nothing alike: a bundle
   * that never resolved says so on stderr, and a bundle that ran and wrote the wrong thing says
   * nothing at all. Whichever it is, the fault is what the reader gets.
   */
  readonly faultIn: (run: BundleRun, root: string) => string | undefined;
}

/** The moment the measurement probes drive their clocks with, so every age below is a stated fact. */
const MEASURED_AT = "2026-08-25T03:17:00.000Z";

/** One measurement row, the shape a run's own producers post and a later run borrows. */
const A_MEASURED_ROW = { scnId: "SCN-ACT-001", checkTag: "action-bundles", measured: 92.5 };

/** Where a run's own producers leave what they measured — the path the persist reads by construction. */
const RUN_ARTEFACT = path.join("runs", "self-balance", "measurements.json");

/** Write `contents` at `at`, making whatever parent directories it needs on the way. */
function plantFile(at: string, contents: string): void {
  mkdirSync(path.dirname(at), { recursive: true });
  writeFileSync(at, contents, "utf8");
}

/** What is at `at`, or `undefined` where nothing readable is there. */
function readOrNothing(at: string): string | undefined {
  try {
    return readFileSync(at, "utf8");
  } catch {
    return undefined;
  }
}

/** The measurement rows an artefact at `at` carries, or `undefined` where there is no reading it. */
function rowsIn(at: string): unknown {
  const source = readOrNothing(at);
  if (source === undefined) return undefined;
  try {
    return (JSON.parse(source) as { measurements?: unknown }).measurements;
  } catch {
    return undefined;
  }
}

/** The one row every probe plants, as the artefact it was read back out of would spell it. */
const THE_ROW_BACK = [A_MEASURED_ROW];

/** How a run that neither wrote nor said what it should be reported. */
function nothingDone(what: string, run: BundleRun): string {
  return `${what}; it ended ${run.status}, saying: ${run.stdout}${run.stderr}`;
}

/**
 * The persist: it finds what a run measured at the one path such a thing is at, and leaves a DATED
 * copy of it where an upload will collect.
 *
 * The date is what is asserted, and it is the field that only this command writes: an artefact
 * carrying the rows and no readable moment is one a later run reads as a schedule that lapsed.
 */
const PERSIST: BundledWorkProbe = {
  action: "persist-measurements",
  plant(root) {
    plantFile(path.join(root, RUN_ARTEFACT), JSON.stringify({ measurements: [A_MEASURED_ROW] }));
    return ["--to", "collected/measurements.json", "--root", root, "--now", MEASURED_AT];
  },
  faultIn(run, root) {
    const at = path.join(root, "collected", "measurements.json");
    const source = readOrNothing(at);
    if (source === undefined) return nothingDone(`the persist left nothing at ${at}`, run);
    const dated = JSON.parse(source) as { measuredAt?: unknown; measurements?: unknown };
    if (dated.measuredAt !== MEASURED_AT) {
      return `the persist must date what it leaves with the clock it measured on; it wrote ${JSON.stringify(dated.measuredAt)}`;
    }
    if (JSON.stringify(dated.measurements) !== JSON.stringify(THE_ROW_BACK)) {
      return `the persist must carry the row the run measured; it wrote ${JSON.stringify(dated.measurements)}`;
    }
    return undefined;
  },
};

/**
 * The restore: it reads a dated artefact somebody's download landed, and — while the date is still
 * inside the window it was given — posts the rows into the canonical path this run's own ledger reads.
 */
const RESTORE: BundledWorkProbe = {
  action: "restore-measurements",
  plant(root) {
    plantFile(
      path.join(root, "downloaded", "measurements.json"),
      JSON.stringify({ measuredAt: MEASURED_AT, measurements: [A_MEASURED_ROW] }),
    );
    // An hour after it was measured, against a window of a day: inside, and stated rather than
    // waited for.
    const anHourLater = new Date(Date.parse(MEASURED_AT) + 60 * 60 * 1000).toISOString();
    return [
      "--from",
      "downloaded/measurements.json",
      "--max-age",
      "86400",
      "--root",
      root,
      "--now",
      anHourLater,
    ];
  },
  faultIn(run, root) {
    const at = path.join(root, RUN_ARTEFACT);
    const rows = rowsIn(at);
    if (rows === undefined) return nothingDone(`the restore posted nothing at ${at}`, run);
    if (JSON.stringify(rows) !== JSON.stringify(THE_ROW_BACK)) {
      return `the restore must post the row it borrowed; it posted ${JSON.stringify(rows)}`;
    }
    return undefined;
  },
};

/**
 * The ratchet: it reads a record stating a gate's bar, counts a run's report, and reaches a verdict.
 *
 * THE ONE PROBE THAT ASSERTS THROUGH THE OUTPUT, because a verdict is what this command produces
 * and it writes no file unless asked to bank one. And the one probe that proves the bundling did
 * anything at all: the record is YAML, and `yaml` is a real runtime dependency this command reaches
 * for. A bundle that inlined nothing resolves it out of the workspace it is run from — and there
 * is no workspace here.
 */
const RATCHET: BundledWorkProbe = {
  action: "mutation-ratchet",
  plant(root) {
    plantFile(
      path.join(root, "quality-thresholds.yml"),
      // `slack-mutants` is stated because the record reader requires it: an allowance nobody
      // wrote is not the same fact as an allowance of none, and this gate has none.
      "mutation-gates:\n  the-gate:\n    detected: 2\n    total: 3\n    slack-mutants: 0\n",
    );
    plantFile(
      path.join(root, "reports", "mutation.json"),
      JSON.stringify({
        files: {
          "src/one.ts": {
            mutants: [{ status: "Killed" }, { status: "Killed" }, { status: "Survived" }],
          },
        },
      }),
    );
    return ["--gate", "the-gate", "--report", "reports/mutation.json", "--root", root];
  },
  faultIn(run) {
    if (run.status !== 0) {
      return nothingDone("a run sitting exactly on its record stands, so the ratchet ends cleanly", run);
    }
    // BOTH COUNTS, out of a record only `yaml` could have read and a report only the counting could
    // have reached. A bundle that ended cleanly having read neither prints neither.
    if (!run.stdout.includes("2") || !run.stdout.includes("3")) {
      return `the ratchet must state the counts it reconciled; it said: ${run.stdout}`;
    }
    return undefined;
  },
};

/** Every bundled command this repository ships, and what its own work is. */
export const BUNDLED_WORK: readonly BundledWorkProbe[] = [PERSIST, RESTORE, RATCHET];

/** The repository this suite is running out of. */
export function repoRoot(): string {
  return execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
}

/**
 * Run one action's bundle in a tree that holds nothing at all, and answer with the fault in what it
 * did — or `undefined` where it did its work.
 *
 * @param bundle the committed bundle's repository-relative path, as `ACTION_BUNDLES` names it
 * @param probe what this command's own work is, and the tree it needs to do it
 */
export function faultRunningBundleBare(bundle: string, probe: BundledWorkProbe): string | undefined {
  const bare = mkdtempSync(path.join(tmpdir(), `action-bundle-${probe.action}-`));
  try {
    // COPIED OUT, NOT RUN IN PLACE: see the argument at the head of this file. Absent, this is the
    // one thing the whole probe cannot see.
    const runnable = path.join(bare, `${probe.action}.mjs`);
    const committed = path.join(repoRoot(), bundle);
    const carried = readOrNothing(committed);
    if (carried === undefined) return `there is no bundle at ${bundle} to run`;
    copyFileSync(committed, runnable);

    const argv = probe.plant(bare);
    const run = spawnSync(process.execPath, [runnable, ...argv], { cwd: bare, encoding: "utf8" });
    if (run.error !== undefined) return `the bundle at ${bundle} would not run: ${run.error.message}`;
    return probe.faultIn(
      { status: run.status, stdout: run.stdout ?? "", stderr: run.stderr ?? "" },
      bare,
    );
  } finally {
    rmSync(bare, { recursive: true, force: true });
  }
}
