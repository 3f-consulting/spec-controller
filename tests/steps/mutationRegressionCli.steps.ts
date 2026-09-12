/**
 * @integration for @SCN-MRG-006 — the edge that carries the comparison's verdict out of the process
 * that reached it.
 *
 * WHY THIS ARM STARTS A REAL PROCESS, AND WHY IT IS THE ONLY WAY TO REACH THIS RULE. Every other
 * scenario in this feature is about a value the comparison hands back, and a value can be read off a
 * function call. How a run ENDED cannot: an exit code exists only where a process exited, and a
 * function returning the number 1 for "failure" would be a re-implementation of the thing under
 * test wearing its answer. So each row below spawns the check the way a pipeline spawns it, and
 * takes the ending off the process rather than off a return value.
 *
 * AND WHAT IT EXPECTS IS BUILT BY THE PRODUCT'S OWN SENTENCE-BUILDERS. `describeLostKill`,
 * `describeComparison` and `describeUnsettled` are called here to compose what the run must have
 * said; spelling those sentences out again in this file would make the arm a second author of the
 * wording, green whenever the two copies happened to agree and silent about the one that matters.
 *
 * ITS OWN STEP TEXT, EVERY LINE OF IT, AND THE GENERAL ONE IS THE TRAP. Cucumber's step registry is
 * process-wide, so a phrase written here binds every feature file in the repository — and an
 * Outline's placeholder makes that easy to miss, because the pattern it needs ends in a wildcard. A
 * step reading "the run ends (.+)" is a step about anybody's run, and a sibling feature file with an
 * ending step of its own goes ambiguous on that exact wildcard — measured here when six scenarios of
 * one did, before this file's steps were qualified. Every step below names the two reports, the run
 * that read them, or the ledger they credit, which is what keeps the wildcard inside this scenario's
 * own sentence.
 *
 * THE ROOT IS PLANTED, AND THAT IS NOT TIDINESS. The check posts a measurement, so an arm running
 * it against the outer run's evidence root would write a row citing SCN-FIT-017 into the very
 * credit stream `balance --measurements` reads — and the evidence root persists between local runs,
 * so it would still be sitting there on the next one. `--root` is what `resolveEvidenceRoot` takes
 * as already-resolved, and it is the base this run's report is looked for under too, so one flag
 * puts both halves of the plant inside a directory of this scenario's own.
 */

import { Given, When, Then, After } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  MEASUREMENT_ARTEFACT_PATH,
  RECORDED_SWEEP_PATH,
  type Measurement,
} from "../checks/measurementArtefact.js";
import {
  comparisonOf,
  describeComparison,
  describeLostKill,
  describeUnsettled,
  lostKills,
  recordIn,
  type Mutant,
} from "../checks/mutationRegression.js";
import { MUTATION_REPORT_PATH } from "../checks/mutationScore.js";

const repoRoot = process.cwd();
const check = path.join(repoRoot, "tests", "checks", "mutationRegressionCli.ts");
const tsxBin = path.join(repoRoot, "node_modules", ".bin", "tsx");

/** The row this check answers, named on its command line the way the row will name it. */
const ASKED_SCN = "SCN-FIT-017";
const ASKED_CHECK = "mutation-regression";

/**
 * Three mutants in three different files, which is what lets "named" and "not named" both be
 * assertions. Two mutants in one file would make "the kill it still makes is named nowhere"
 * unprovable — the file is on the page either way, under the loss beside it.
 */
const MUTANTS: readonly Omit<Mutant, "status">[] = [
  {
    file: "packages/core/src/domain/evidenceReconciliation.ts",
    mutatorName: "ConditionalExpression",
    replacement: "true",
    startLine: 339,
    startColumn: 11,
    endLine: 339,
    endColumn: 46,
  },
  {
    file: "packages/core/src/parse/runningStaticChecks.ts",
    mutatorName: "BooleanLiteral",
    replacement: "false",
    startLine: 97,
    startColumn: 5,
    endLine: 97,
    endColumn: 31,
  },
  {
    file: "packages/core/src/domain/ledgerLine.ts",
    mutatorName: "ArithmeticOperator",
    replacement: "-",
    startLine: 88,
    startColumn: 5,
    endLine: 88,
    endColumn: 20,
  },
];

/** What each row of the Outline writes at the two names the check is pointed at. */
interface Plant {
  /** The statuses the recorded sweep holds, or nothing where no record is written at all. */
  readonly record: readonly string[] | undefined;
  /** The statuses this run's own report comes back with. */
  readonly thisRun: readonly string[];
}

/**
 * The three plants, keyed by the Outline's own words for them.
 *
 * THE ABSENT RECORD IS A FIELD RATHER THAN A MISSING ENTRY, for the reason the sibling arm's table
 * spells its absent row: a lookup handing back `undefined` for a row nobody typed correctly is
 * indistinguishable from one handing back `undefined` because the row says to write nothing, so a
 * mistyped cell would quietly become the absent case and pass having planted the wrong thing.
 */
const PLANTED: Readonly<Record<string, Plant>> = {
  "the record holds two kills this run no longer makes, beside one it still does": {
    record: ["Killed", "Killed", "Killed"],
    thisRun: ["Survived", "NoCoverage", "Killed"],
  },
  "every kill the record holds is a kill this run still makes": {
    record: ["Killed", "Killed", "Killed"],
    thisRun: ["Killed", "Killed", "Killed"],
  },
  "there is no recorded sweep where this run looked for one": {
    record: undefined,
    thisRun: ["Killed", "Killed", "Killed"],
  },
};

/** How each row says the run must have ended, against the code a process actually exits with. */
const ENDING: Readonly<Record<string, number>> = {
  "in failure": 1,
  cleanly: 0,
};

/** What each row says reaches the ledger, or `null` where the row says nothing does. */
const CREDITED: Readonly<Record<string, number | null>> = {
  "two lost kills": 2,
  "no lost kill": 0,
  "nothing at all, because a run that compared no mutant has measured none": null,
};

const plantedRoots: string[] = [];

let plantedRoot: string;
let planted: Plant;
let endedWith: number | null;
let printed: string;
let said: string;

After(function () {
  for (const root of plantedRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/** One mutant as a report files it — every field a real document carries, not only the read ones. */
function reportMutant(identity: Omit<Mutant, "status">, status: string) {
  return {
    id: `${identity.file}:${identity.startLine}:${identity.mutatorName}`,
    mutatorName: identity.mutatorName,
    replacement: identity.replacement,
    status,
    statusReason: "planted by this scenario",
    testsCompleted: 4,
    location: {
      start: { line: identity.startLine, column: identity.startColumn },
      end: { line: identity.endLine, column: identity.endColumn },
    },
  };
}

/** A whole mutation-report document, grouped by file the way a run leaves one. */
function reportDocument(statuses: readonly string[]) {
  return {
    schemaVersion: "2",
    thresholds: { high: 95, low: 90 },
    projectRoot: "/somebody/elses/tree",
    files: Object.fromEntries(
      MUTANTS.map((identity, at) => [
        identity.file,
        {
          language: "typescript",
          source: "// the source a report carries, which the comparison never reads\n",
          mutants: [reportMutant(identity, statuses[at] as string)],
        },
      ]),
    ),
  };
}

/** The mutants a set of statuses stands for, read back through the product's own reader. */
function mutantsFor(statuses: readonly string[]): readonly Mutant[] {
  const reading = recordIn("a document this step composed", JSON.stringify(reportDocument(statuses)));
  if (!reading.settled) assert.fail(describeUnsettled(reading));
  return reading.mutants;
}

/** Where the recorded sweep was looked for — named here because a refusal must name it. */
function recordPath(): string {
  return path.join(plantedRoot, RECORDED_SWEEP_PATH);
}

/** The statuses this row's recorded sweep holds, refused where the row plants no record at all. */
function recordedStatuses(): readonly string[] {
  const record = planted.record;
  if (record === undefined) {
    assert.fail("this row expects a comparison, and it plants no recorded sweep to compare against.");
  }
  return record;
}

/** What this row says the run must have said, and what it must not have said. */
function expectationFor(words: string): { present: readonly string[]; absent: readonly string[] } {
  if (words === "every kill this run has lost and no kill it still makes, by the file, the line and the mutator of each") {
    const current = mutantsFor(planted.thisRun);
    const lost = lostKills(mutantsFor(recordedStatuses()), current);
    const stillMade = current.filter((one) => !lost.some((gone) => gone.file === one.file));
    return { present: lost.map(describeLostKill), absent: stillMade.map((one) => one.file) };
  }
  if (words === "how much of the record it compared, what it lost, and what it could compare against nothing") {
    const comparison = comparisonOf(mutantsFor(recordedStatuses()), mutantsFor(planted.thisRun));
    return { present: [describeComparison(comparison)], absent: [] };
  }
  if (words === "the reason it settled nothing, and the recorded sweep it looked for, by name") {
    const reading = recordIn(recordPath(), undefined);
    if (reading.settled) assert.fail("a record that was never written settled.");
    return { present: [describeUnsettled(reading)], absent: [] };
  }
  return assert.fail(`the scenario said the run names "${words}", which names nothing this step can look for.`);
}

/** Every measurement the run posted into the planted root, or none where it posted nothing. */
function creditedRows(): readonly Measurement[] {
  let held: string;
  try {
    held = readFileSync(path.join(plantedRoot, MEASUREMENT_ARTEFACT_PATH), "utf8");
  } catch {
    // No artefact at all is the shape a run that posted nothing leaves, and it is one of the three
    // answers this scenario is about rather than a fault in the fixture.
    return [];
  }
  return (JSON.parse(held) as { measurements?: readonly Measurement[] }).measurements ?? [];
}

// @SCN-MRG-006

Given(/^a recorded sweep and a report from this run in which (.+)$/, function (words: string) {
  const found = PLANTED[words];
  if (found === undefined) {
    assert.fail(`the scenario said "${words}", which names no pair this step can plant.`);
  }
  planted = found;

  plantedRoot = mkdtempSync(path.join(tmpdir(), "mutation-regression-cli-"));
  plantedRoots.push(plantedRoot);

  if (planted.record !== undefined) {
    writeFileSync(recordPath(), `${JSON.stringify(reportDocument(planted.record), null, 2)}\n`, "utf8");
  }

  const reportPath = path.join(plantedRoot, MUTATION_REPORT_PATH);
  mkdirSync(path.dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(reportDocument(planted.thisRun), null, 2)}\n`, "utf8");
});

When("the check that reads the two of them is run", function () {
  const finished = spawnSync(
    tsxBin,
    [check, "--scn", ASKED_SCN, "--check", ASKED_CHECK, "--root", plantedRoot],
    { cwd: repoRoot, encoding: "utf8" },
  );
  endedWith = finished.status;
  printed = finished.stdout ?? "";
  said = finished.stderr ?? "";
});

Then(/^the run that read them ends (.+)$/, function (how: string) {
  const expected = ENDING[how];
  if (expected === undefined) {
    assert.fail(`the scenario said the run ends "${how}", which names no ending this step can read.`);
  }
  // THE CODE ITSELF, NOT MERELY ZERO-OR-NOT. "Ends in failure" is satisfied by a check that fell
  // over before it read anything, and this repository already reserves 2 for a command that was
  // called wrongly — so the row that ends in failure must end in the ONE code the verdict chooses.
  assert.equal(
    endedWith,
    expected,
    `expected the run to end ${how} (${expected}); it ended ${String(endedWith)} saying: ${said.trim()}`,
  );
});

Then(/^what it says of this run names (.+)$/, function (words: string) {
  const expectation = expectationFor(words);
  assert.notEqual(expectation.present.length, 0, `nothing was expected of what it says: ${words}`);
  for (const sentence of expectation.present) {
    assert.ok(said.includes(sentence), `what it says does not name "${sentence}": ${said.trim()}`);
  }
  for (const never of expectation.absent) {
    assert.ok(!said.includes(never), `what it says names ${never}, which this run has not lost: ${said.trim()}`);
  }
});

Then(
  "it reaches that on its own account, with nothing of a program falling over reaching its reader in place of it",
  function () {
    // A STACK FRAME IS THE TELL. An unhandled fault ends the process with a code this scenario could
    // read as a verdict and a message naming a line of somebody's source rather than the record —
    // which is the shape "ends in failure" is satisfied by when nothing else is asked.
    assert.ok(
      !/^\s+at .*:\d+:\d+/m.test(said),
      `what it says carries a stack trace rather than a verdict: ${said.trim()}`,
    );
    // AND IT SAID SOMETHING. A check that ended on the right code in silence has carried no verdict
    // anywhere a reader of the log can see it.
    assert.notEqual(said.trim(), "", "the run ended without saying anything at all.");
  },
);

Then(/^what this run lost is credited to the ledger as (.+)$/, function (words: string) {
  const expected = CREDITED[words];
  if (expected === undefined) {
    assert.fail(`the scenario said the ledger is credited "${words}", which names no credit this step can read.`);
  }

  // TWO CARRIERS, ONE NUMBER, AND BOTH ARE THE LEDGER'S. The count is written into the credit
  // stream `balance --measurements` reads, and it is also the whole of what the row's command
  // prints, which is where the fitness pass takes a measured row's number from. A run posting one
  // and printing the other would credit two different figures to one obligation.
  const rows = creditedRows();
  if (expected === null) {
    assert.deepEqual(rows, [], `expected nothing to be credited; ${JSON.stringify(rows)} was.`);
    assert.equal(printed.trim(), "", `expected no number at all; it answered "${printed.trim()}"`);
    return;
  }

  assert.deepEqual(
    rows,
    [{ scnId: ASKED_SCN, checkTag: ASKED_CHECK, measured: expected }],
    `expected ${ASKED_SCN} ${ASKED_CHECK} credited ${expected}; the credit stream holds ${JSON.stringify(rows)}`,
  );
  assert.equal(
    printed.trim(),
    String(expected),
    `expected the whole of the answer to be ${expected}; it answered "${printed.trim()}"`,
  );
});
