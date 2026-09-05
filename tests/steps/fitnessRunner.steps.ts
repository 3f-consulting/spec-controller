/**
 * @integration for @SCN-LNT-023 — the fitness pass runs the command its configured row names, over
 * REAL processes.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the step block below carries the @SCN it proves,
 * matching features/fitness-reconciliation.feature and the @unit pins in
 * packages/spec-controller/static-checks/fitnessRunner.test.ts.
 *
 * WHAT THIS ARM ADDS OVER THE @unit ONE, WHICH IS THE ONLY REASON IT EXISTS. The unit arm hands the
 * verdict rule a `run` that answers from a table, so it proves the reasoning and nothing about the
 * spawn. Here the commands are planted for real — one that exits clean, one that prints a finding
 * and exits 1 — and `spawnFitnessCommand` starts them. An exit code that was never collected, or a
 * stream never captured, reds here and is invisible over there.
 *
 * ITS OWN STEP TEXT RATHER THAN THE FITNESS PASS'S. `tests/steps/fitness.steps.ts` carries the ONE
 * sentence a converted check's scenario matches, and it is deliberately generic. This file is a
 * scenario ABOUT that runner rather than a scenario running under it, so it words its steps for
 * itself — cucumber registers step definitions globally within a profile, and a scenario that
 * borrowed the pass's own sentence would be indistinguishable from a converted check.
 *
 * Parent: 3F-3138 — the general shape of a converted fitness check.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";

import {
  fitnessCheckFault,
  fitnessCommandsOf,
  spawnFitnessCommand,
  type FitnessCommandRegistry,
} from "../../packages/spec-controller/static-checks/fitnessRunner.js";

// @SCN-LNT-023 — the runner over three scenarios: two a row names and one no row names. The rows
// are planted in the shape a manifest spells them and read through the real reader, so the arm
// exercises the resolution as well as the spawn.

/** The three scenarios of the planted corpus, in the order the Then reads their verdicts. */
const PLANTED_SCENARIOS = ["SCN-CVT-011", "SCN-CVT-012", "SCN-CVT-013"] as const;

/** The command that finds nothing, and the one that finds a violation and prints it. */
const CLEAN_COMMAND = 'node -e "process.exit(0)"';
const VIOLATING_COMMAND =
  'node -e "console.log(\'two functions over the complexity threshold\'); process.exit(1)"';

let plantedCommands: FitnessCommandRegistry;
let faults: (string | null)[];

// @SCN-LNT-023
Given(
  "a target's configured rows name a command for two of the three fitness scenarios its corpus carries, and none for the third",
  function () {
    plantedCommands = fitnessCommandsOf([
      { scn: PLANTED_SCENARIOS[0], characteristic: "complexity", command: CLEAN_COMMAND },
      { scn: PLANTED_SCENARIOS[1], characteristic: "vocab", command: VIOLATING_COMMAND },
    ]);
    // The fixture is held to what this scenario says it holds: a third row drifting in would make
    // the no-row arm green for the wrong reason.
    assert.deepEqual(
      [...plantedCommands.keys()],
      [PLANTED_SCENARIOS[0], PLANTED_SCENARIOS[1]],
      "expected the planted rows to name the first two scenarios and no other"
    );
  }
);

// @SCN-LNT-023
Given("the first of those commands finds nothing while the second finds a violation it prints", function () {
  // Stated as an assertion over the planted commands rather than as prose about them, so the arm
  // cannot go on passing against two commands that had quietly become the same one.
  assert.equal(plantedCommands.get(PLANTED_SCENARIOS[0]), CLEAN_COMMAND);
  assert.equal(plantedCommands.get(PLANTED_SCENARIOS[1]), VIOLATING_COMMAND);
});

// @SCN-LNT-023
When("each of the three scenarios runs under the fitness pass", function () {
  // The REAL spawn, which is the whole of what this arm adds.
  faults = PLANTED_SCENARIOS.map((scnId) =>
    fitnessCheckFault(scnId, plantedCommands, spawnFitnessCommand)
  );
});

// @SCN-LNT-023
Then(
  "the first passes, the second fails naming the command that spoke and quoting what it printed, and the third fails saying no configured row names it",
  function () {
    assert.equal(faults[0], null, "expected the clean command to raise no fault");

    const violation = faults[1] ?? "";
    // The quoted line can only have come from the child process's own stdout, so this is also what
    // says the command RAN rather than that a verdict was reached about it.
    assert.match(violation, /SCN-CVT-012/);
    assert.ok(
      violation.includes(VIOLATING_COMMAND),
      `expected the fault to name the command verbatim; got: ${violation}`
    );
    assert.match(violation, /exited 1/);
    assert.match(violation, /two functions over the complexity threshold/);

    const unconfigured = faults[2] ?? "";
    assert.match(unconfigured, /SCN-CVT-013/);
    assert.match(unconfigured, /specController\.fitnessChecks/);
  }
);
