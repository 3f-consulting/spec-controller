/**
 * @integration for the producer Rule of features/mutation-score.feature — the mutation run that
 * posts the kills its mutants imply, as a whole number of mutants.
 *
 * @SCN-MUT-007 / @SCN-MUT-008 — the bidirectional evidence markers (Evidence Manifesto §9), on
 * the step blocks that answer each. Their @unit pins live in
 * packages/spec-controller/static-checks/mutationScore.test.ts.
 *
 * ITS OWN STEP TEXT, EVERY LINE OF IT. Cucumber's step registry is process-wide, and
 * tests/steps/ciRunTime.steps.ts registers several UNQUALIFIED measurement phrases over its own
 * module-local fixtures — "the corpus and the measurements are reconciled", "it carries the
 * measurement …", "the row is out-of-balance". A phrase of that shape written here would bind to
 * that file's step and assert over a corpus this file never built: green, and about the wrong
 * run. Every step below names the mutation run or the check it is about.
 *
 * WHY THIS ARM RUNS THE REAL PRODUCER. The @unit pin beside it chooses its mutants and proves the
 * artefact's shape against the reader; what it cannot reach is everything between a command line
 * and a file on disk — the argument parse, the spawn, the report found where the run left it, the
 * created parent directory, the encoding. That is where a producer right in isolation and wired
 * wrong reads green at unit and posts nothing.
 *
 * THE RUN IS PLANTED, AND SO IS THE ROOT IT WRITES INTO. `--root` moves both the wrapped
 * command's working directory and the artefact, so nothing here touches this repository's own
 * `runs/` or `reports/` trees. Wrapping this repository's real mutation sweep is @SCN-MUT-011's,
 * and a scenario that ran Stryker would cost the eight to twelve minutes Stryker costs.
 */

import { Given, When, Then, After } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  parseMeasuredEvidenceObservations,
  type MeasuredEvidenceObservation,
} from "@3f-consulting/spec-controller-core/internal";

import {
  MEASUREMENT_ARTEFACT_PATH,
  type Measurement,
} from "../../packages/spec-controller/static-checks/measurementArtefact.js";
import { MUTATION_REPORT_PATH } from "../../packages/spec-controller/static-checks/mutationScore.js";

const repoRoot = process.cwd();
const producer = path.join(
  repoRoot,
  "packages",
  "spec-controller",
  "static-checks",
  "mutationScoreCli.ts",
);
const tsxBin = path.join(repoRoot, "node_modules", ".bin", "tsx");

/** Where the planted run stages its report before the wrapped command puts it in place. */
const STAGED_REPORT = "staged-mutation-report.json";

const plantedRoots: string[] = [];

let citedScn: string;
let citedCheck: string;
let plantedRoot: string;

/** How many mutants of each outcome the planted run came back with. */
let outcomes: Record<string, number>;

/** The verdict the planted report carries beside its mutants, and must never be read. */
let reportThresholds: Record<string, number>;

// @SCN-MUT-008
/** What the planted sweep leaves behind, as the shell line that leaves it. */
let sweepLeaves: string;

// @SCN-MUT-008
/** The code the planted sweep ends with, which is the code the producer owes back. */
let sweepEndsWith: number;

// @SCN-MUT-008
/** How the producer itself ended, which is the whole of what a non-arbiter is allowed to say. */
let producerEndedWith: number | null;

// @SCN-MUT-008
/** The row another producer of the same run posted before this one ran. */
let otherProducersRow: Measurement;

After(function () {
  for (const root of plantedRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

// @SCN-MUT-007
Given(
  "a mutation run citing the scenario {string} on the check {string}",
  function (scnId: string, check: string) {
    // The citation is HANDED to the producer rather than resolved from anywhere: canon puts the
    // check-to-scenario mapping in the runner that measures, and here the runner is a command line.
    citedScn = scnId;
    citedCheck = check;
    outcomes = {};
    reportThresholds = {};
    plantedRoot = mkdtempSync(path.join(tmpdir(), "mutation-score-"));
    plantedRoots.push(plantedRoot);
  },
);

// @SCN-MUT-007
Given(
  "its mutants came back {int} killed and {int} timed out against {int} survived and {int} never covered",
  function (killed: number, timedOut: number, survived: number, neverCovered: number) {
    // Seven and two is nine detected, and every wrong reading of the same report is a different
    // number — which is what makes the assertion below sharp rather than merely present. Read as a
    // percentage of the twelve valid it is 75, which is the answer the producer used to post.
    outcomes = {
      ...outcomes,
      Killed: killed,
      Timeout: timedOut,
      Survived: survived,
      NoCoverage: neverCovered,
    };
  },
);

// @SCN-MUT-007
Given(
  "beside them {int} errored, {int} failed to compile and {int} were ignored, none of which the metric counts as valid",
  function (errored: number, failedToCompile: number, ignored: number) {
    // The metric holds these outside `totalValid`, and a kill count is outside them twice over —
    // none of them is detected and none of them is in the population. In the report they are
    // indistinguishable from any other mutant, which is exactly why they are here: a producer
    // counting every mutant it found as a percentage reads 56.25 off this same report.
    outcomes = {
      ...outcomes,
      RuntimeError: errored,
      CompileError: failedToCompile,
      Ignored: ignored,
    };
  },
);

// @SCN-MUT-007
Given(
  "the report also carries a thresholds block of its own, naming numbers those mutants do not imply",
  function () {
    // NINETY-FIVE AND NINETY, neither of which is 9. This is the whole construction of the
    // scenario: a producer transcribing the runner's own verdict posts one of these and reds here,
    // and one that reads a report carrying no such block at all would never be caught by it.
    reportThresholds = { high: 95, low: 90 };
  },
);

// @SCN-MUT-007
When("that run posts the kills it measured", function () {
  writeFileSync(
    path.join(plantedRoot, STAGED_REPORT),
    JSON.stringify(plantedReport()),
    "utf8",
  );
  // The wrapped command PRODUCES the report, which is the arrangement a real run has: Stryker
  // writes it, and the producer around Stryker reads what the run left. Staging it before the
  // producer starts would prove the read and not the sequence.
  runProducer([
    "sh",
    "-c",
    `mkdir -p "$(dirname "${MUTATION_REPORT_PATH}")" && cp "${STAGED_REPORT}" "${MUTATION_REPORT_PATH}"`,
  ]);
});

// @SCN-MUT-007
Then(
  "the measurement it posted is read back as exactly one Evidence Observation citing {string} on the check {string}",
  function (scnId: string, check: string) {
    assert.equal(
      posted().length,
      1,
      `expected one Evidence Observation from the artefact; got ${JSON.stringify(posted())}`,
    );
    // BOTH terms, because neither is an address on its own (@SCN-LNT-012).
    assert.equal(posted()[0]!.scnId, scnId);
    assert.equal(posted()[0]!.checkTag, check);
  },
);

// @SCN-MUT-007
Then("it carries {int}, the detected mutants themselves", function (kills: number) {
  assert.equal(
    posted()[0]!.measured,
    kills,
    `the measurement must be the kills its mutants imply; the run came back ` +
      `${JSON.stringify(outcomes)} and posted ${posted()[0]!.measured}`,
  );
});

// @SCN-MUT-007
Then("it carries neither number the report's own thresholds block names", function () {
  // The negative, because the assertion above is satisfied by a producer that happened to be
  // right about this one report. Only this says the number did not come off the runner's verdict.
  for (const named of Object.values(reportThresholds)) {
    assert.notEqual(
      posted()[0]!.measured,
      named,
      `the count must come off the mutants, never off the report's own thresholds block; ` +
        `it posted ${posted()[0]!.measured}, which that block names`,
    );
  }
});

/**
 * Every reading of these mutants AS A PERCENTAGE — the answers a producer that still divided could
 * post off this one report.
 *
 * TWO NUMERATORS OVER THREE POPULATIONS, because a division is two choices and pinning only the
 * one the producer used to make would leave the step green against a producer that divided
 * differently. Kills are the detected or the killed alone; the population is the valid twelve,
 * every mutant found, or the valid ones a test reached.
 */
function percentageReadingsOf(counts: Readonly<Record<string, number>>): number[] {
  const of = (status: string): number => counts[status] ?? 0;
  const detected = of("Killed") + of("Timeout");
  const valid = detected + of("Survived") + of("NoCoverage");
  const found = Object.values(counts).reduce((running, count) => running + count, 0);
  return [detected, of("Killed")].flatMap((kills) =>
    [valid, found, valid - of("NoCoverage")].map((population) => (kills / population) * 100),
  );
}

// @SCN-MUT-007
Then(
  "it carries neither {float} nor any other reading of those mutants as a percentage",
  function (named: number) {
    const asPercentages = percentageReadingsOf(outcomes);
    // THE NAMED ONE IS CHECKED TO STILL BE ONE OF THEM. The scenario names the answer this
    // producer used to post; a derivation that stopped producing it would be a step that had
    // quietly stopped covering the reading it was written for.
    assert.ok(
      asPercentages.includes(named),
      `${named} must be one of the percentage readings of these mutants; they read ` +
        `${JSON.stringify(asPercentages)}`,
    );
    for (const reading of asPercentages) {
      assert.notEqual(
        posted()[0]!.measured,
        reading,
        `the measurement must be a count of mutants, never those mutants read as a percentage; ` +
          `it posted ${posted()[0]!.measured}, which is ${reading} read that way`,
      );
    }
  },
);

// @SCN-MUT-008
Given(
  "another producer of that same run has already posted a measurement of its own",
  function () {
    // A ci-run-time row rather than a second mutation one, because a run has as many measurements
    // as it has measured checks and the one thing "posts nothing" must not come to mean is "leaves
    // an empty artefact where the rest of the run's readings were".
    otherProducersRow = { scnId: "SCN-CIP-013", checkTag: "ci-run-time", measured: 21.4 };
    const artefactPath = path.join(plantedRoot, MEASUREMENT_ARTEFACT_PATH);
    mkdirSync(path.dirname(artefactPath), { recursive: true });
    writeFileSync(
      artefactPath,
      `${JSON.stringify({ measurements: [otherProducersRow] }, null, 2)}\n`,
      "utf8",
    );
  },
);

/**
 * The shell line each unreadable ending leaves behind, keyed by the words the Examples use.
 *
 * ABSENT, EMPTY AND UNPARSEABLE, which are three different faults reaching the producer as one
 * question. A sweep that never wrote, a sweep killed mid-write, and a sweep whose writer failed
 * partway are all reachable on a real nightly, and a producer answering only the first would post
 * a number nobody measured on the other two.
 */
const SWEEP_LEAVES: Readonly<Record<string, string>> = {
  "no mutation report at all": ":",
  "a mutation report with nothing in it":
    `mkdir -p "$(dirname "${MUTATION_REPORT_PATH}")" && : > "${MUTATION_REPORT_PATH}"`,
  "a mutation report nothing can parse":
    `mkdir -p "$(dirname "${MUTATION_REPORT_PATH}")" && ` +
    `printf '%s' '{"files": {"a.ts": {"mutants": [' > "${MUTATION_REPORT_PATH}"`,
};

/**
 * How each ending ends, as the code the sweep exits with.
 *
 * SEVEN RATHER THAN ONE, because 1 and 2 are both codes the producer has reasons of its own to
 * exit with; a wrapper substituting its own verdict for the sweep's would still read green against
 * a sweep that ended in 1.
 */
const SWEEP_ENDS: Readonly<Record<string, number>> = { cleanly: 0, "in failure": 7 };

// @SCN-MUT-008
Given(
  "the sweep leaves {string} and ends {string}",
  function (leaves: string, ending: string) {
    sweepLeaves =
      SWEEP_LEAVES[leaves] ?? assert.fail(`no planted sweep leaves ${JSON.stringify(leaves)}`);
    sweepEndsWith =
      SWEEP_ENDS[ending] ?? assert.fail(`no planted sweep ends ${JSON.stringify(ending)}`);
  },
);

// @SCN-MUT-008
When("that mutation run has finished sweeping", function () {
  // The sweep leaves what it leaves and THEN ends, in one command, because the two halves are one
  // fact about the same run: a report is absent because of how the run that should have written it
  // ended, and the producer sees only the aftermath of both.
  runProducer(["sh", "-c", `${sweepLeaves}; exit ${sweepEndsWith}`]);
});

// @SCN-MUT-008
Then(
  "that mutation run posts no measurement of its own, rather than a count of zero",
  function () {
    const itsOwn = posted().filter(
      (row) => row.scnId === citedScn && row.checkTag === citedCheck,
    );
    assert.deepEqual(
      itsOwn,
      [],
      `a run that measured nothing must post nothing on its own address; it posted ` +
        `${JSON.stringify(itsOwn)}`,
    );
    // THE NUMBER, NAMED. The assertion above is also satisfied by a producer posting its zero to a
    // mis-keyed address, which reconciles missing and reads as a sweep that never ran — so the
    // reading this scenario exists to keep unreachable is checked wherever in the artefact it lands.
    for (const row of posted()) {
      assert.notEqual(
        row.measured,
        0,
        `no row of this run may carry a count of zero; the artefact reads ${JSON.stringify(posted())}`,
      );
    }
  },
);

// @SCN-MUT-008
Then("the measurement the other producer posted is still there to be read", function () {
  assert.deepEqual(
    posted(),
    [
      {
        qualityCheck: "lint",
        scnId: otherProducersRow.scnId,
        checkTag: otherProducersRow.checkTag,
        measured: otherProducersRow.measured,
      },
    ],
    `posting nothing is not writing an empty artefact over the run's other readings; the ` +
      `artefact reads ${JSON.stringify(posted())}`,
  );
});

// @SCN-MUT-008
Then(
  "that mutation run ends exactly as its sweep ended, rather than as a fault of its own",
  function () {
    // @SCN-CIP-010, unchanged by having nothing to post: the producer is not an arbiter, and a
    // sweep that ended cleanly having written no report is a fault of the wiring that the LEDGER
    // reports, as a row reading missing. A producer redding on it would be a second arbiter of a
    // verdict that already has one.
    assert.equal(
      producerEndedWith,
      sweepEndsWith,
      `the producer must carry its sweep's ending out unchanged; the sweep ended ` +
        `${sweepEndsWith} and the producer ended ${producerEndedWith}`,
    );
  },
);

/** The report the planted run leaves, in the shape `mutation-testing-report-schema` defines. */
function plantedReport(): unknown {
  return {
    schemaVersion: "2",
    thresholds: reportThresholds,
    files: {
      "packages/core/src/domain/planted.ts": {
        language: "typescript",
        source: "",
        mutants: Object.entries(outcomes).flatMap(([status, count]) =>
          Array.from({ length: count }, (_, at) => ({
            id: `${status}-${at}`,
            mutatorName: "ConditionalExpression",
            location: { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } },
            status,
          })),
        ),
      },
    },
  };
}

/** Run the real producer over the planted run, and hand back how it ended. */
function runProducer(command: readonly string[]): void {
  const run = spawnSync(
    tsxBin,
    [producer, "--scn", citedScn, "--check", citedCheck, "--root", plantedRoot, "--", ...command],
    { cwd: repoRoot, encoding: "utf8" },
  );
  assert.equal(
    run.error,
    undefined,
    `the producer must run; it failed to spawn: ${run.error?.message}`,
  );
  producerEndedWith = run.status;
}

/** The artefact the producer wrote, read back through the reader `balance --measurements` uses. */
function posted(): MeasuredEvidenceObservation[] {
  const artefactPath = path.join(plantedRoot, MEASUREMENT_ARTEFACT_PATH);
  let source: string;
  try {
    source = readFileSync(artefactPath, "utf8");
  } catch {
    assert.fail(`the producer must post its measurement to ${artefactPath}; nothing is there`);
  }
  return parseMeasuredEvidenceObservations(JSON.parse(source) as { measurements?: unknown });
}
