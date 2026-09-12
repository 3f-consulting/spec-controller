/**
 * @integration for features/mutation-regression.feature — the recorded sweep read against this
 * run's report.
 *
 * WHY THIS ARM WRITES TWO REPORTS AND READS THEM BACK. The unit pin beside it hands the comparison
 * two lists of mutants, which is a shape somebody composed for it. What it cannot reach is the
 * record as a run actually leaves one: a whole report document, grouped by file, carrying source
 * text and a schema version and every field the comparison does not use, written to disk by one
 * process and read by another. That is where a comparison right about a composed list and wrong
 * about a real document hands back no loss and says nothing — so this arm plants both documents,
 * reads their bytes, and drives the same rule over them.
 *
 * ITS OWN STEP TEXT, EVERY LINE OF IT. Cucumber's step registry is process-wide, so a bare phrase
 * written here would bind some other feature file's scenarios to a tree this file planted — green,
 * and about the wrong thing. Every step below names "a recorded sweep", "this run" or "the lost
 * kill", none of which any other step file in this repository uses.
 *
 * AND THE FIXTURE IS NOT THIS REPOSITORY'S OWN SWEEP. The documents are written into a temporary
 * directory under names this file chooses, and the mutants in them are the scenario's. A fixture
 * reaching for reports/mutation/ would be green only on a tree that had just run Stryker.
 *
 * WHAT @SCN-MRG-005 ADDS TO THAT, AND WHY IT IS HERE AND NOT ONLY IN THE UNIT ARM. Its four
 * readings can all be handed to the reader as strings, which is what the unit arm does. What that
 * cannot reach is a name a run is actually pointed at with nothing written there — the case a
 * placement that fetched nothing produces — so three of its four shapes are planted as bytes and
 * the fourth is deliberately never written, and the reading is taken off what a filesystem hands
 * back rather than off a value composed for it.
 */

import { Given, When, Then, After } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  comparisonOf,
  describeLostKill,
  describeUnsettled,
  lostKills,
  recordIn,
  type LostKill,
  type Mutant,
  type RecordReading,
} from "../checks/mutationRegression.js";

/**
 * The Outline's own words for a mutant's outcome, against the statuses a run writes down.
 *
 * THE PROSE SIDE IS THE SCENARIO'S AND THE STATUS SIDE IS THE RUNNER'S, which is why the mapping
 * is here rather than in the feature file: a scenario naming `CompileError` would be a scenario
 * about a vendor's spelling, and one naming only "survived" could not say what the plant measured.
 */
const STATUS_OF: Readonly<Record<string, string>> = {
  killed: "Killed",
  "timed out": "Timeout",
  survived: "Survived",
  "never-covered": "NoCoverage",
  faulted: "RuntimeError",
  uncompilable: "CompileError",
  skipped: "Ignored",
};

/** The mutant the scenario is about — the one whose kill goes missing. */
const SUBJECT = {
  file: "packages/core/src/domain/evidenceReconciliation.ts",
  mutatorName: "ConditionalExpression",
  replacement: "true",
  startLine: 339,
  startColumn: 11,
  endLine: 339,
  endColumn: 46,
} as const;

/** A second mutant beside it, detected on both sides — the one that must never be named. */
const CONTROL = {
  file: "packages/core/src/domain/ledgerLine.ts",
  mutatorName: "ArithmeticOperator",
  replacement: "-",
  startLine: 88,
  startColumn: 5,
  endLine: 88,
  endColumn: 20,
} as const;

const plantedRoots: string[] = [];

/** The statuses the scenario has stated so far, in the order it stated them. */
let recordedStatus: string;
let currentStatus: string;
let lost: readonly LostKill[];

After(function () {
  for (const root of plantedRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/** The status a run writes down for the word the scenario used. */
function statusFor(word: string): string {
  const status = STATUS_OF[word];
  assert.ok(status !== undefined, `the scenario used "${word}", which names no mutant status.`);
  return status;
}

/**
 * One mutant as a report files it — every field a real document carries, not only the ones the
 * comparison reads.
 */
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
function reportDocument(subjectStatus: string, controlStatus: string) {
  return {
    schemaVersion: "2",
    thresholds: { high: 95, low: 90 },
    projectRoot: "/somebody/elses/tree",
    files: {
      [SUBJECT.file]: {
        language: "typescript",
        source: "// the source a report carries, which the comparison never reads\n",
        mutants: [reportMutant(SUBJECT, subjectStatus)],
      },
      [CONTROL.file]: {
        language: "typescript",
        source: "// likewise\n",
        mutants: [reportMutant(CONTROL, controlStatus)],
      },
    },
  };
}

/** A directory of this fixture's own, cleaned up after the scenario that made it. */
function plantedRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), "spec-controller-mutation-regression-"));
  plantedRoots.push(root);
  return root;
}

/**
 * The bytes at a name, or nothing at all when there is no file there.
 *
 * THESE TWO LINES ARE THE EDGE'S AND NOT THE READER'S. The comparison module reads no file — which
 * is what lets every status a run can reach be put in front of it — so the one fact only a
 * filesystem can learn is learned here and handed in as the absence of any text. What that absence
 * MEANS is decided by the reader with the other three readings, not by this function, which is why
 * it classifies nothing and returns no reason.
 */
function bytesAt(file: string): string | undefined {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return undefined;
  }
}

/** Write a report document into a directory of this fixture's own, and read its mutants back. */
function plantedMutants(name: string, subjectStatus: string): readonly Mutant[] {
  const file = path.join(plantedRoot(), name);
  writeFileSync(file, JSON.stringify(reportDocument(subjectStatus, "Killed"), null, 2), "utf8");
  const reading = recordIn(file, bytesAt(file));
  if (!reading.settled) {
    assert.fail(describeUnsettled(reading));
  }
  return reading.mutants;
}

/** The one lost kill the scenario expects, or a failure saying how many there were instead. */
function theLostKill(): LostKill {
  assert.equal(lost.length, 1, `this run lost ${lost.length} kills, not one.`);
  return lost[0] as LostKill;
}

let recordedMutants: readonly Mutant[];
let currentMutants: readonly Mutant[];

// @SCN-MRG-001 — a mutant the recorded sweep detected that this run does not is a lost kill, named
// by its file, its line and its mutator, whichever undetected status it came back as.

Given(
  /^a recorded sweep in which one mutant was (.+) and a second mutant beside it was killed$/,
  function (word: string) {
    recordedStatus = statusFor(word);
    recordedMutants = plantedMutants("the-nights-report.json", recordedStatus);
  },
);

Given(
  /^this run comes back with that first mutant (.+), and the second still killed$/,
  function (word: string) {
    currentStatus = statusFor(word);
    currentMutants = plantedMutants("this-runs-report.json", currentStatus);
  },
);

When("this run is read against that recorded sweep", function () {
  lost = lostKills(recordedMutants, currentMutants);
});

Then("the first mutant is the one kill this run has lost", function () {
  assert.equal(theLostKill().file, SUBJECT.file);
});

Then(
  "the lost kill names the file the mutant was made in, the line it was made at, and the mutator that made it",
  function () {
    const sentence = describeLostKill(theLostKill());
    for (const part of [SUBJECT.file, String(SUBJECT.startLine), SUBJECT.mutatorName]) {
      assert.ok(sentence.includes(part), `the lost kill does not name ${part}: ${sentence}`);
    }
  },
);

Then(
  "the lost kill names both statuses — the one the record held, and the one it came back as",
  function () {
    const sentence = describeLostKill(theLostKill());
    assert.equal(theLostKill().recordedStatus, recordedStatus);
    assert.equal(theLostKill().currentStatus, currentStatus);
    for (const status of [recordedStatus, currentStatus]) {
      assert.ok(sentence.includes(status), `the lost kill does not name ${status}: ${sentence}`);
    }
  },
);

Then("the second mutant is named nowhere, because this run detects it still", function () {
  assert.ok(
    !lost.some((one) => one.file === CONTROL.file),
    `${CONTROL.file} was detected on both sides and is named as a lost kill anyway.`,
  );
});


// @SCN-MRG-005 — a recorded sweep that is not there, is not readable, is not a mutation record, or
// is one holding no mutant settles nothing and says what it looked for, rather than reading as a
// clean comparison.

/**
 * What each row of the Outline writes at the name the reader is pointed at.
 *
 * THE ABSENT ROW IS WRAPPED RATHER THAN SPELLED AS A BARE `undefined`, and that is not decoration.
 * A lookup returning `undefined` for a row this table has no entry for is indistinguishable from
 * one returning `undefined` because the row says to write nothing — so a mistyped Examples cell
 * would quietly become the absent case and its row would pass having planted the wrong thing.
 * Wrapped, the missing entry stays visible and the step below fails on it by name.
 */
const PLANTED_AT: Readonly<Record<string, { readonly text: string | undefined }>> = {
  "is not there at all": { text: undefined },
  "is there and cannot be read": {
    text: "{ whatever this is, a mutation run did not write it",
  },
  "is readable and is not a record of a mutation run": {
    text: JSON.stringify({ schemaVersion: "2", projectRoot: "/somebody/elses/tree", testFiles: {} }, null, 2),
  },
  "is a record of a mutation run holding no mutant": {
    text: JSON.stringify(
      {
        schemaVersion: "2",
        projectRoot: "/somebody/elses/tree",
        files: { [SUBJECT.file]: { language: "typescript", source: "// nothing was mutated\n", mutants: [] } },
      },
      null,
      2,
    ),
  },
};

/** The name the recorded sweep was looked for under, and what this run read back from it. */
let lookedFor: string;
let reading: RecordReading;

/** What this row says to plant, or a failure naming the words the Outline used. */
function plantedFor(words: string): { readonly text: string | undefined } {
  const planted = PLANTED_AT[words];
  if (planted === undefined) {
    assert.fail(`the scenario said a recorded sweep "${words}", which names no shape this step can plant.`);
  }
  return planted;
}

/** The reading this row got, or a failure saying it settled where this shape settles nothing. */
function whatItSays(): string {
  if (reading.settled) {
    assert.fail(
      `the recorded sweep settled over ${reading.mutants.length} mutant(s), so a run that found ` +
        `no record would end on the same verdict as one that lost no kill.`,
    );
  }
  return describeUnsettled(reading);
}

Given(/^a recorded sweep that (.+)$/, function (words: string) {
  const file = path.join(plantedRoot(), "the-scheduled-sweeps-report.json");
  const planted = plantedFor(words).text;
  if (planted !== undefined) writeFileSync(file, planted, "utf8");
  lookedFor = file;
});

When("that recorded sweep is read", function () {
  reading = recordIn(lookedFor, bytesAt(lookedFor));
});

Then("it settles nothing, and is never read as a run that lost no kill", function () {
  const said = whatItSays();

  assert.ok(
    said.includes("has not observed that no kill was lost"),
    `what it says does not separate finding no record from losing no kill: ${said}`,
  );
});

Then("what it says names the recorded sweep it looked for", function () {
  assert.ok(
    whatItSays().includes(lookedFor),
    `what it says does not name ${lookedFor}: ${whatItSays()}`,
  );
});

Then(/^what it says of this one is (.+)$/, function (theReading: string) {
  assert.ok(
    whatItSays().includes(theReading),
    `what it says does not name "${theReading}": ${whatItSays()}`,
  );
});

Then("no other way a recorded sweep can fail to be one says the same thing", function () {
  const said = Object.entries(PLANTED_AT).map(([words, planted]) => {
    const file = path.join(plantedRoot(), "the-scheduled-sweeps-report.json");
    if (planted.text !== undefined) writeFileSync(file, planted.text, "utf8");
    const other = recordIn(file, bytesAt(file));
    assert.ok(!other.settled, `a recorded sweep that ${words} settled, and it settles nothing.`);
    return describeUnsettled(other).replace(file, "the recorded sweep");
  });

  assert.equal(
    new Set(said).size,
    said.length,
    `two of the four ways a recorded sweep can fail to be one say the same thing: ${said.join(" / ")}`,
  );
});

Then(
  "a recorded sweep in good order, read the same way, settles instead — its mutants compared, and no kill lost",
  function () {
    const file = path.join(plantedRoot(), "a-sweep-in-good-order.json");
    writeFileSync(file, JSON.stringify(reportDocument("Killed", "Killed"), null, 2), "utf8");
    const good = recordIn(file, bytesAt(file));

    assert.ok(good.settled, `a recorded sweep in good order settled nothing: ${file}`);
    assert.deepEqual(comparisonOf(good.mutants, good.mutants), {
      compared: 2,
      lost: 0,
      uncompared: 0,
    });
  },
);
