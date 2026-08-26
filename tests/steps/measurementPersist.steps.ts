/**
 * @integration for the persisting Rule of features/mutation-score.feature — a scheduled run
 * persists what it measured, dated with the clock it measured on.
 *
 * @SCN-MUT-012 and @SCN-MUT-013 — the bidirectional evidence markers (Evidence Manifesto §9) on
 * every step block below. Their @unit pins live in
 * packages/spec-controller/src/measurements/dating.test.ts.
 *
 * ITS OWN STEP TEXT, EVERY LINE OF IT. Cucumber's step registry is process-wide, and 3F-2772 is
 * open against exactly this hazard: tests/steps/ciRunTime.steps.ts and
 * tests/steps/mutationScore.steps.ts both register bare measurement phrases over their own
 * module-local fixtures, and a phrase of that shape written here would bind one of those files'
 * scenarios to a tree this file planted — green, and about the wrong run. Every step below names
 * persisting, or a later run reading what was persisted. Verified by
 * `cucumber-js --dry-run --format usage`, which prints each definition against the feature lines
 * it actually binds.
 *
 * WHY THIS ARM RUNS THE REAL PERSIST. The @unit pin beside it drives the clock and states both
 * ages; what it cannot reach is everything between a command line and a file on disk — the
 * argument parse, the run artefact found at the path a producer left it rather than at one this
 * step passed in, the parent directory of a `--to` nobody has created yet, and the encoding. That
 * is where a pure half right in isolation and wired wrong persists nothing, and a later run
 * reconciles as a sweep that never ran.
 *
 * AND IT READS BACK THROUGH THE REAL READER. `freshMeasurementsOf` is the reader the restore
 * uses and the only thing in this repository with an opinion about `measuredAt`, so the moment
 * the persist wrote is asserted by asking the borrower's question of it — twice, either side of
 * one window — rather than against a literal of this file's own (the @SCN-CIP-009 discipline).
 */

import { Given, When, Then, After } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

import { freshMeasurementsOf } from "../../packages/spec-controller/src/measurements/freshness.js";
import {
  MEASUREMENT_ARTEFACT_PATH,
  measurementsOf,
  type Measurement,
} from "../../packages/spec-controller/static-checks/measurementArtefact.js";

const repoRoot = process.cwd();
const persist = path.join(
  repoRoot,
  "packages",
  "spec-controller",
  "src",
  "measurements",
  "persistCli.ts",
);
const tsxBin = path.join(repoRoot, "node_modules", ".bin", "tsx");

/**
 * Where the run is told to leave what it persists — a name of this fixture's own choosing, in a
 * directory nothing has created.
 *
 * NOT THE PATH THE RUN'S OWN PRODUCERS POSTED TO, and not a constant anywhere in the persist. The
 * artefact a scheduled job leaves is collected by whoever uploads it, which is why it arrives as
 * an argument; a fixture reusing the run artefact's own path would green a persist that wrote
 * over the thing it was reading.
 */
const PERSISTED_ARTEFACT = "persisted/nightly-measurements.json";

/** How many milliseconds an hour is, so the ages below read in hours. */
const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

/** The moment the run measured, handed to the persist so the ages below are stated. */
const MEASURED_AT = new Date("2026-08-25T03:17:00Z");

const plantedRoots: string[] = [];

let plantedRoot: string;

/** Every row the run's own producers posted before it persisted anything. */
let runRows: readonly Measurement[];

/** The window the borrowing run reads this artefact against, as the scenario states it. */
let windowSeconds: number;

/** How the persist itself ended, and what it said if it complained. */
let persistEndedWith: number | null;
let persistComplained: string;

After(function () {
  for (const root of plantedRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

// @SCN-MUT-012
Given(
  "a run that measured {float} for {string} on {string} and {float} for {string} on {string}",
  function (
    firstMeasured: number,
    firstCheck: string,
    firstScn: string,
    secondMeasured: number,
    secondCheck: string,
    secondScn: string,
  ) {
    // TWO ROWS ON TWO CHECKS, because a run has as many measurements as it has measured checks and
    // the one thing "persists what it measured" must not come to mean is "persists the last one".
    runRows = [
      { scnId: firstScn, checkTag: firstCheck, measured: firstMeasured },
      { scnId: secondScn, checkTag: secondCheck, measured: secondMeasured },
    ];

    plantedRoot = mkdtempSync(path.join(tmpdir(), "measurement-persist-"));
    plantedRoots.push(plantedRoot);

    // Planted at the canonical path rather than at one this step passes in: what a run measured is
    // there by construction, which is why the persist takes no `--from` and why a fixture that
    // named the source would green a persist that had been told where to look.
    const runArtefactPath = path.join(plantedRoot, MEASUREMENT_ARTEFACT_PATH);
    mkdirSync(path.dirname(runArtefactPath), { recursive: true });
    writeFileSync(
      runArtefactPath,
      `${JSON.stringify({ measurements: runRows }, null, 2)}\n`,
      "utf8",
    );
  },
);

// @SCN-MUT-012, @SCN-MUT-013
// ONE PERSIST, TWO SCENARIOS ABOUT IT. Both drive the same command line over whatever tree their
// own Given planted, and what separates them is what was there to persist — so a second spelling
// of this step would be two ways of invoking one thing, which is one more thing to keep agreeing.
When("that run persists what it measured, for a later run to borrow", function () {
  const run = spawnSync(
    tsxBin,
    [
      persist,
      "--to",
      PERSISTED_ARTEFACT,
      "--root",
      plantedRoot,
      // CI never passes this; the fixture does, so the ages asserted below are stated facts
      // rather than ones that would have to be waited for.
      "--now",
      MEASURED_AT.toISOString(),
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
  assert.equal(
    run.error,
    undefined,
    `the persist must run; it failed to spawn: ${run.error?.message}`,
  );
  persistEndedWith = run.status;
  persistComplained = run.stderr ?? "";
});

// @SCN-MUT-012
Then("the artefact it persisted carries both of those measurements", function () {
  assert.equal(
    persistEndedWith,
    0,
    `the persist must end cleanly having written; it ended ${persistEndedWith}: ${persistComplained}`,
  );
  // Read through the reader that validates a row, never against a literal of this file's own: a
  // row this file called well-formed and that reader dropped would reach a later run's ledger as
  // a bar reconciling `missing`, which reads as a sweep that never ran.
  assert.deepEqual(
    measurementsOf((JSON.parse(persistedSource()) as { measurements?: unknown }).measurements),
    runRows,
    `the persist must carry every row the run measured; it wrote ${persistedSource()}`,
  );
  // AND IT WROTE BESIDE, NOT OVER. Dating the run's own artefact in place would leave a scheduled
  // job that also reconciled reconciling against a dated copy of itself, and would give whoever
  // uploads it no way to pin the name the restore's `find` depends on.
  assert.deepEqual(
    measurementsOf(
      (
        JSON.parse(readFileSync(path.join(plantedRoot, MEASUREMENT_ARTEFACT_PATH), "utf8")) as {
          measurements?: unknown;
        }
      ).measurements,
    ),
    runRows,
    "the run's own artefact is what it was; the persist writes a copy elsewhere, not a date onto it",
  );
});

// @SCN-MUT-012
Then(
  "a run reading that artefact {int} hours later against a {int}-hour window finds both still fresh",
  function (ageHours: number, windowHours: number) {
    windowSeconds = windowHours * 60 * 60;
    assert.deepEqual(
      freshMeasurementsOf(persistedSource(), hoursAfterMeasuring(ageHours), windowSeconds),
      runRows,
      `a run reading this ${ageHours} hours later must find both rows; it read ${persistedSource()}`,
    );
  },
);

// @SCN-MUT-012
Then("a run reading it one second past that same window finds neither", function () {
  // THE OTHER SIDE IS WHAT MAKES THE READING ABOVE AN ASSERTION. Any date in the past satisfies a
  // single age, so an artefact stamped with the epoch — or with whenever this suite happened to
  // run — passes the step before this one and fails here. The pair pins the moment; neither alone
  // does, and a `measuredAt` no reader can parse fails both.
  // The same window the step above read, carried rather than restated: two spellings of one
  // number is one more pair of things that agree until the day either is edited.
  const oneSecondPast = new Date(
    MEASURED_AT.getTime() + windowSeconds * 1000 + 1000,
  );
  assert.deepEqual(
    freshMeasurementsOf(persistedSource(), oneSecondPast, windowSeconds),
    [],
    `a measurement past its window is not posted at all; the artefact reads ${persistedSource()}`,
  );
});

/**
 * The three shapes of nothing, as the Outline names them — what is at the canonical path, or
 * `null` where nothing is there at all.
 *
 * KEYED ON THE OUTLINE'S OWN WORDS so a row nobody planted for reds here, where the fixture is,
 * rather than passing as whichever shape the code happened to fall through to.
 */
const NOTHING_WORTH_PERSISTING = new Map<string, string | null>([
  ["absent, because nothing posted a measurement", null],
  // Half-written, because whatever was writing it stopped: a cancelled job, a killed runner, a
  // disk that filled. What a reader can do with any of them is the same.
  ["there, and unparseable", '{ "measurements": [ { "scnId": "SCN-MSD-001",'],
  // Parses, holds an array, and holds no row any reader will accept — the row is missing half its
  // address. THE SHAPE THAT DISCRIMINATES: a persist copying the file across blind carries this
  // happily, and hands a later run an artefact that looks like a measurement and settles nothing.
  [
    "there, and holding no well-formed measurement",
    JSON.stringify({ measurements: [{ checkTag: "mutation", measured: 92.52 }] }),
  ],
]);

// @SCN-MUT-013
// A regex rather than a Cucumber expression because the Outline states the shape as prose rather
// than as a quoted value, and anchored end to end so it binds this Outline's line and no other.
Given(/^a run whose own measurement artefact is (.+)$/, function (shape: string) {
  const source = NOTHING_WORTH_PERSISTING.get(shape);
  if (source === undefined) {
    assert.fail(`this fixture plants no artefact for the shape "${shape}"`);
  }

  plantedRoot = mkdtempSync(path.join(tmpdir(), "measurement-persist-"));
  plantedRoots.push(plantedRoot);
  // Absent means the path is never created, not that an empty file is left there: a run whose
  // producers posted nothing leaves `runs/` exactly as a fresh clone has it.
  if (source === null) return;

  const runArtefactPath = path.join(plantedRoot, MEASUREMENT_ARTEFACT_PATH);
  mkdirSync(path.dirname(runArtefactPath), { recursive: true });
  writeFileSync(runArtefactPath, source, "utf8");
});

// @SCN-MUT-013
Then(
  "it persists no artefact at all, and does not fail for having nothing to persist",
  function () {
    // NO FILE, NOT AN EMPTY ONE. `if-no-files-found: ignore` is what keeps the upload quiet, and
    // it is the absence of the file that reaches it — a dated artefact holding no row would be
    // collected, borrowed, and read to zero rows in silence.
    const at = path.join(plantedRoot, PERSISTED_ARTEFACT);
    assert.equal(
      existsSync(at),
      false,
      `nothing worth persisting is persisted as nothing; ${at} holds ${
        existsSync(at) ? readFileSync(at, "utf8") : ""
      }`,
    );
    // AND IT IS NOT AN ARBITER (@SCN-CIP-010). A sweep that measured nothing is a fact about the
    // RUN, which the ledger reports as the rows it would have settled reading `missing`. The only
    // non-zero exit this command has is 2, and only for a fault in how it was CALLED.
    assert.equal(
      persistEndedWith,
      0,
      `a run with nothing to persist ends cleanly; it ended ${persistEndedWith}: ${persistComplained}`,
    );
  },
);

/** What the run left at the path it was told to leave it, insisted on rather than looked for. */
function persistedSource(): string {
  const at = path.join(plantedRoot, PERSISTED_ARTEFACT);
  try {
    return readFileSync(at, "utf8");
  } catch {
    // The parent directory is the persist's to make: `runs/` is gitignored and an upload's
    // collection point is whatever the caller named, so on any real run the first thing to write
    // there is the thing that creates it.
    return assert.fail(`the persist must write ${at}; nothing is there`);
  }
}

/** A later run's clock, the given number of hours after the moment the run measured. */
function hoursAfterMeasuring(hours: number): Date {
  return new Date(MEASURED_AT.getTime() + hours * MILLISECONDS_PER_HOUR);
}
