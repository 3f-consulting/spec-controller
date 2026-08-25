/**
 * @integration for the cadence Rule of features/mutation-score.feature — a measurement posted
 * only while it is still about the code being judged.
 *
 * @SCN-MUT-009 / @SCN-MUT-010 — the bidirectional evidence markers (Evidence Manifesto §9) on
 * the step blocks that answer each. Their @unit pins live in
 * packages/spec-controller/src/measurements/freshness.test.ts.
 *
 * THE AGED-OUT ARM IS AN OUTLINE OVER TWO WINDOWS, AND THAT IS THE ASSERTION. A rule stated
 * against one window is satisfied by a reader holding that number instead of reading it, and the
 * two readings are indistinguishable. So the second row hands the restore a window this
 * repository does not use — 26 hours, which is the cadence 3F-2748 gives an adopter's repository's nightly — at an
 * age this repository's own 36 hours would have called fresh. A reader holding 36 posts a
 * measurement there and reds.
 *
 * ITS OWN STEP TEXT, EVERY LINE OF IT. Cucumber's step registry is process-wide, and both
 * tests/steps/ciRunTime.steps.ts and tests/steps/mutationScore.steps.ts register measurement
 * phrases over their own module-local fixtures. A phrase of that shape written here would bind to
 * one of those files' steps and assert over a corpus this file never built: green, and about the
 * wrong run. Every step below names the scheduled run, this push, or the restore between them.
 *
 * WHY THIS ARM RUNS THE REAL RESTORE. The @unit pin beside it drives the clock and pins the
 * window's edges; what it cannot reach is everything between a command line and a file on disk —
 * the argument parse, the artefact found where the scheduled run left it, the parent directory,
 * the posting BESIDE what this push already measured, and the encoding. That is where a reader
 * right in isolation and wired wrong posts nothing and reconciles as a sweep that never ran.
 *
 * AND WHY IT GOES ON TO RECONCILE. A restored row that no reader accepts is indistinguishable
 * from one that was never restored, and the difference is invisible until the ledger is asked. So
 * the artefact is read back through the reader `balance --measurements` uses and handed to the
 * real reconciler against the bar the target's manifest authors — the through-line the scenario
 * is named for.
 */

import { Given, When, Then, After } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

import { parseScenarios, reconcile } from "@3f-consulting/spec-controller-core";
import type { Ledger } from "@3f-consulting/spec-controller-core";
import {
  thresholdsOf,
  measuredCheckTags,
  parseMeasuredEvidenceObservations,
  type MeasuredEvidenceObservation,
  type ThresholdRegistry,
} from "@3f-consulting/spec-controller-core/internal";

import {
  MEASUREMENT_ARTEFACT_PATH,
  type Measurement,
} from "../../packages/spec-controller/static-checks/measurementArtefact.js";

const repoRoot = process.cwd();
const restore = path.join(
  repoRoot,
  "packages",
  "spec-controller",
  "src",
  "measurements",
  "restoreCli.ts",
);
const tsxBin = path.join(repoRoot, "node_modules", ".bin", "tsx");

/**
 * Where the scheduled run's artefact is planted — a name of this fixture's own choosing.
 *
 * NOT THE PATH THIS PUSH POSTS TO, and not a constant anywhere in the restore. The artefact a
 * scheduled job downloads is named by whoever downloads it, which is why it arrives as an
 * argument; a fixture reusing the run artefact's own path would green a restore that had the
 * source hard-coded.
 */
const PERSISTED_ARTEFACT = "downloaded/nightly-measurements.json";

const plantedRoots: string[] = [];

/** This push's clock, handed to the restore so the ages below are stated rather than waited for. */
const NOW = new Date("2026-08-25T12:00:00Z");

let plantedRoot: string;

/** The bars the target's manifest authors — @SCN, then bare check tag. */
let thresholds: ThresholdRegistry;

/** The stepless corpus rows the bars above are owed by. */
let steplessRows: string[];

/** The row the scheduled run measured, and how long before this push it measured it. */
let scheduledRow: Measurement;
let measuredSecondsAgo: number;

/** How long this push holds a restored measurement. */
let windowSeconds: number;

/** The row a producer of THIS push posted before the restore ran. */
let thisPushesRow: Measurement;

/** How the restore itself ended. */
let restoreEndedWith: number | null;

After(function () {
  for (const root of plantedRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

// @SCN-MUT-009
Given(
  "the target's manifest holds {string} to a bar of at least {float} for {string}",
  function (scnId: string, bar: number, check: string) {
    plantedRoot = mkdtempSync(path.join(tmpdir(), "measurement-restore-"));
    plantedRoots.push(plantedRoot);
    thresholds = thresholdsOf({ [scnId]: { [check]: { atLeast: bar } } });
    steplessRows = [
      `    @${check} @${scnId}\n    Scenario: the domain core is mutated at least as hard as its bar\n`,
    ];
  },
);

// @SCN-MUT-009
Given(
  "a scheduled run measured {float} for {string} on {string} and dated what it left",
  function (measured: number, check: string, scnId: string) {
    // Recorded rather than written: the date it carries is a fact about WHEN, which the next step
    // states, so the artefact is materialised once both halves are known.
    scheduledRow = { scnId, checkTag: check, measured };
  },
);

// @SCN-MUT-009
Given(
  "this push holds a restored measurement for {int} hours, and that one was measured {int} hours ago",
  function (windowHours: number, ageHours: number) {
    windowSeconds = windowHours * 60 * 60;
    measuredSecondsAgo = ageHours * 60 * 60;
  },
);

// @SCN-MUT-009
Given("a producer of this push has already posted a measurement of its own", function () {
  // A ci-run-time row, because a push has as many measurements as it has measured checks and the
  // one thing "restores the scheduled row" must not come to mean is "writes the scheduled row
  // over everything this push measured for itself" (@SCN-CIP-011).
  thisPushesRow = { scnId: "SCN-CIP-013", checkTag: "ci-run-time", measured: 21.4 };
  const artefactPath = path.join(plantedRoot, MEASUREMENT_ARTEFACT_PATH);
  mkdirSync(path.dirname(artefactPath), { recursive: true });
  writeFileSync(
    artefactPath,
    `${JSON.stringify({ measurements: [thisPushesRow] }, null, 2)}\n`,
    "utf8",
  );
});

// @SCN-MUT-009
When("this push restores what that scheduled run left", function () {
  const persistedPath = path.join(plantedRoot, PERSISTED_ARTEFACT);
  mkdirSync(path.dirname(persistedPath), { recursive: true });
  writeFileSync(
    persistedPath,
    `${JSON.stringify(
      {
        measuredAt: new Date(NOW.getTime() - measuredSecondsAgo * 1000).toISOString(),
        measurements: [scheduledRow],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const run = spawnSync(
    tsxBin,
    [
      restore,
      "--from",
      PERSISTED_ARTEFACT,
      "--max-age",
      String(windowSeconds),
      "--root",
      plantedRoot,
      // CI never passes this; the fixture does, so the age above is a stated fact rather than one
      // that has to be waited for.
      "--now",
      NOW.toISOString(),
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
  assert.equal(
    run.error,
    undefined,
    `the restore must run; it failed to spawn: ${run.error?.message}`,
  );
  restoreEndedWith = run.status;
});

// @SCN-MUT-009
Then(
  "the restored measurement is read back as an Evidence Observation citing {string} on the check {string}",
  function (scnId: string, check: string) {
    assert.equal(
      restoreEndedWith,
      0,
      `the restore must end cleanly having posted; it ended ${restoreEndedWith}`,
    );
    const restored = posted().filter((row) => row.scnId === scnId && row.checkTag === check);
    // Read back through the reader `balance --measurements` uses, never against a literal of this
    // file's own: a row this file called well-formed and that reader dropped would reconcile
    // missing, which reads as a sweep that never ran.
    assert.deepEqual(
      restored.map((row) => row.measured),
      [scheduledRow.measured],
      `expected exactly one restored Evidence Observation carrying ${scheduledRow.measured}; ` +
        `the artefact reads ${JSON.stringify(posted())}`,
    );
  },
);

// @SCN-MUT-009
Then("the measurement this push's own producer posted is still there beside it", function () {
  assert.deepEqual(
    posted().filter((row) => row.checkTag === thisPushesRow.checkTag),
    [
      {
        qualityCheck: "lint",
        scnId: thisPushesRow.scnId,
        checkTag: thisPushesRow.checkTag,
        measured: thisPushesRow.measured,
      },
    ],
    `restoring is posting beside, not over; the artefact reads ${JSON.stringify(posted())}`,
  );
});

// @SCN-MUT-009
Then(
  "the row {string} reconciles satisfied against that bar",
  function (scnId: string) {
    const row = reconciledLedger().scenarioReconciliations.find((r) => r.scnId === scnId);
    assert.ok(row, `expected a Ledger row for ${scnId}`);
    // THE WHOLE THROUGH-LINE IN ONE ASSERTION. A restored row that reached the artefact and no
    // further would leave this reading `missing`, which is the same reading an expired one
    // produces — so this is the only step that says the restore settled the obligation it was
    // restored for.
    assert.deepEqual(
      row.qualityCheckReconciliations.map((item) => [item.staticCheck, item.outcome]),
      [[scheduledRow.checkTag, "satisfied"]],
      `the restored measurement must settle the bar it cites; the row reads ${JSON.stringify(row)}`,
    );
    assert.equal(row.verdict, "balanced");
  },
);

// @SCN-MUT-010
Then(
  "this push posts nothing that scheduled run measured, and does not fail for having nothing to post",
  function () {
    // NOT A FAULT OF THE RESTORE'S (@SCN-CIP-010). A lapsed schedule is the ordinary reading of a
    // check that runs on one, and the place that reports it is the ledger, on the row that owed
    // the measurement. A step that exited non-zero here would red the build over a CADENCE rather
    // than over the code, and would red it in a place that cannot say which bar went unsettled.
    assert.equal(
      restoreEndedWith,
      0,
      `having nothing fresh to post is a lapsed schedule, not a fault; it ended ${restoreEndedWith}`,
    );
    assert.deepEqual(
      posted().filter(
        (row) => row.scnId === scheduledRow.scnId && row.checkTag === scheduledRow.checkTag,
      ),
      [],
      "a measurement past its window is not posted at all — not posted as zero, not posted with " +
        `a caveat; the artefact reads ${JSON.stringify(posted())}`,
    );
  },
);

// @SCN-MUT-010
Then("the measurement this push's own producer posted is untouched", function () {
  // THE WHOLE ARTEFACT, not just this row. "Posts nothing" must not come to mean "writes an empty
  // artefact over what this push measured for itself": that would settle nothing and unsettle
  // everything, and every other measured bar would reconcile missing beside this one.
  assert.deepEqual(
    posted(),
    [
      {
        qualityCheck: "lint",
        scnId: thisPushesRow.scnId,
        checkTag: thisPushesRow.checkTag,
        measured: thisPushesRow.measured,
      },
    ],
    `the artefact must be exactly as this push left it; it reads ${JSON.stringify(posted())}`,
  );
});

// @SCN-MUT-010
Then(
  "the row {string} reconciles missing on the bare check {string}, and is out-of-balance",
  function (scnId: string, check: string) {
    const row = rowOf(reconciledLedger(), scnId);
    assert.deepEqual(
      row.qualityCheckReconciliations.map((item) => [item.staticCheck, item.outcome]),
      [[check, "missing"]],
      `an aged-out measurement leaves its bar unsettled; the row reads ${JSON.stringify(row)}`,
    );
    // (Obligation Exists, Observation None) — the canon side-profile for `missing`, and the whole
    // reason no eleventh Outcome is owed here. An item claiming `missing` while holding evidence
    // would be a contradiction the renderer would then have to interpret.
    assert.equal(row.qualityCheckReconciliations[0]?.evidenceObservation, undefined);
    assert.equal(row.verdict, "out-of-balance");
  },
);

// @SCN-MUT-010
Then("that row reads exactly as it does when no scheduled run left anything at all", function () {
  // THE IDENTITY IS THE PROPERTY, and it is asserted rather than argued. The reason a window buys
  // per-push teeth is that a sweep which quietly STOPPED running reads the same as one that has
  // aged out — so a nightly cannot die in silence. Stated as prose that would be a claim; stated
  // as a control tree it is a fact, and it would break the day someone gave an expired row a
  // caveat, a zero or a tenth of a mark to distinguish it.
  const control = mkdtempSync(path.join(tmpdir(), "measurement-restore-control-"));
  plantedRoots.push(control);
  const artefactPath = path.join(control, MEASUREMENT_ARTEFACT_PATH);
  mkdirSync(path.dirname(artefactPath), { recursive: true });
  writeFileSync(
    artefactPath,
    `${JSON.stringify({ measurements: [thisPushesRow] }, null, 2)}\n`,
    "utf8",
  );
  // Same command line, same window, same clock — and nothing at all where the scheduled run's
  // artefact would have been, which is what a sweep that never ran leaves behind.
  const run = spawnSync(
    tsxBin,
    [
      restore,
      "--from",
      PERSISTED_ARTEFACT,
      "--max-age",
      String(windowSeconds),
      "--root",
      control,
      "--now",
      NOW.toISOString(),
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
  assert.equal(
    run.status,
    restoreEndedWith,
    `a lapsed sweep and an absent one must end alike; ${run.status} against ${restoreEndedWith}`,
  );
  assert.deepEqual(
    rowOf(ledgerOver(postedIn(control)), scheduledRow.scnId),
    rowOf(reconciledLedger(), scheduledRow.scnId),
    "an aged-out measurement must read exactly as a sweep that never ran",
  );
});

/** The artefact a tree holds now, read back through the reader that reconciles it. */
function postedIn(root: string): MeasuredEvidenceObservation[] {
  const artefactPath = path.join(root, MEASUREMENT_ARTEFACT_PATH);
  let source: string;
  try {
    source = readFileSync(artefactPath, "utf8");
  } catch {
    assert.fail(`the restore must post into ${artefactPath}; nothing is there`);
  }
  return parseMeasuredEvidenceObservations(JSON.parse(source) as { measurements?: unknown });
}

/** The artefact this push holds now. */
function posted(): MeasuredEvidenceObservation[] {
  return postedIn(plantedRoot);
}

/**
 * The corpus read against the target's bars, reconciled against a given set of observations.
 *
 * The fixture @SCN is `SCN-MSD-001` — a code no feature file in this repository carries — so what
 * this reconciles is a claim about the RULE and never about this repository's own books.
 */
function ledgerOver(observations: MeasuredEvidenceObservation[]): Ledger {
  const corpus = `@MSD
Feature: measured

  Rule: the domain core is mutated at least as hard as its bar

${steplessRows.join("\n")}`;
  return reconcile(
    parseScenarios(corpus, [], measuredCheckTags(thresholds), thresholds),
    observations,
  );
}

/** The corpus read against the target's bars, reconciled against what this push now holds. */
function reconciledLedger(): Ledger {
  return ledgerOver(posted());
}

/** One Ledger row, insisted on rather than looked for. */
function rowOf(ledger: Ledger, scnId: string) {
  const row = ledger.scenarioReconciliations.find((r) => r.scnId === scnId);
  assert.ok(row, `expected a Ledger row for ${scnId}`);
  return row;
}
