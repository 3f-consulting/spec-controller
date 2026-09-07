/**
 * @integration for @SCN-LNT-024 — a measured row's number read off what a REAL command printed, and
 * posted into a real artefact.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the step block below carries the @SCN it proves,
 * matching features/fitness-reconciliation.feature and the @unit pins in
 * tests/checks/fitnessMeasurement.test.ts.
 *
 * WHAT THIS ARM ADDS OVER THE @unit ONE, WHICH IS THE ONLY REASON IT EXISTS. The unit arm hands the
 * measurement rule a `run` that answers from a table, so it proves the reading and nothing about
 * where the printed output came from. Here three commands are planted for real — one printing a
 * number, one printing prose, one printing nothing — and `spawnFitnessCommand` starts them. A
 * stream never captured, or one captured from the wrong place, reds here and is invisible over
 * there. The posting is over a real root as well, and what it wrote is read back through the reader
 * `balance` itself uses.
 *
 * THE THIRD COMMAND PRINTS ON ITS ERROR STREAM AND NOTHING ON ITS OUTPUT, which is the contract
 * from the other side: a command may say whatever it likes, as long as the only thing on its output
 * is the number. A pass that read both streams together would take that command's prose as its
 * measurement — and would pass this arm if the arm only ever planted silent commands.
 *
 * ITS OWN STEP TEXT RATHER THAN THE FITNESS PASS'S. `tests/steps/fitness.steps.ts` carries the two
 * sentences a converted check's scenario matches, and both are deliberately generic. This file is a
 * scenario ABOUT that pass rather than one running under it, so it words its steps for itself —
 * cucumber registers step definitions globally within a profile, and a scenario that borrowed the
 * pass's own sentence would be indistinguishable from a converted check.
 *
 * Parent: 3F-3138 — the general shape of a converted fitness check.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  fitnessChecksOf,
  parseMeasuredEvidenceObservations,
  type FitnessCheckIndex,
  type MeasurementReport,
} from "@3f-consulting/spec-controller-core/internal";

import { MEASUREMENT_ARTEFACT_PATH } from "../checks/measurementArtefact.js";
import {
  fitnessCommandsOf,
  spawnFitnessCommand,
  type FitnessCommandIndex,
} from "../checks/fitnessCommand.js";
import {
  fitnessMeasurement,
  postFitnessMeasurement,
  type FitnessMeasurementOutcome,
} from "../checks/fitnessMeasurement.js";

// @SCN-LNT-024 — the measured pass over three scenarios whose rows each name a real command: one
// that prints a number, one that prints prose, one that prints nothing on its output at all. The
// rows are planted in the shape a manifest spells them and read through BOTH real readers, so the
// arm exercises the resolution and the citation as well as the spawn and the posting.

/** The three scenarios of the planted corpus, in the order the Then reads their outcomes. */
const PLANTED_SCENARIOS = ["SCN-CVT-021", "SCN-CVT-022", "SCN-CVT-023"] as const;

/** The characteristic each planted row asserts, cited by the measurement its command yields. */
const PLANTED_CHARACTERISTICS = ["mutation", "complexity", "ci-run-time"] as const;

/** A command that prints a number, one that prints prose, one that prints only on its error stream. */
const NUMBER_COMMAND = 'node -e "console.log(240)"';
const PROSE_COMMAND = 'node -e "console.log(\'mutation score: 240\')"';
const SILENT_COMMAND = 'node -e "console.error(\'swept 0 mutants\')"';
const PLANTED_COMMANDS = [NUMBER_COMMAND, PROSE_COMMAND, SILENT_COMMAND] as const;

/** What another producer of this run already posted, before any of the three scenarios ran. */
const ALREADY_MEASURED = { scnId: "SCN-AAA-006", checkTag: "ci-run-time", measured: 42.1 };

let plantedRoot: string;
let plantedCommands: FitnessCommandIndex;
let plantedChecks: FitnessCheckIndex;
let outcomes: FitnessMeasurementOutcome[];

// @SCN-LNT-024
Given(
  "a target's configured rows name a measured fitness check for each of three of its scenarios, and this run has already measured something else",
  function () {
    const rows = PLANTED_SCENARIOS.map((scn, at) => ({
      scn,
      characteristic: PLANTED_CHARACTERISTICS[at]!,
      command: PLANTED_COMMANDS[at]!,
      atLeast: 1,
    }));
    // BOTH readers over the SAME rows, which is what the citation assertion below rests on: the
    // characteristic the pass cites is the one the ledger's own reader took off the row.
    plantedCommands = fitnessCommandsOf(rows);
    plantedChecks = fitnessChecksOf(rows);

    plantedRoot = mkdtempSync(path.join(tmpdir(), "scn-lnt-024-"));
    const artefactPath = path.join(plantedRoot, MEASUREMENT_ARTEFACT_PATH);
    mkdirSync(path.dirname(artefactPath), { recursive: true });
    writeFileSync(artefactPath, JSON.stringify({ measurements: [ALREADY_MEASURED] }), "utf8");
  }
);

// @SCN-LNT-024
Given(
  "the first of those commands prints a number, the second prints prose, and the third prints nothing at all",
  function () {
    // Stated as an assertion over the planted rows rather than as prose about them, so the arm
    // cannot go on passing against three commands that had quietly become the same one.
    // The COMMAND half of each row, which is the only half a measured check has: this route reads
    // no exit code, so the code a row may name for one is not its business (3F-3170).
    assert.deepEqual(
      [...plantedCommands.values()].map((row) => row.command),
      [...PLANTED_COMMANDS]
    );
    assert.deepEqual(
      [...plantedChecks.values()].map((check) => check.characteristic),
      [...PLANTED_CHARACTERISTICS]
    );
  }
);

// @SCN-LNT-024
When("each of those three scenarios runs under the fitness pass", function () {
  // The REAL spawn and the REAL write, which is the whole of what this arm adds.
  outcomes = PLANTED_SCENARIOS.map((scnId) => {
    const outcome = fitnessMeasurement(scnId, plantedChecks, plantedCommands, spawnFitnessCommand);
    postFitnessMeasurement(plantedRoot, outcome.measurement);
    return outcome;
  });
});

// @SCN-LNT-024
Then(
  "the first posts its number citing its own @SCN and the characteristic its row names, beside the measurement already there, and the other two fail with nothing posted for either",
  function () {
    assert.equal(outcomes[0]?.fault, null, outcomes[0]?.fault ?? "");

    for (const at of [1, 2]) {
      const outcome = outcomes[at]!;
      assert.equal(outcome.measurement, null, `expected nothing measured for ${PLANTED_SCENARIOS[at]}`);
      const fault = outcome.fault ?? "";
      assert.ok(
        fault.includes(PLANTED_SCENARIOS[at]!) && fault.includes(PLANTED_COMMANDS[at]!),
        `expected the fault to name the scenario and its command verbatim; got: ${fault}`
      );
    }

    // THROUGH THE READER `balance` USES, not by inspecting the JSON. A producer agreeing with that
    // reader by inspection agrees until the day one of them is edited, and a mis-keyed row is not
    // loud — it is dropped, and the obligation reconciles as a check that never ran.
    const artefact = readFileSync(path.join(plantedRoot, MEASUREMENT_ARTEFACT_PATH), "utf8");
    const posted = parseMeasuredEvidenceObservations(JSON.parse(artefact) as MeasurementReport);
    assert.deepEqual(posted, [
      { qualityCheck: "lint", ...ALREADY_MEASURED },
      { qualityCheck: "lint", scnId: PLANTED_SCENARIOS[0], checkTag: "mutation", measured: 240 },
    ]);
  }
);
