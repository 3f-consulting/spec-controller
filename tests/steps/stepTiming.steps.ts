/**
 * Step definitions for the producer Rule of features/ci-run-time.feature — the timing wrapper
 * that measures a CI step and posts the measurement (@CIP).
 *
 * @SCN-CIP-009, @SCN-CIP-010, @SCN-CIP-011, @SCN-CIP-012 — the bidirectional @integration
 * evidence markers (Evidence Manifesto §9), each on the step block that answers it.
 *
 * WHY THIS ARM RUNS THE REAL WRAPPER. The @unit pin beside it chooses its own numbers and proves
 * the artefact's shape against the reader; what it cannot reach is everything between a command
 * line and a file on disk — the argument parse, the spawn, the clock around it, the created
 * parent directory, the encoding. All of that is where a producer that is right in isolation and
 * wired wrong reads green at unit and posts nothing.
 *
 * THE STEP IS PLANTED, AND SO IS THE ROOT IT WRITES INTO. `--root` moves both the wrapped
 * command's working directory and the artefact, so nothing here touches this repository's own
 * evidence root. Wrapping this repository's real suites is 3F-2742/2743's, and a scenario that
 * timed a real suite would take as long as the suite.
 *
 * WHICH IS ALSO WHERE THE CEILING COMES FROM (@SCN-CIP-012). The planted root carries its own
 * manifest, so the ceiling a run is read against is authored per scenario and moved between
 * runs — the only arrangement that can tell a wrapper reading the target's thresholds from one
 * holding a ceiling of its own, since this repository's real thresholds are 3F-2742/2743's.
 */

import { Given, When, Then, After } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  parseMeasuredEvidenceObservations,
  type MeasuredEvidenceObservation,
} from "@3f-consulting/spec-controller-core/internal";

import { TIMINGS_RECORD_PATH } from "../checks/measurementArtefact.js";

const repoRoot = process.cwd();
const wrapper = path.join(repoRoot, "tests", "checks", "timeStepCli.ts");
const tsxBin = path.join(repoRoot, "node_modules", ".bin", "tsx");

/**
 * How long the planted step is told to take.
 *
 * Long enough to survive the artefact's tenth-of-a-second resolution — a step measured at zero
 * would satisfy every assertion below about the citation while proving nothing at all about the
 * clock — and short enough that the scenario costs no more than the wrapper it is timing.
 */
const PLANTED_STEP_SECONDS = 0.5;

/**
 * What the planted failing step exits with.
 *
 * Not 1, which a "did it red?" assertion is satisfied by however the wrapper arrived at it, and
 * not 2, which the wrapper spends on its own usage faults — a step exiting 2 and a wrapper
 * called wrongly would then be indistinguishable in the log. Seven is neither, so only carrying
 * the child's own code through can produce it.
 */
const FAILING_STEP_EXIT_CODE = 7;

/**
 * How long the second planted step, and then the re-run of the first, are told to take.
 *
 * Three durations that cannot be mistaken for one another, because the whole claim of
 * @SCN-CIP-011 is about WHICH measurement ends up in which row: a re-run that kept the earlier
 * number would satisfy every assertion phrased on the row's existence alone.
 */
const SECOND_STEP_SECONDS = 0.3;
const RE_RUN_STEP_SECONDS = 1;

/**
 * The two ceilings the planted scenario is held to, either side of what its step measures.
 *
 * Chosen so the SAME half-second step lands in two different bands — five puts it an order of
 * magnitude inside its trigger of four, and four-tenths puts it over its gate. A scenario that
 * changed the step instead would be reading the clock rather than the ceiling, and would leave
 * the wrapper free to hold a ceiling of its own and still pass.
 */
const GENEROUS_CEILING = 5;
const TIGHT_CEILING = 0.4;

const plantedRoots: string[] = [];

let citedScn: string;
let citedCheck: string;
let plantedRoot: string;

/** The scenario the run's FIRST step cited, kept while a later step cites another. */
let firstStepScn: string;

/** What the second planted step posted, which the first step's re-run must leave alone. */
let secondStepMeasured: number;

/** The wall-clock the wrapper's whole run took, as an upper bound on what it may have measured. */
let outerSeconds: number;

/** The code the wrapper itself exited with, which is the whole claim of @SCN-CIP-010. */
let wrapperExitCode: number | null;

/** What the last run printed — the report is the deliverable of @SCN-CIP-012. */
let lastReport: string;

After(function () {
  for (const root of plantedRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

// @SCN-CIP-009
Given(
  "a timed step citing the scenario {string} on the check {string}",
  function (scnId: string, check: string) {
    // The citation is HANDED to the wrapper rather than resolved from anywhere, which is the
    // whole reason a measurement needs no two-hop seam: canon puts the check-to-scenario
    // mapping in the runner, and here the runner is a command line.
    citedScn = scnId;
    citedCheck = check;
    plantedRoot = mkdtempSync(path.join(tmpdir(), "step-timing-"));
    plantedRoots.push(plantedRoot);
  },
);

// @SCN-CIP-009
When("the step runs and takes a measurable amount of wall-clock", function () {
  const started = Date.now();
  runWrapper(["sleep", String(PLANTED_STEP_SECONDS)]);
  outerSeconds = (Date.now() - started) / 1000;
});

// @SCN-CIP-009
Then(
  "the artefact it wrote is read as exactly one Evidence Observation, citing {string} and naming the check {string}",
  function (scnId: string, check: string) {
    assert.equal(
      observed().length,
      1,
      `expected one Evidence Observation from the artefact; got ${JSON.stringify(observed())}`,
    );
    // BOTH terms, because neither is an address on its own (@SCN-LNT-012).
    assert.equal(observed()[0]!.scnId, scnId);
    assert.equal(observed()[0]!.checkTag, check);
  },
);

// @SCN-CIP-009
Then("that Evidence Observation carries the seconds the step took", function () {
  const measured = observed()[0]!.measured;

  // BOUNDED ON BOTH SIDES, because either bound alone is satisfied by a number that is not a
  // measurement. A floor alone passes a constant somebody typed; a ceiling alone passes zero,
  // and zero is the reading a wrapper that never started its clock produces. Together they say
  // the number is this step's own wall-clock and is in seconds — milliseconds would sit three
  // orders of magnitude above the run that contains them.
  assert.ok(
    measured >= PLANTED_STEP_SECONDS - 0.1,
    `the measurement must be the step's own wall-clock; a step told to take ` +
      `${PLANTED_STEP_SECONDS}s measured ${measured}`,
  );
  assert.ok(
    measured <= outerSeconds,
    `the measurement must be the step's wall-clock and not the wrapper's; ` +
      `${measured} against a whole run of ${outerSeconds}`,
  );
});

// @SCN-CIP-010
When("the step runs and the command it wraps fails", function () {
  // Through `sh -c` rather than a binary chosen for the code it happens to exit with, so the
  // number the wrapper must carry is the planted one and is visible in this file.
  wrapperExitCode = runWrapper(["sh", "-c", `exit ${FAILING_STEP_EXIT_CODE}`]).status;
});

// @SCN-CIP-010
Then("the timed step fails exactly as the command it wrapped did", function () {
  assert.equal(
    wrapperExitCode,
    FAILING_STEP_EXIT_CODE,
    `the wrapper must exit with the code its child chose; the child exited ` +
      `${FAILING_STEP_EXIT_CODE} and the wrapper exited ${wrapperExitCode}`,
  );
});

// @SCN-CIP-010
Then("its measurement is posted all the same", function () {
  // A slow failing suite is still a slow suite. Dropping the row would leave the ceiling's
  // obligation reconciling missing, which reads as a step that never ran at all.
  assert.equal(
    observed().length,
    1,
    `a failing step must still post its measurement; got ${JSON.stringify(observed())}`,
  );
  // The row is addressed by both terms (@SCN-LNT-012), so both are what "still posted" means.
  assert.equal(observed()[0]!.scnId, citedScn);
  assert.equal(observed()[0]!.checkTag, citedCheck);
});

// @SCN-CIP-011
When(
  "a second step citing the scenario {string} on that same check runs into the same artefact",
  function (scnId: string) {
    // The same planted root, which is what makes this the same run rather than two of them: one
    // artefact is what `--measurements` names, and both of this repository's timed suites post into it.
    firstStepScn = citedScn;
    citedScn = scnId;
    runWrapper(["sleep", String(SECOND_STEP_SECONDS)]);
    secondStepMeasured = measurementCiting(scnId).measured;
  },
);

// @SCN-CIP-011
Then(
  "the artefact is read as one Evidence Observation citing {string} and one citing {string}",
  function (firstScn: string, secondScn: string) {
    assert.deepEqual(
      observed().map((observation) => observation.scnId),
      [firstScn, secondScn],
      `both steps ran, so both rows must be there; the artefact reads ${JSON.stringify(observed())}`,
    );
  },
);

// @SCN-CIP-011
When("the first step runs again, taking longer than it did before", function () {
  citedScn = firstStepScn;
  runWrapper(["sleep", String(RE_RUN_STEP_SECONDS)]);
});

// @SCN-CIP-011
Then(
  "{string} is answered by exactly one Evidence Observation, carrying what its step measured this time",
  function (scnId: string) {
    const answering = observed().filter((observation) => observation.scnId === scnId);
    assert.equal(
      answering.length,
      1,
      `a step running twice owes one measurement, not two; the artefact reads ` +
        `${JSON.stringify(observed())}`,
    );
    // Above the first run's own duration, so a row left untouched from that run fails here — the
    // re-run replaced its own row rather than being dropped on the floor beside it.
    assert.ok(
      answering[0]!.measured >= RE_RUN_STEP_SECONDS - 0.1,
      `the row must carry the latest run's wall-clock; a step told to take ` +
        `${RE_RUN_STEP_SECONDS}s is recorded as ${answering[0]!.measured}`,
    );
  },
);

// @SCN-CIP-011
Then("{string} is still answered by the measurement it posted", function (scnId: string) {
  assert.equal(
    measurementCiting(scnId).measured,
    secondStepMeasured,
    `a step replaces its own row and nobody else's; ${scnId} posted ${secondStepMeasured} and ` +
      `the artefact now reads ${JSON.stringify(observed())}`,
  );
});

// @SCN-CIP-012
Given("its scenario is held to a ci-run-time ceiling far above what the step will take", function () {
  holdCitedScenarioTo(GENEROUS_CEILING);
});

// @SCN-CIP-012
Then(
  "the report reads its measurement against that ceiling and against the trigger derived from it",
  function () {
    // FIVE AND FOUR, both spelled out here rather than derived from the wrapper's own constant.
    // Re-deriving the expected trigger through the code under test would pass whatever margin
    // that code held, which is the one thing this arm is here to read back.
    assertReportSays(`against a trigger of 4s and a gate of 5s`);
    assertReportSays(`measured ${measurementCiting(citedScn).measured}s`);
  },
);

// @SCN-CIP-012
Then("the report names the measurement as inside the trigger", function () {
  assertReportSays("inside the trigger");
});

// @SCN-CIP-012
When("the ceiling is dropped below what the step measured and the step runs again", function () {
  // The band is READ FROM THE MANIFEST, so moving the ceiling under a step that has not changed
  // is the only form of this that cannot pass against a wrapper holding a ceiling of its own.
  holdCitedScenarioTo(TIGHT_CEILING);
  runWrapper(["sleep", String(PLANTED_STEP_SECONDS)]);
});

// @SCN-CIP-012
Then("the report names the measurement as over the gate", function () {
  assertReportSays("over the gate");
  // 0.32 seconds, printed at the tenth the rest of the line is read at.
  assertReportSays("a trigger of 0.3s and a gate of 0.4s");
});

// @SCN-CIP-012
When("a step whose scenario the manifest holds to no ceiling at all runs", function () {
  // A pair the manifest names no ceiling for, in a manifest that names one for its neighbour —
  // so what is missing is this (scenario, check) pair and not the config.
  citedScn = "SCN-MSD-002";
  runWrapper(["sleep", String(PLANTED_STEP_SECONDS)]);
});

// @SCN-CIP-012
Then("the report carries that step's measurement and says no threshold is configured", function () {
  assertReportSays(`measured ${measurementCiting(citedScn).measured}s`);
  assertReportSays("no threshold is configured");
});

/** Author the planted root's manifest, the one place the wrapper may read a ceiling from. */
function holdCitedScenarioTo(ceiling: number): void {
  writeFileSync(
    path.join(plantedRoot, "package.json"),
    JSON.stringify({ specController: { thresholds: { [citedScn]: { [citedCheck]: ceiling } } } }),
    "utf8",
  );
}

/** What the run printed must carry this, or the reading it is about reached nobody. */
function assertReportSays(expected: string): void {
  assert.ok(
    lastReport.includes(expected),
    `the run's report must carry "${expected}"; it reads:\n${lastReport}`,
  );
}

/** The one Evidence Observation citing that scenario, which is all any row is ever owed. */
function measurementCiting(scnId: string): MeasuredEvidenceObservation {
  const answering = observed().filter((observation) => observation.scnId === scnId);
  assert.equal(
    answering.length,
    1,
    `${scnId} must be answered exactly once; the artefact reads ${JSON.stringify(observed())}`,
  );
  return answering[0]!;
}

/** Run the real wrapper over the planted step, and hand back how it ended. */
function runWrapper(command: readonly string[]): SpawnSyncReturns<string> {
  const run = spawnSync(
    tsxBin,
    [
      wrapper,
      "--scn", citedScn,
      "--check", citedCheck,
      "--root", plantedRoot,
      "--", ...command,
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );

  assert.equal(
    run.error,
    undefined,
    `the wrapper must run; it failed to spawn: ${run.error?.message}`,
  );
  lastReport = run.stdout;
  return run;
}

/**
 * The record the wrapper wrote, read back through the reader `balance --measurements` uses.
 *
 * THE READER IS THE CREDIT STREAM'S THOUGH THE FILE IS NOT (3F-3166). A timings record and a credit
 * stream are the same shape and are read by the same reader; what separates them is which question
 * they answer. Reading this one back through the real reader is what pins the producer and the
 * consumer to one shape — a mis-keyed row is not loud, it reconciles `missing`.
 */
function observed(): MeasuredEvidenceObservation[] {
  const artefactPath = path.join(plantedRoot, TIMINGS_RECORD_PATH);
  let source: string;
  try {
    source = readFileSync(artefactPath, "utf8");
  } catch {
    assert.fail(`the wrapper must write its measurement to ${artefactPath}; nothing is there`);
  }
  return parseMeasuredEvidenceObservations(JSON.parse(source) as { measurements?: unknown });
}
