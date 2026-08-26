/**
 * @integration for features/mutation-ratchet.feature — the record a gate banks, and the verdict a
 * run is reconciled to against it.
 *
 * @SCN-RAT-001 and @SCN-RAT-004 — the bidirectional evidence markers (Evidence Manifesto §9) sit
 * above their own step blocks below, and each block's @unit pin lives beside the module it drives:
 * packages/spec-controller/src/mutation-ratchet/record.test.ts and verdict.test.ts.
 *
 * ITS OWN STEP TEXT, EVERY LINE OF IT. Cucumber's step registry is process-wide, and 3F-2772 is
 * open against exactly this hazard: a bare phrase written here would bind a sibling feature file's
 * scenarios to a tree this file planted — green, and about the wrong record. Every step below names
 * a "ratchet record", a "verdict", or a gate that "reports a floor", none of which any other step
 * file in this repository uses. Verified with `cucumber-js --dry-run --format usage`, which prints
 * each definition against the feature lines it actually binds.
 *
 * WHY THIS ARM WRITES A FILE AND READS IT BACK. The @unit pin beside it hands the reader a template
 * literal, which is a string somebody composed for it. What it cannot reach is the record as a
 * project actually authors one: comment furniture between the gates, blank lines inside a block, a
 * justification long enough to be worth writing, and the file's own encoding on the way through
 * disk. That is where a reader right about a composed string and wrong about an authored file
 * hands back a bar nobody wrote — so this arm plants the file, reads its bytes, and drives the same
 * reader over them.
 *
 * AND THE FIXTURE IS A SECOND PROJECT'S, NOT THIS REPOSITORY'S. Nothing here is read from the tree
 * under test: the record file is written into a temporary directory under a name this file chooses,
 * and the gates are named by the scenario. A fixture reaching for this repository's own
 * configuration would green a reader that had this repository's layout baked into it.
 */

import { Given, When, Then, After } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  MalformedRecordError,
  parseGateRecords,
  gateRecordFor,
  floorOf,
  recordedScoreOf,
  type GateRecord,
} from "../../packages/spec-controller/src/mutation-ratchet/record.js";
import {
  bankRaisedRecord,
  raisedRecordText,
} from "../../packages/spec-controller/src/mutation-ratchet/ratchet.js";
import {
  readMutationReport,
  type MutationReportRead,
} from "../../packages/spec-controller/src/mutation-ratchet/report.js";
import {
  reconcileGate,
  type RatchetRequest,
} from "../../packages/spec-controller/src/mutation-ratchet/reconcile.js";
import {
  noMeasurement,
  verdictFor,
  type MutationMeasurement,
  type MutationVerdict,
} from "../../packages/spec-controller/src/mutation-ratchet/verdict.js";

/**
 * What the planted record is called — a name of this fixture's own choosing.
 *
 * NOT A CONSTANT ANYWHERE IN THE MODULE UNDER TEST. Which file holds a project's bars is that
 * project's fact, so a fixture reusing a default the reader knows would green a reader that had
 * gone looking for a filename rather than reading the text it was handed.
 */
const RECORD_FILE = "our-own-quality-bars.yml";

const plantedRoots: string[] = [];

/** The gate blocks the scenario has stated so far, in the order it stated them. */
let statedGateBlocks: string[];

/** Every gate's record, once the planted file has been read. */
let readRecords: Map<string, GateRecord>;

After(function () {
  for (const root of plantedRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/**
 * One gate's block, as a project authors it — with a comment above it and a blank line under it.
 *
 * The furniture is the point rather than decoration: a record file is mostly the argument for where
 * its bars sit, and a reader that only ever saw a bare mapping is untested against the thing it
 * will actually be pointed at.
 */
function gateBlock(gate: string, detected: number, total: number, allowed: number, reason: string) {
  return [
    `  # ${gate} — banked by the sweep that last ran green over this scope.`,
    `  ${gate}:`,
    `    detected: ${detected}`,
    `    total: ${total}`,
    ``,
    `    # The allowance, and the standard the reason below is judged against: it names a source of`,
    `    # run-to-run variance this gate's own measurement exhibits, or it is head-room.`,
    `    slack-mutants: ${allowed}`,
    `    slack-reason: "${reason}"`,
    ``,
  ].join("\n");
}

/** One gate's record, or a failure naming the gate the scenario asked about. */
function recordFor(gate: string): GateRecord {
  const record = readRecords.get(gate);
  assert.ok(record !== undefined, `the record that was read states no gate "${gate}".`);
  return record;
}

// @SCN-RAT-001 — a record hands back each gate's counts, the allowance it states, and the floor
// those two imply.

Given(
  "a ratchet record states that gate {string} last detected {int} of {int} mutants, allowing {int} with a reason",
  function (gate: string, detected: number, total: number, allowed: number) {
    statedGateBlocks = [
      gateBlock(
        gate,
        detected,
        total,
        allowed,
        "two mutants here are detected by timeout, and a timeout can flip to Survived on a slower runner with no change to the suite",
      ),
    ];
  },
);

Given(
  "that same ratchet record states that gate {string} last detected {int} of {int} mutants, allowing none",
  function (gate: string, detected: number, total: number) {
    statedGateBlocks.push(
      gateBlock(
        gate,
        detected,
        total,
        0,
        "deterministic gate, zero timeouts — any detected drop is a real regression",
      ),
    );
  },
);

/**
 * Write the gate blocks the scenario has stated into a record file on a real tree, and hand back the
 * bytes read off it.
 *
 * ONE PLANTER FOR EVERY SCENARIO IN THIS FILE. What the @integration arms are for is the record as a
 * project actually authors one — comment furniture between the gates, blank lines inside a block, a
 * justification long enough to be worth writing, and the file's own encoding on the way through
 * disk. A second scenario planting its own thinner fixture would be an arm that had quietly stopped
 * reaching the thing this one exists to reach.
 */
function plantedRecordText(): string {
  const root = mkdtempSync(path.join(tmpdir(), "ratchet-record-"));
  plantedRoots.push(root);

  const recordPath = path.join(root, RECORD_FILE);
  writeFileSync(
    recordPath,
    [
      "# Our own quality bars. The counts below are ours, and so are the gate names.",
      "#",
      "# THE RECORD IS A PAIR OF COUNTS, NEVER A BARE SCORE — a lost kill and a grown mutant",
      "# population are different events, and one number cannot separate them.",
      "mutation-gates:",
      ...statedGateBlocks,
    ].join("\n"),
    "utf8",
  );

  return readFileSync(recordPath, "utf8");
}

When("that ratchet record is read", function () {
  readRecords = parseGateRecords(plantedRecordText(), RECORD_FILE);
});

Then("the ratchet record holds exactly the gates {string}", function (gates: string) {
  assert.deepEqual(
    [...readRecords.keys()],
    gates.split(",").map((gate) => gate.trim()),
  );
});

Then(
  "the ratchet record for gate {string} states {int} kills of {int} mutants and an allowance of {int}",
  function (gate: string, detected: number, total: number, allowed: number) {
    const record = recordFor(gate);

    assert.equal(record.detected, detected);
    assert.equal(record.total, total);
    assert.equal(record.allowance.mutants, allowed);
  },
);

Then(
  "the ratchet record for gate {string} carries the reason its allowance was given",
  function (gate: string) {
    assert.notEqual(recordFor(gate).allowance.reason.trim(), "");
  },
);

Then(
  "gate {string} reports a floor of the {int} kills its allowance leaves over {int} mutants",
  function (gate: string, kills: number, total: number) {
    assert.equal(floorOf(recordFor(gate)), (kills / total) * 100);
  },
);

Then("gate {string} reports a floor below the score it recorded", function (gate: string) {
  const record = recordFor(gate);

  assert.ok(
    floorOf(record) < recordedScoreOf(record),
    `gate "${gate}" allows a mutant, so its floor must sit below the ${recordedScoreOf(record)} it recorded.`,
  );
});

Then(
  "gate {string} reports a floor equal to the score it recorded, because it allows nothing",
  function (gate: string) {
    const record = recordFor(gate);

    assert.equal(record.allowance.mutants, 0);
    assert.equal(floorOf(record), recordedScoreOf(record));
  },
);

// @SCN-RAT-004 — fewer kills than the record less its allowance is a regression, whether or not the
// population also grew.
//
// THE RECORD IS PLANTED AND READ BACK, then the verdict is reached over what came off disk. The
// @unit pin beside this one composes its record in the test, which is the arithmetic and every
// clause of the message. What it cannot reach is the reconciler standing on a record a project
// authored — and a verdict is only ever as trustworthy as the bar it was reached against.

/** The gate the scenario states, so the verdict can be asked for that gate's own bar. */
let statedGate: string;

/** The bar the planted record turned out to hold, kept so the floor can be checked against it. */
let bankedRecord: GateRecord;

/** The verdict the run was reconciled to. */
let reachedVerdict: MutationVerdict;

/**
 * The bank-it instruction, as a caller words it — never a name this module could have invented.
 *
 * `verdictFor` takes it on every call, because the text a verdict may need to hand its reader is an
 * input to the reconciler rather than a fact about any one run; only the arms that ask for the
 * record to be banked print it (@SCN-RAT-006). This scenario's verdict is a regression, so nothing
 * below asserts against it — it is here because the caller always supplies one.
 */
const BANK_COMMAND = "bank-the-record domain --and-say-why";

Given(
  "a ratchet record states that gate {string} banked {int} kills of {int} mutants, allowing {int}",
  function (gate: string, detected: number, total: number, allowed: number) {
    statedGate = gate;
    statedGateBlocks = [
      gateBlock(
        gate,
        detected,
        total,
        allowed,
        "three mutants here are detected by timeout, and a timeout can flip to Survived on a slower runner with no change to the suite",
      ),
    ];
  },
);

When(
  "that gate's run is reconciled against the ratchet record, having measured {int} kills of {int} mutants",
  function (detected: number, total: number) {
    bankedRecord = gateRecordFor(
      statedGate,
      parseGateRecords(plantedRecordText(), RECORD_FILE),
      RECORD_FILE,
    );

    reachedVerdict = verdictFor(
      bankedRecord,
      { gate: statedGate, detected, total },
      BANK_COMMAND,
    );
  },
);

Then("the ratchet reds that run as a regression, and the gate does not stand", function () {
  assert.equal(reachedVerdict.kind, "regression");
  assert.equal(reachedVerdict.ok, false);
});

/**
 * The exact figure as the message states it — not a longer number, and not a negated one.
 *
 * A PLAIN SUBSTRING CHECK IS SATISFIED BY THE WRONG ANSWER HERE, which is measured rather than
 * feared: reversing the subtraction that counts the lost kills makes the message say "-15", and a
 * check for "15 kill(s) lost" passes on it. The lookbehind is what closes that.
 */
function figure(value: number): string {
  return `(?<![\\d.-])${value}(?!\\d)`;
}

Then(
  "the verdict names the {int} kills lost and the allowance of {int} they were measured against",
  function (lost: number, allowed: number) {
    assert.match(reachedVerdict.message, new RegExp(`${figure(lost)} kill\\(s\\) lost`));
    assert.match(reachedVerdict.message, new RegExp(`allowance of ${figure(allowed)}`));
  },
);

Then(
  "the verdict names both count pairs — the {int} of {int} recorded, and the {int} of {int} measured",
  function (recorded: number, recordedTotal: number, measured: number, measuredTotal: number) {
    assert.match(reachedVerdict.message, new RegExp(`${figure(recorded)}/${figure(recordedTotal)}`));
    assert.match(reachedVerdict.message, new RegExp(`${figure(measured)}/${figure(measuredTotal)}`));
  },
);

Then("the verdict states the floor the ratchet record implies, as a percentage", function () {
  // The floor, not the score the record banked: the two sit far enough apart in this fixture that a
  // verdict reaching for the banked figure fails here rather than agreeing by coincidence.
  assert.notEqual(floorOf(bankedRecord).toFixed(4), recordedScoreOf(bankedRecord).toFixed(4));
  assert.ok(
    reachedVerdict.message.includes(`${floorOf(bankedRecord).toFixed(4)}%`),
    `the verdict does not state the floor of ${floorOf(bankedRecord).toFixed(4)}%: ${reachedVerdict.message}`,
  );
});

Then(
  "the verdict says a mutant this suite used to kill now survives, and sends its reader to the run's own report",
  function () {
    assert.ok(
      reachedVerdict.message.includes("used to kill now survives"),
      `the verdict does not say what happened: ${reachedVerdict.message}`,
    );
    assert.ok(
      reachedVerdict.message.includes("report"),
      `the verdict does not say where to go and look: ${reachedVerdict.message}`,
    );
  },
);

// @SCN-RAT-009 — a report that is absent, unreadable, shapeless or holding no scored mutant reds as
// no measurement, rather than as a score of zero.
//
// THIS IS THE ARM THAT READS A TREE, and the two rows the @unit pin beside it cannot reach live
// here. That pin composes text, which is the four rows decided on what a report SAYS; a report that
// is not there, and one whose bytes have to survive a round trip through a filesystem, are facts
// about a tree instead. The report below is planted under a temporary root — outside this
// repository, and outside whatever directory the process happened to start in — so a reader that
// joined a root of its own reaches nothing, and its refusal names a path nobody asked about.
//
// AND THE LAST STEP IS THE CONTROL. Every other assertion in the scenario is satisfied by a reader
// that refuses everything it is ever handed, so a readable report at that very same path has to
// come back as a measurement — with the counts that were planted, not just an `ok`.

/** Where, under a planted root, the report is written. Relative: the root is what moves. */
const REPORT_WITHIN_ROOT = path.join("wherever-that-sweep-writes", "this-gate.json");

/** A report's text, from a per-file list of mutant statuses. */
function reportTextOf(files: Readonly<Record<string, readonly string[]>>): string {
  return JSON.stringify(
    {
      schemaVersion: "1.0",
      files: Object.fromEntries(
        Object.entries(files).map(([file, statuses]) => [
          file,
          {
            language: "typescript",
            mutants: statuses.map((status, index) => ({
              id: `${file}:${index}`,
              mutatorName: "ConditionalExpression",
              status,
            })),
          },
        ]),
      ),
    },
    null,
    2,
  );
}

/**
 * The five rows of the Examples table, each as the bytes to plant — or `null` for the row whose
 * whole point is that nothing was planted at all.
 */
const HOW_A_REPORT_STANDS: Readonly<Record<string, string | null>> = {
  "is not there at all": null,
  "is there, but is not readable JSON": '{"files": {"src/one.ts": {"mutants": [',
  "parses, but is not a mutation-report document": '["a list of something that is not a report"]',
  "is a document holding no files section":
    '{"schemaVersion": "1.0", "thresholds": {"high": 90, "low": 71, "break": 88}}',
  "groups files, but holds no scored mutant": reportTextOf({
    "src/one.ts": ["CompileError", "RuntimeError"],
    "src/two.ts": ["Ignored", "Pending"],
  }),
};

/** A readable report, and the counts it must come back with — the control's own planted answer. */
const READABLE_REPORT = reportTextOf({
  "src/one.ts": ["Killed", "Killed", "Survived"],
  "src/two.ts": ["Timeout", "NoCoverage", "CompileError", "Ignored"],
});
const READABLE_COUNTS = { detected: 3, total: 5 } as const;

/** Where this scenario's report was planted, and sought. */
let soughtAt: string;

/** How the planted report stands, in the Examples table's own words. */
let standingOfReport: string;

/** What the reader handed back, and whether it threw on the way. */
let reportRead: MutationReportRead;
let readingThrew: unknown;

Given(/^the report that gate's run should have left behind (.+)$/, function (standing: string) {
  assert.ok(
    standing in HOW_A_REPORT_STANDS,
    `this arm plants no report that ${standing}; the Examples table and this file disagree.`,
  );
  standingOfReport = standing;

  const root = mkdtempSync(path.join(tmpdir(), "ratchet-report-"));
  plantedRoots.push(root);
  soughtAt = path.join(root, REPORT_WITHIN_ROOT);
  mkdirSync(path.dirname(soughtAt), { recursive: true });

  // The whole reason for a planted root: a fixture inside the tree under test cannot tell "the path
  // you handed me" from "the path I assumed", which is the one fault this arm exists to catch.
  assert.ok(
    !soughtAt.startsWith(process.cwd()),
    `the planted report at ${soughtAt} sits inside the working directory, so this arm proves nothing about where the reader looked.`,
  );

  const text = HOW_A_REPORT_STANDS[standing];
  if (text !== null && text !== undefined) writeFileSync(soughtAt, text, "utf8");
});

When(
  "that gate's report is read, and what comes back is reconciled against the ratchet record",
  function () {
    bankedRecord = gateRecordFor(
      statedGate,
      parseGateRecords(plantedRecordText(), RECORD_FILE),
      RECORD_FILE,
    );

    readingThrew = null;
    try {
      reportRead = readMutationReport(statedGate, soughtAt);
    } catch (cause) {
      readingThrew = cause;
      return;
    }

    reachedVerdict = reportRead.ok
      ? verdictFor(bankedRecord, reportRead.measurement, BANK_COMMAND)
      : noMeasurement(statedGate, reportRead.reason);
  },
);

/**
 * The reason the reading gave, failing here rather than reading a measurement out of a refusal.
 *
 * AND THE VERDICT HAS TO BE CARRYING IT, checked once here rather than in every assertion that goes
 * on to look inside it. A reconciler that reaches the right verdict and then prints a sentence of
 * its own has thrown away the only half of it that tells a reader where to go — measured rather
 * than feared: with this assertion taken out, a `noMeasurement` built without the reason passes
 * all five rows of the scenario, every step green.
 */
function refusalReason(): string {
  assert.equal(reportRead.ok, false, `the report that ${standingOfReport} was read as a measurement.`);
  const reason = reportRead.ok ? "" : reportRead.reason;

  assert.ok(
    reachedVerdict.message.includes(reason),
    `the verdict drops the reason it was reached from: ${reachedVerdict.message}`,
  );
  return reason;
}

Then(
  "the reading hands its refusal back as a result, never as an exception its caller must catch",
  function () {
    assert.equal(
      readingThrew,
      null,
      `reading a report that ${standingOfReport} threw instead of refusing: ${String(readingThrew)}`,
    );
    assert.equal(reportRead.ok, false);
  },
);

Then("the ratchet reds that run as no measurement, and the gate does not stand", function () {
  assert.equal(reachedVerdict.kind, "no-measurement");
  assert.equal(reachedVerdict.ok, false);
});

Then(/^the reason given says (.+)$/, function (names: string) {
  const reason = refusalReason();

  assert.ok(reason.includes(names), `the reason does not say "${names}": ${reason}`);
});

Then("the reason given names the path the report was looked for at", function () {
  const reason = refusalReason();

  assert.ok(
    reason.includes(soughtAt),
    `the reason does not name ${soughtAt}, so it cannot tell a wrong path from a sweep that never ran: ${reason}`,
  );
});

Then(
  "the reason given quotes the fault the report itself raised, where there was one to quote",
  function () {
    const reason = refusalReason();
    const planted = HOW_A_REPORT_STANDS[standingOfReport];
    let raised: string | null = null;
    if (planted !== null && planted !== undefined) {
      try {
        JSON.parse(planted);
      } catch (cause) {
        raised = cause instanceof Error ? cause.message : String(cause);
      }
    }

    if (raised !== null) {
      assert.ok(reason.includes(raised), `the reason drops the fault the report raised: ${reason}`);
      return;
    }

    // And where nothing was raised, nothing is claimed. A reader answering every refusal with the
    // parse sentence would be green on every other assertion in this scenario.
    assert.ok(
      !reason.includes("not readable JSON"),
      `a report that ${standingOfReport} is refused as unreadable JSON, which it is not: ${reason}`,
    );
  },
);

Then("the verdict says a run that produced no score is not a run that passed", function () {
  assert.match(reachedVerdict.message, /not a run that passed/);
});

Then(
  "the verdict is not a regression, because no kill has been shown to have gone missing",
  function () {
    assert.notEqual(reachedVerdict.kind, "regression");
    assert.ok(
      !reachedVerdict.message.includes("used to kill now survives"),
      `the verdict asserts a lost kill over a run that measured nothing: ${reachedVerdict.message}`,
    );
  },
);

Then(
  "that same gate measuring {int} kills of {int} mutants is reconciled to a regression instead",
  function (detected: number, total: number) {
    const zero = verdictFor(bankedRecord, { gate: statedGate, detected, total }, BANK_COMMAND);

    assert.equal(zero.kind, "regression");
    assert.notEqual(
      zero.message,
      reachedVerdict.message,
      "a run that measured nothing reads exactly as a run that measured zero.",
    );
  },
);

Then(
  "a report holding scored mutants at that very same path is read as a measurement, so refusing is not the only answer this reader gives",
  function () {
    writeFileSync(soughtAt, READABLE_REPORT, "utf8");

    const read = readMutationReport(statedGate, soughtAt);

    assert.ok(read.ok, `the reader refuses a readable report at ${soughtAt}: ${read.ok ? "" : read.reason}`);
    assert.deepEqual(read.ok ? read.measurement : null, {
      gate: statedGate,
      detected: READABLE_COUNTS.detected,
      total: READABLE_COUNTS.total,
    });
  },
);

// @SCN-RAT-011 — a better measurement raises the named gate's two figures and leaves every other
// byte of the record alone.
//
// THIS ARM AUTHORS A RECORD ONTO A REAL TREE AND RAISES IT THERE. The @unit pin beside it hands the
// recorder a string composed in the test, which is the arithmetic of the edit and the refusal. What
// it cannot reach is the record as a file: the bytes surviving a round trip through a filesystem
// and back, and the record resolved against the root its CALLER named rather than wherever the
// process happened to start. A recorder right about a template literal and wrong about an authored
// file writes a raise nobody can read afterwards.
//
// AND THIS FIXTURE IS RICHER THAN THE PLANTER ABOVE, NOT THINNER. `plantedRecordText` builds a
// record from uniform blocks, which is the shape every other scenario in this file needs. This one
// adds the bytes a document model normalises away — uneven spacing around two colons, two quoting
// styles, a justification wrapped across two lines, and a section ABOVE the gates holding lines
// named exactly like the ones being rewritten. A fixture without those is a fixture a re-dump could
// reproduce, and a byte comparison against it would be green on the one implementation this
// scenario exists to red.

/** What this arm's record is filed under, and where the raise resolves it from. */
const AUTHORED_RECORD_FILE = "the-bars-this-project-holds-itself-to.yml";

/**
 * The record as a project authors one.
 *
 * THE SECTION ABOVE THE GATES IS A TRAP RATHER THAN FURNITURE. It holds lines named `detected` and
 * `total`, so a rewriter that searched the file from the top instead of the named gate's block
 * raises the wrong thing entirely and reports success.
 */
const AUTHORED_RECORD = [
  "# The bars this project holds itself to. Most of this file is the ARGUMENT for where they",
  "# sit, and that argument is exactly what a recorder re-serialising the document would delete.",
  "",
  "# Not the ratchet's business, and named like the lines that are.",
  "before-the-bars:",
  "  detected: 9",
  "  total: 9",
  "",
  "mutation-gates:",
  "",
  "  # Banked first, deliberately: a rewriter taking the first `detected` line it meets raises",
  "  # this gate and reports success on the one it was asked about.",
  "  state-model:",
  "    detected:  202",
  "    total: 254",
  "",
  "    slack-mutants: 0",
  '    slack-reason: ""',
  "",
  "  # The expensive scope. The bar sits where the last green sweep left it, and the reason it",
  "  # sits there is this comment.",
  "  domain:",
  "    detected: 2175",
  "    total:   2243",
  "",
  "    # An allowance names a source of run-to-run variance this gate's own measurement",
  "    # exhibits, or it is head-room rather than tolerance.",
  "    slack-mutants: 1",
  "    slack-reason: 'one mutant here is detected by timeout, and a timeout can flip to",
  "      Survived on a slower runner with no change to the suite'",
  "",
  "# And the rest of this project's policy, which the ratchet also leaves alone.",
  "after-the-bars:",
  "  detected: 4",
  "  total: 4",
  "",
].join("\n");

/**
 * The two lines that may move, spelled out byte for byte rather than built from the counts.
 *
 * THE SPACING IS HALF OF WHAT IS BEING ASSERTED. A recorder emitting `total: 2250` where the record
 * said `total:   2243` has normalised the file, and these constants are what notices.
 */
const FIGURES_BEFORE_RAISE = ["    detected: 2175", "    total:   2243"] as const;
const FIGURES_AFTER_RAISE = ["    detected: 2200", "    total:   2250"] as const;

/** A record whose named gate holds no `total` line, with a LATER gate that does. */
const RECORD_LEFT_HALF_FINISHED = [
  "mutation-gates:",
  "",
  "  # Written by hand, and left half-finished.",
  "  domain:",
  "    detected: 2175",
  "    slack-mutants: 0",
  "",
  "  # Complete — and the block a rewriter running past the block above would reach.",
  "  state-model:",
  "    detected: 202",
  "    total: 254",
  "    slack-mutants: 0",
  "",
].join("\n");

/** The tree the authored record was planted on, and where under it the record sits. */
let authoredRoot: string;
let authoredRecordPath: string;

/** The record's bytes as they came off disk, and the raise this scenario asked for. */
let recordBeforeRaise: string;
let raisedRecord: string;

/** The gate the scenario raised, and the run it raised that gate to. */
let raisedGate: string;
let raisedTo: MutationMeasurement;

/** The gate banked above it, whose figures and reasoning must both come through untouched. */
let gateBankedFirst: string;

/**
 * The record with the two figure lines struck out, so what is left is everything else.
 *
 * FAILING BY NAME WHEN A LINE IS NOT THERE, because if the raised record does not hold the exact
 * bytes expected of it, there is nothing to strike out — and saying which line was not found is the
 * difference between a diagnosable red and a wall of near-identical text.
 */
function recordWithoutItsFigureLines(text: string, figureLines: readonly string[]): string {
  const lines = text.split("\n");
  const struck = figureLines.map((figure) => {
    const at = lines.indexOf(figure);
    assert.notEqual(at, -1, `the record holds no line reading exactly "${figure}".`);
    return at;
  });

  return lines.filter((_, at) => !struck.includes(at)).join("\n");
}

/** Every index at which two records' lines differ, counted over the longer of the two. */
function linesThatMoved(before: string, after: string): number[] {
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");
  const moved: number[] = [];
  for (let at = 0; at < Math.max(beforeLines.length, afterLines.length); at += 1) {
    if (beforeLines[at] !== afterLines[at]) moved.push(at);
  }
  return moved;
}

/** One gate's banked counts, read back out of a record's text through the loader. */
function bankedCountsIn(text: string, gate: string): { detected: number; total: number } {
  const record = gateRecordFor(gate, parseGateRecords(text, AUTHORED_RECORD_FILE), AUTHORED_RECORD_FILE);

  return { detected: record.detected, total: record.total };
}

Given(
  "a ratchet record authored the way a project authors one — an argument above each gate, a blank line inside every block, an allowance justified at length, and a trailing newline",
  function () {
    authoredRoot = mkdtempSync(path.join(tmpdir(), "ratchet-raise-"));
    plantedRoots.push(authoredRoot);
    authoredRecordPath = path.join(authoredRoot, AUTHORED_RECORD_FILE);

    // The whole reason for a planted root: a fixture inside the tree under test cannot tell "the
    // root you handed me" from "the root I assumed", which the raise's file half depends on.
    assert.ok(
      !authoredRoot.startsWith(process.cwd()),
      `the record planted at ${authoredRoot} sits inside the working directory, so this arm proves nothing about which tree was written to.`,
    );

    writeFileSync(authoredRecordPath, AUTHORED_RECORD, "utf8");
    recordBeforeRaise = readFileSync(authoredRecordPath, "utf8");

    assert.ok(recordBeforeRaise.endsWith("\n"), "the authored record lost its trailing newline on the way to disk.");
  },
);

Given(
  "that ratchet record banks gate {string} first, and gate {string} below it at {int} kills of {int} mutants",
  function (first: string, raised: string, detected: number, total: number) {
    gateBankedFirst = first;
    raisedGate = raised;

    assert.ok(
      recordBeforeRaise.indexOf(`  ${first}:`) < recordBeforeRaise.indexOf(`  ${raised}:`),
      `the authored record banks "${raised}" above "${first}", so a rewriter taking the first line it meets would agree with this example by coincidence.`,
    );
    assert.deepEqual(bankedCountsIn(recordBeforeRaise, raised), { detected, total });
  },
);

When(
  "gate {string} is raised to a run measuring {int} kills of {int} mutants",
  function (gate: string, detected: number, total: number) {
    raisedGate = gate;
    raisedTo = { gate, detected, total };
    raisedRecord = raisedRecordText(recordBeforeRaise, gate, raisedTo, AUTHORED_RECORD_FILE);
  },
);

Then(
  "the raised ratchet record banks gate {string} at {int} kills of {int} mutants",
  function (gate: string, detected: number, total: number) {
    assert.deepEqual(bankedCountsIn(raisedRecord, gate), { detected, total });
  },
);

Then(
  "exactly two lines of the ratchet record moved, and putting those two back hands back the file it started as, byte for byte",
  function () {
    const moved = linesThatMoved(recordBeforeRaise, raisedRecord);

    assert.equal(
      moved.length,
      2,
      `${moved.length} line(s) of the record moved, not 2 — a raise that re-serialised the document moves every one of them.`,
    );

    // The comparison this scenario exists for: the two figure lines struck out of each text by
    // their exact bytes, and the whole remainder — every comment, blank line, indent, quote, the
    // sections either side of the gates, and the trailing newline — compared as one string.
    assert.equal(
      recordWithoutItsFigureLines(raisedRecord, FIGURES_AFTER_RAISE),
      recordWithoutItsFigureLines(recordBeforeRaise, FIGURES_BEFORE_RAISE),
      "the raise moved a byte outside the two figures — the reasoning around the bar did not survive the write.",
    );
  },
);

Then(
  "gate {string} is banked at the figures it was banked at before, its own reasoning still above it",
  function (gate: string) {
    assert.equal(gate, gateBankedFirst);
    assert.deepEqual(bankedCountsIn(raisedRecord, gate), bankedCountsIn(recordBeforeRaise, gate));
    assert.ok(
      raisedRecord.includes("reports success on the one it was asked about."),
      "the comment above the gate banked first did not survive the raise.",
    );
  },
);

Then(
  "the raised record is what the file on the tree now holds, read back at the path its caller named",
  function () {
    const written = bankRaisedRecord(authoredRoot, AUTHORED_RECORD_FILE, raisedGate, raisedTo);

    assert.equal(written, authoredRecordPath, `the raise wrote ${written} rather than the record it was pointed at.`);
    assert.equal(
      readFileSync(authoredRecordPath, "utf8"),
      raisedRecord,
      "what came back off disk is not the record the raise produced.",
    );
  },
);

Then(
  "raising a gate whose block holds no line to rewrite is refused by the name of the line, never by rewriting another gate's",
  function () {
    // The fixture assertion that gives the refusal its teeth: there IS a `total` line further down,
    // so a rewriter unbounded by the block's end has something to find and quietly overwrite.
    assert.ok(
      RECORD_LEFT_HALF_FINISHED.indexOf(`  ${raisedGate}:`) <
        RECORD_LEFT_HALF_FINISHED.indexOf("    total: 254"),
    );

    assert.throws(
      () => raisedRecordText(RECORD_LEFT_HALF_FINISHED, raisedGate, raisedTo, AUTHORED_RECORD_FILE),
      (raised: unknown) => {
        const refusal = raised as MalformedRecordError;

        assert.equal(refusal.name, "MalformedRecordError");
        assert.equal(refusal.field, "total");
        assert.equal(refusal.key, raisedGate);
        assert.equal(refusal.recordFile, AUTHORED_RECORD_FILE);
        return true;
      },
    );
  },
);

// @SCN-RAT-014 — a second project's record file, gate names, report path and bank-it command drive
// the whole verdict unchanged, and the shipped surface names nothing this repository goes by.
//
// THE SECOND PROJECT IS THE POINT, AND THE @unit PIN BESIDE THIS ONE CANNOT BE THE ONLY ONE MAKING
// IT. That pin composes its second project's record as a string and drives `reconcileGate` over a
// temporary tree; what it cannot reach is the composition standing on a record and a report that
// both went to disk under names nobody in this repository chose, at a root outside it. This arm
// plants that tree whole and reconciles every one of the runs over it.
//
// AND ITS BAN LIST IS DERIVED FROM THIS REPOSITORY RATHER THAN TYPED OUT. The @unit pin scans the
// shipped surface against patterns somebody wrote down, which is only ever as good as the list.
// This one reads the names this repository ACTUALLY goes by — its packages, the checks its own
// ladder registers, the workflows it runs — straight off the tree, so a name added to any of them
// tomorrow is in the ban the same day, with nobody having remembered to add it.

/** The second project's five terms. Not one of them is a term of this repository's. */
const OTHER_PROJECT_RECORD_FILE = "the-bars-parcel-co-keeps.yml";
const OTHER_PROJECT_REPORT_PATH = path.join("out", "quality", "parcel-routing.mutants.json");
const OTHER_PROJECT_BANK_COMMAND = "make bank-the-parcel-routing-bar --and-say-why";

/** The tree that project keeps, the gate it named, and the request it makes over the two. */
let otherProjectRoot: string;
let otherProjectRecord: string;
let otherProjectGate: string;
let otherProjectRequest: RatchetRequest;

/** How the Then table words each verdict, against the kind the ratchet reaches and whether it stands. */
const WHAT_THE_RATCHET_MAKES_OF_IT: Readonly<Record<string, { kind: string; stands: boolean }>> = {
  "a regression, and the gate does not stand": { kind: "regression", stands: false },
  "a population that shrank, and the gate does not stand": { kind: "population-shrank", stands: false },
  "a kill lost inside the allowance, and the gate stands": { kind: "within-slack", stands: true },
  "a population that grew, and the gate stands": { kind: "population-grew", stands: true },
  "a tree ahead of its record, and the gate does not stand": { kind: "unrecorded-improvement", stands: false },
  "a run sitting exactly on its record, and the gate stands": { kind: "at-baseline", stands: true },
};

/** A report's text for a run of the given counts, as that project's own sweep leaves one. */
function otherProjectReport(detected: number, total: number): string {
  return reportTextOf({
    "lib/routing.ts": [
      ...Array.from({ length: detected }, () => "Killed"),
      ...Array.from({ length: total - detected }, () => "Survived"),
    ],
  });
}

/** Plant a root of that project's, holding its record and optionally a run's report. */
function plantOtherProjectTree(record: string, measured: { detected: number; total: number } | null): string {
  const root = mkdtempSync(path.join(tmpdir(), "ratchet-other-project-"));
  plantedRoots.push(root);

  // The whole reason for a planted root: a fixture inside the tree under test cannot tell "the root
  // you handed me" from "the root I assumed", which is the term of the five that fails in silence.
  assert.ok(
    !root.startsWith(process.cwd()),
    `the second project's tree at ${root} sits inside the working directory, so this arm proves nothing about which tree was read.`,
  );

  writeFileSync(path.join(root, OTHER_PROJECT_RECORD_FILE), record, "utf8");
  if (measured !== null) {
    const at = path.join(root, OTHER_PROJECT_REPORT_PATH);
    mkdirSync(path.dirname(at), { recursive: true });
    writeFileSync(at, otherProjectReport(measured.detected, measured.total), "utf8");
  }
  return root;
}

/** That project's request over a tree of its own, with any one term written over. */
function otherProjectRequestOver(root: string, over: Partial<RatchetRequest> = {}): RatchetRequest {
  return { ...otherProjectRequest, root, ...over };
}

/** The verdict that project's run reaches, over a tree planted for that run alone. */
function otherProjectVerdict(
  measured: { detected: number; total: number } | null,
  over: Partial<RatchetRequest> = {},
): MutationVerdict {
  return reconcileGate(otherProjectRequestOver(plantOtherProjectTree(otherProjectRecord, measured), over));
}

Given(
  "a second project that files its bars under a record name of its own, holding a gate it calls {string} banked at {int} kills of {int} mutants, allowing {int}",
  function (gate: string, detected: number, total: number, allowed: number) {
    otherProjectGate = gate;
    otherProjectRecord = [
      "# The bars parcel-co holds itself to. The counts are ours, and so are the gate names.",
      "mutation-gates:",
      gateBlock(
        gate,
        detected,
        total,
        allowed,
        "two mutants here are detected by timeout, and a timeout can flip to Survived on a slower machine with no change to the suite",
      ),
      gateBlock("tariff-tables", 431, 460, 0, "deterministic scope, zero timeouts"),
    ].join("\n");

    assert.notEqual(OTHER_PROJECT_RECORD_FILE, RECORD_FILE);
    assert.notEqual(OTHER_PROJECT_RECORD_FILE, AUTHORED_RECORD_FILE);
  },
);

Given(
  "that project keeps its tree somewhere that is not the tree this suite is running in, and leaves its sweep's report at a path of its own choosing",
  function () {
    otherProjectRoot = plantOtherProjectTree(otherProjectRecord, null);

    // Its own choosing, asserted rather than asserted-of-itself: the path holds nothing a runner's
    // convention would have put there, so a reader that joined one reaches a directory that is not
    // even present on this tree.
    assert.ok(!OTHER_PROJECT_REPORT_PATH.includes("reports"));
    assert.ok(!OTHER_PROJECT_REPORT_PATH.includes("mutation"));
  },
);

Given(
  "that project's own instruction for banking a measurement is the only one the ratchet is given",
  function () {
    assert.notEqual(OTHER_PROJECT_BANK_COMMAND, BANK_COMMAND);
    otherProjectRequest = {
      gate: otherProjectGate,
      root: otherProjectRoot,
      recordFile: OTHER_PROJECT_RECORD_FILE,
      reportPath: OTHER_PROJECT_REPORT_PATH,
      bankCommand: OTHER_PROJECT_BANK_COMMAND,
    };
  },
);

When("that project's gate is reconciled against that project's own record, run by run", function () {
  // The composition is what is under test, so the request is stated whole here and each run below
  // differs from it only in the report its own tree carries.
  assert.equal(otherProjectRequest.gate, otherProjectGate);
  assert.equal(otherProjectRequest.root, otherProjectRoot);
});

Then(
  "each run reaches the verdict its counts imply, over the gate name that project uses",
  function (runs: { hashes(): Record<string, string>[] }) {
    for (const run of runs.hashes()) {
      const worded = run["what the ratchet makes of the run"] ?? "";
      const expected = WHAT_THE_RATCHET_MAKES_OF_IT[worded];
      assert.ok(expected !== undefined, `this arm has no reading of "${worded}"; the table and this file disagree.`);

      const measured = {
        detected: Number(run["kills measured"]),
        total: Number(run["mutants measured"]),
      };
      const verdict = otherProjectVerdict(measured);

      assert.equal(verdict.kind, expected.kind, `${measured.detected}/${measured.total}: ${verdict.message}`);
      assert.equal(verdict.ok, expected.stands);
      assert.ok(
        verdict.message.startsWith(`${otherProjectGate}:`),
        `the verdict does not name the gate in that project's own words: ${verdict.message}`,
      );
    }
  },
);

Then(
  "the same gate with no report written at all reds as no measurement, naming the path that project chose",
  function () {
    const verdict = otherProjectVerdict(null);

    assert.equal(verdict.kind, "no-measurement");
    assert.equal(verdict.ok, false);
    assert.ok(
      verdict.message.includes(OTHER_PROJECT_REPORT_PATH),
      `the refusal does not name the path that project chose: ${verdict.message}`,
    );
  },
);

Then(
  "every verdict that asks for the record to be banked quotes that project's own instruction, and no other project's",
  function () {
    const otherWords = "just-run-the-thing --write-it-down";

    for (const measured of [{ detected: 812, total: 910 }, { detected: 830, total: 900 }]) {
      assert.ok(
        otherProjectVerdict(measured).message.includes(OTHER_PROJECT_BANK_COMMAND),
        "the verdict does not quote the instruction the request carried.",
      );

      // The discriminator: a reconciler holding a sentence of its own quotes it whatever it is told.
      const told = otherProjectVerdict(measured, { bankCommand: otherWords }).message;

      assert.ok(told.includes(otherWords), `the verdict ignores the instruction it was handed: ${told}`);
      assert.ok(!told.includes(OTHER_PROJECT_BANK_COMMAND), `the verdict quotes an instruction nobody gave it: ${told}`);
    }
  },
);

Then(
  "the record and the report were each sought under the root that project named, and nothing was read from the directory this suite is running in",
  function () {
    // Two trees, and the same request but for the root. A reader that joined a root of its own — its
    // installed location, or wherever the process happened to start — answers both the same way.
    const onItsRecord = plantOtherProjectTree(otherProjectRecord, { detected: 812, total: 900 });
    const behindIt = plantOtherProjectTree(
      ["# A record of the very same shape, banking a different bar.", "mutation-gates:", gateBlock(otherProjectGate, 830, 900, 0, "")].join("\n"),
      { detected: 812, total: 900 },
    );

    assert.notEqual(onItsRecord, behindIt);
    assert.equal(reconcileGate(otherProjectRequestOver(onItsRecord)).kind, "at-baseline");
    assert.equal(reconcileGate(otherProjectRequestOver(behindIt)).kind, "regression");
  },
);

/** A manifest of this repository's, read off the tree. */
function manifestAt(at: string): {
  name: string;
  scripts?: Record<string, string>;
  specController?: { checkRegistry: Record<string, string> };
} {
  return JSON.parse(readFileSync(path.join(process.cwd(), at), "utf8"));
}

/** Every name this repository actually goes by, read off the tree rather than typed out here. */
function namesThisRepositoryGoesBy(): string[] {
  const root = manifestAt("package.json");

  return [
    root.name,
    manifestAt("packages/spec-controller/package.json").name,
    manifestAt("packages/core/package.json").name,
    ...Object.keys(root.scripts ?? {}).filter((script) => script.includes(":")),
    ...Object.values(root.specController?.checkRegistry ?? {}),
    ...readdirSync(path.join(process.cwd(), ".github", "workflows")),
    ".github",
  ];
}

/** Every source file this module ships, its commentary struck out. */
function shippedRatchetSources(): { file: string; code: string }[] {
  const dir = path.join(process.cwd(), "packages", "spec-controller", "src", "mutation-ratchet");

  return readdirSync(dir)
    .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
    .sort()
    .map((file) => ({
      file,
      code: readFileSync(path.join(dir, file), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/\/\/.*$/gm, " "),
    }));
}

Then(
  "no source file this module ships holds a name this repository goes by — not its packages, not its checks, not its workflows",
  function () {
    const names = namesThisRepositoryGoesBy();

    // The teeth, proved before the absence is believed: the list is not empty, it holds the shapes
    // it is meant to, and a planted leak wearing one of them is caught by the very same reading.
    assert.ok(names.length > 20, `only ${names.length} name(s) came off the tree; the derivation is not reading it.`);
    assert.ok(names.includes("spec-controller") && names.includes("ci.yml"));
    const planted = `  const bankCommand = "run ${names.find((name) => name.includes(":")) ?? ""} --record";`;
    assert.ok(
      names.some((name) => planted.toLowerCase().includes(name.toLowerCase())),
      "a planted leak wearing one of this repository's own names is not caught by this reading.",
    );

    const sources = shippedRatchetSources();
    assert.deepEqual(
      sources.map((source) => source.file),
      ["index.ts", "ratchet.ts", "ratchetCli.ts", "reconcile.ts", "record.ts", "report.ts", "verdict.ts"],
      "the shipped surface is not the seven files this arm was written over.",
    );

    for (const { file, code } of sources) {
      assert.ok(code.length > 400, `${file} read back with nothing left in it.`);
      const held = names.filter((name) => code.toLowerCase().includes(name.toLowerCase()));
      assert.deepEqual(held, [], `${file} names ${held.join(", ")} — a term of this repository's, not of its caller's.`);
    }
  },
);

// @SCN-RAT-015 — the run that calls it carries the verdict out.
//
// SPAWNED RATHER THAN CALLED, BECAUSE AN ENDING IS NOT A RETURN VALUE. Everything this arm is about
// — how a run ends, which channel a reader is told on, whether a refusal arrives as a sentence or as
// a fall — exists only once there is a process. Imported and called, the command's own ending is the
// suite's ending, and the two readings that matter most here (a red run, and a run that was called
// wrong) are indistinguishable from a suite that crashed.
//
// AND THAT IS EXACTLY THE HAZARD THIS ARM DEFENDS AGAINST. A command that falls over before it
// reaches its first argument ends in failure, so the two red rows below are green against a build
// that cannot start at all. So no row asserts an ending alone: each states what its reader was told
// and which channel it arrived on, the misuse rows require that no verdict was reached, and the last
// step reads both channels for the shape an unhandled fall leaves — with every one of those shapes
// proved to fire on a sample of the fall it was drawn from before its absence is believed.
//
// THE TREE IS A SECOND PROJECT'S, AS EVERY ARM ABOVE THIS ONE. Its record is filed under a name of
// its own, its sweep leaves a report where it likes, and its instruction for banking a measurement
// is its own sentence — so a command that had this repository's layout baked into it reaches
// nothing. The root is planted outside the working directory and asserted to be outside it.

/** The command this arm drives, and the runner that reaches a TypeScript one off the tree. */
const RATCHET_COMMAND = path.join(
  process.cwd(),
  "packages",
  "spec-controller",
  "src",
  "mutation-ratchet",
  "ratchetCli.ts",
);
const TSX_BIN = path.join(process.cwd(), "node_modules", ".bin", "tsx");

/** The calling project's three terms — none of them a name this repository goes by. */
const RUN_RECORD_FILE = "bars-the-parcel-co-runs-to.yml";
const RUN_REPORT_PATH = path.join("out", "sweeps", "parcel-routing.mutants.json");
const RUN_BANK_COMMAND = "make bank-the-parcel-routing-bar --and-say-why";

/** How the row's ending is worded, against the exit it stands for. */
const ENDS_ON: Readonly<Record<string, number>> = { cleanly: 0, "in failure": 1, broken: 2 };

/** The gate, the record as it was planted, and the run the sweep left for it. */
let runGate: string;
let runBanked: { detected: number; total: number };
let runAllowed: number;
let runRecordText: string;
let runMeasured: { detected: number; total: number };

/** The tree that run stood on, and everything the process left behind it. */
let runRoot: string;
let runCalledAs: string;
let runEndedWith: number | null;
let runAnswered: string;
let runComplained: string;
let runFailedToSpawn: string | undefined;

/** Every term the calling project owns, spelled the way an operator would type them. */
function ratchetTerms(root: string): string[] {
  return [
    "--gate", runGate,
    "--report", RUN_REPORT_PATH,
    "--root", root,
    "--record-file", RUN_RECORD_FILE,
    "--bank-command", RUN_BANK_COMMAND,
  ];
}

/**
 * How each row words the call, against the arguments it makes.
 *
 * THE FIFTH ROW LEAVES THE REPORT'S FLAG STANDING NEXT TO ANOTHER FLAG rather than dropping it: a
 * parser taking the next word whatever it was would read `--record-file` as a path, find no report
 * there, and report a sweep that never ran — a reading that sends somebody to look at their runner
 * when what happened was a typo one character long.
 */
const HOW_IT_IS_CALLED: Readonly<Record<string, (root: string) => string[]>> = {
  "asked only for the verdict": (root) => ratchetTerms(root),
  "asked to bank the measurement": (root) => [...ratchetTerms(root), "--record"],
  "called with the report left without its path": (root) => [
    "--gate", runGate,
    "--report", "--record-file", RUN_RECORD_FILE,
    "--root", root,
  ],
  "called without naming a gate at all": (root) => [
    "--report", RUN_REPORT_PATH,
    "--root", root,
    "--record-file", RUN_RECORD_FILE,
    "--bank-command", RUN_BANK_COMMAND,
  ],
};

/** A literal read as itself, so a gate name or a path carrying regex punctuation still matches. */
function literally(text: string): RegExp {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
}

/** What each row's reader is owed, over the channel that row named. */
function owedOfTheReader(told: string): RegExp[] {
  const measured = `${runMeasured.detected}/${runMeasured.total} \\(`;
  const banked = `${runBanked.detected}/${runBanked.total} \\(`;

  if (told === "the verdict it reached") {
    return [literally(runGate), new RegExp(measured), new RegExp(banked)];
  }
  if (told === "where the record now stands") {
    return [literally(RUN_RECORD_FILE), literally(runRoot)];
  }
  if (told === "why it will not bank the run") {
    return [/NOT A RAISE/, literally(runGate), literally(RUN_RECORD_FILE), /by hand/];
  }
  // The two misuse rows share a phrase and part on WHICH fault: a run told only "usage" cannot tell
  // an operator which of the two things they got wrong, and both rows would pass on either message.
  const whichFault = runCalledAs.includes("report")
    ? /--report[\s\S]*?needs a value/
    : /--gate[\s\S]*?names the gate/;
  return [/usage/, /--gate/, /--report/, whichFault];
}

/**
 * The shapes an unhandled fall leaves, each with a sample of the fall it was drawn from.
 *
 * PROVED TO FIRE BEFORE ITS ABSENCE IS BELIEVED. A pattern that matched nothing is an absence
 * indistinguishable from a clean run, which is precisely the false green this arm exists to close.
 */
const A_COMMAND_THAT_BROKE: readonly { pattern: RegExp; drawnFrom: string }[] = [
  { pattern: /^\s+at .+:\d+:\d+/m, drawnFrom: "    at ratchetCli (/tmp/x/ratchetCli.ts:41:9)" },
  {
    pattern: /Cannot find module|ERR_MODULE_NOT_FOUND|ERR_UNKNOWN_FILE_EXTENSION/,
    drawnFrom: "Error: Cannot find module './reconcile.js'",
  },
  {
    pattern: /\b(SyntaxError|ReferenceError|TypeError|RangeError)\b/,
    drawnFrom: "ReferenceError: reconcileGate is not defined",
  },
  { pattern: /Unexpected (token|identifier)/, drawnFrom: "SyntaxError: Unexpected token ')'" },
];

/**
 * That project's record, with the named gate standing at whatever two figures are handed in.
 *
 * THE EXPECTATION OF A RAISE IS BUILT FROM THIS RATHER THAN READ OFF THE RAISED FILE, which is what
 * makes the assertion byte-identity rather than a reading. Counting moved lines cannot tell a raise
 * that held the population still from a raise that lost half the file, and parsing the record back
 * and finding the new figures in it is satisfied by a re-serialisation that deleted every reason the
 * record was written to carry.
 */
function plantedRecordAt(detected: number, total: number): string {
  return [
    "# The bars parcel-co runs to. Its file, its gate names, its reasons.",
    "mutation-gates:",
    gateBlock(
      runGate,
      detected,
      total,
      runAllowed,
      "two mutants here are detected by timeout, and a timeout can flip to Survived on a slower machine with no change to the suite",
    ),
    gateBlock("tariff-tables", 431, 460, 0, "deterministic scope, zero timeouts"),
  ].join("\n");
}

Given(
  "a project keeping a ratchet record of its own, banking gate {string} at {int} kills of {int} mutants, allowing {int}",
  function (gate: string, detected: number, total: number, allowed: number) {
    runGate = gate;
    runBanked = { detected, total };
    runAllowed = allowed;
    runRecordText = plantedRecordAt(detected, total);

    assert.notEqual(RUN_RECORD_FILE, RECORD_FILE);
  },
);

Given("that gate's own sweep measured {int} kills of {int} mutants", function (detected: number, total: number) {
  runMeasured = { detected, total };
});

When("the ratchet is run over that project's tree, {string}", function (calledAs: string) {
  runCalledAs = calledAs;
  runRoot = mkdtempSync(path.join(tmpdir(), "ratchet-command-"));
  plantedRoots.push(runRoot);

  // The root is the term of the five that fails in silence, so it is planted where a command
  // finding a tree of its own reaches nothing at all.
  assert.ok(
    !runRoot.startsWith(process.cwd()),
    `the calling project's tree at ${runRoot} sits inside the working directory, so this arm proves nothing about which tree was read.`,
  );

  writeFileSync(path.join(runRoot, RUN_RECORD_FILE), runRecordText, "utf8");
  const reportAt = path.join(runRoot, RUN_REPORT_PATH);
  mkdirSync(path.dirname(reportAt), { recursive: true });
  writeFileSync(
    reportAt,
    reportTextOf({
      "lib/routing.ts": [
        ...Array.from({ length: runMeasured.detected }, () => "Killed"),
        ...Array.from({ length: runMeasured.total - runMeasured.detected }, () => "Survived"),
      ],
    }),
    "utf8",
  );

  const arguments_ = HOW_IT_IS_CALLED[calledAs];
  assert.ok(arguments_ !== undefined, `no row of this scenario words a call as "${calledAs}".`);
  const run = spawnSync(TSX_BIN, [RATCHET_COMMAND, ...arguments_(runRoot)], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  runFailedToSpawn = run.error?.message;
  runEndedWith = run.status;
  runAnswered = run.stdout ?? "";
  runComplained = run.stderr ?? "";
});

Then(
  /^the run ends (cleanly|in failure|broken), telling its reader "([^"]+)" where a reader reads (an answer|a fault)$/,
  function (ending: string, told: string, channel: string) {
    assert.equal(runFailedToSpawn, undefined, `the ratchet must run; it failed to spawn: ${runFailedToSpawn}`);
    assert.equal(
      runEndedWith,
      ENDS_ON[ending],
      `the run should have ended ${ending}; it ended ${runEndedWith}.\nanswer: ${runAnswered}\nfault: ${runComplained}`,
    );

    const said = channel === "an answer" ? runAnswered : runComplained;
    assert.ok(said.trim().length > 0, `nothing reached ${channel} at all.\nanswer: ${runAnswered}\nfault: ${runComplained}`);
    for (const owed of owedOfTheReader(told)) {
      assert.match(said, owed, `${channel} does not carry ${told}: ${said}`);
    }

    // A verdict is an answer, so a run that reached one and complained as well is a run that ended
    // twice; and a run broken in how it was called reached no verdict to print at all.
    if (channel === "an answer") {
      assert.equal(runComplained.trim(), "", `the run answered and complained at once: ${runComplained}`);
    }
    if (ending === "broken") {
      assert.equal(runAnswered.trim(), "", `a run broken in how it was called reached a verdict anyway: ${runAnswered}`);
    }
  },
);

Then(
  /^that project's ratchet record is (untouched, byte for byte|raised to that run)$/,
  function (how: string) {
    const now = readFileSync(path.join(runRoot, RUN_RECORD_FILE), "utf8");

    if (how === "untouched, byte for byte") {
      // AS BYTES, NOT AS A READING. Parsing the record back and finding it still banking 812 of 900
      // is satisfied by a file rewritten to the very figures it already held; only the bytes say the
      // lines were never touched at all.
      assert.equal(now, runRecordText, "the record moved on a run that was never to move it.");
      return;
    }

    // AS BYTES AGAIN, AND FROM THE OTHER SIDE. The raised record is required to be the planted one
    // with the named gate's two figures reading the run's — every comment, every blank line, every
    // reason and the sibling gate's whole block byte-identical. A recorder that re-serialised the
    // document reaches the same two figures and reds here; one that raised the first `detected` line
    // it met raises the sibling and reds here too.
    const raised = plantedRecordAt(runMeasured.detected, runMeasured.total);

    assert.notEqual(raised, runRecordText, "the row's run is not a raise, so this assertion proves nothing.");
    assert.equal(now, raised, "the raised record is not the planted one with its two figures moved.");
  },
);

Then(
  "neither channel carries the fall of a command that broke before it reached its own argument",
  function () {
    const both = `${runAnswered}\n${runComplained}`;

    for (const { pattern, drawnFrom } of A_COMMAND_THAT_BROKE) {
      assert.ok(pattern.test(drawnFrom), `nothing in "${drawnFrom}" matches this pattern, so its absence proves nothing.`);
      assert.ok(!pattern.test(both), `the run left the fall of a command that broke: ${both}`);
    }
  },
);
