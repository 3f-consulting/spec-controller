/**
 * @integration for @SCN-LNT-023 — the fitness pass runs the command its configured row names, over
 * REAL processes.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the step block below carries the @SCN it proves,
 * matching features/fitness-reconciliation.feature and the @unit pins in
 * tests/checks/fitnessRunner.test.ts.
 *
 * WHAT THIS ARM ADDS OVER THE @unit ONE, WHICH IS THE ONLY REASON IT EXISTS. The unit arm hands the
 * verdict rule a `run` that answers from a table, so it proves the reasoning and nothing about the
 * spawn. Here the commands are planted for real — one that exits clean, one that prints a finding
 * and reds, one that says it examined nothing, one that broke — and `spawnFitnessCommand` starts
 * them. An exit code that was never collected, or a stream never captured, reds here and is
 * invisible over there.
 *
 * AND THE THIRD ANSWER IS THE REASON THE PLANT GREW (3F-3169), THEN GREW AGAIN (3F-3170). A check
 * that examined nothing answers with the ONE code its own row names, and three of the planted
 * commands stand next to it: one that broke, answering with the neighbouring code this repository
 * already spends on that; one whose row names no code at all yet whose command ends in exactly the
 * words the third's did; and the clean one. All are real processes here, so a runner reading a
 * RANGE, or reading one fixed code for every row, greens the arm built to catch it.
 *
 * THE PAIR IN THE MIDDLE IS THE WHOLE ARM (3F-3170). The third and fourth planted commands are the
 * same executable line, spelled twice, and the only thing that differs between them is whether
 * their row said what that ending means. One is heard as a check that examined nothing and the
 * other as a fault — which is what "opt-in per row" reduces to when it is run rather than asserted.
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
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  fitnessCheckOutcome,
  fitnessCommandsAt,
  fitnessCommandsOf,
  spawnFitnessCommand,
  type FitnessCheckOutcome,
  type FitnessCommandRegistry,
} from "../checks/fitnessRunner.js";
import { NOT_EXAMINED_EXIT_CODE } from "../checks/scnSubIssueGate.js";

// @SCN-LNT-023 — the runner over six scenarios: five a row names and one no row names. The rows
// are planted in the shape a manifest spells them and read through the real reader, so the arm
// exercises the resolution as well as the spawn.

/** The six scenarios of the planted corpus, in the order the Then reads their verdicts. */
const PLANTED_SCENARIOS = [
  "SCN-CVT-011",
  "SCN-CVT-012",
  "SCN-CVT-013",
  "SCN-CVT-014",
  "SCN-CVT-015",
  "SCN-CVT-016",
] as const;

/** The command that finds nothing, and the one that finds a violation and prints it. */
const CLEAN_COMMAND = 'node -e "process.exit(0)"';
const VIOLATING_COMMAND =
  'node -e "console.log(\'two functions over the complexity threshold\'); process.exit(1)"';

/**
 * The command that examined nothing, and the one that broke — planted as REAL processes answering
 * with REAL codes, which is what makes the pair a boundary rather than a pair of table rows.
 *
 * THE FIRST SPELLS ITS CODE FROM THE CHECK'S OWN EXPORT rather than typing a 3 here. A plant that
 * typed the number would go on passing if the check moved to another code, proving the runner
 * against a contract nothing was keeping any more. That same export is what the PLANTED ROW names,
 * so the row and the command it names cannot come to disagree inside the fixture itself.
 */
const NOT_EXAMINED_COMMAND = `node -e "console.error('no pull-request body to read'); process.exit(${NOT_EXAMINED_EXIT_CODE})"`;
const BROKEN_COMMAND = 'node -e "console.error(\'usage: lint <path>\'); process.exit(2)"';

let plantedCommands: FitnessCommandRegistry;
let outcomes: FitnessCheckOutcome[];

// @SCN-LNT-023
Given(
  "a target's configured rows name a command for five of the six fitness scenarios its corpus carries, and none for the sixth",
  function () {
    plantedCommands = fitnessCommandsOf([
      {
        scn: PLANTED_SCENARIOS[0],
        characteristic: "complexity",
        command: CLEAN_COMMAND,
        notExaminedExit: NOT_EXAMINED_EXIT_CODE,
      },
      {
        scn: PLANTED_SCENARIOS[1],
        characteristic: "vocab",
        command: VIOLATING_COMMAND,
        notExaminedExit: NOT_EXAMINED_EXIT_CODE,
      },
      {
        scn: PLANTED_SCENARIOS[2],
        characteristic: "traceability",
        command: NOT_EXAMINED_COMMAND,
        notExaminedExit: NOT_EXAMINED_EXIT_CODE,
      },
      // THE FOURTH ROW NAMES NO CODE, AND THAT IS THE ONE DIFFERENCE (3F-3170). Its command is the
      // third's, character for character — so anything the two rows are heard to say differently
      // came from the rows rather than from the processes.
      { scn: PLANTED_SCENARIOS[3], characteristic: "traceability", command: NOT_EXAMINED_COMMAND },
      {
        scn: PLANTED_SCENARIOS[4],
        characteristic: "traceability",
        command: BROKEN_COMMAND,
        notExaminedExit: NOT_EXAMINED_EXIT_CODE,
      },
    ]);
    // The fixture is held to what this scenario says it holds: a sixth row drifting in would make
    // the no-row arm green for the wrong reason.
    assert.deepEqual(
      [...plantedCommands.keys()],
      [...PLANTED_SCENARIOS].slice(0, 5),
      "expected the planted rows to name the first five scenarios and no other"
    );
  }
);

// @SCN-LNT-023
Given(
  "every one of those rows but the fourth also names the code by which its command says it examined nothing",
  function () {
    // Read back off the REGISTRY rather than off the literal above, so a reader that quietly
    // stopped carrying the field — or started inventing one — is caught here rather than in the
    // verdicts, where a wrong reason and a right answer look the same.
    assert.deepEqual(
      PLANTED_SCENARIOS.slice(0, 5).map((scn) => plantedCommands.get(scn)?.notExaminedExit),
      [
        NOT_EXAMINED_EXIT_CODE,
        NOT_EXAMINED_EXIT_CODE,
        NOT_EXAMINED_EXIT_CODE,
        null,
        NOT_EXAMINED_EXIT_CODE,
      ],
      "expected every planted row but the fourth to name its command's not-examined code"
    );
  }
);

// @SCN-LNT-023
Given(
  "those commands are, in order, one that finds nothing, one that finds a violation it prints, one that says it examined nothing, another saying it examined nothing in exactly the same words, and one that is itself broken",
  function () {
    // Stated as an assertion over the planted commands rather than as prose about them, so the arm
    // cannot go on passing against five commands that had quietly become the same one.
    assert.equal(plantedCommands.get(PLANTED_SCENARIOS[0])?.command, CLEAN_COMMAND);
    assert.equal(plantedCommands.get(PLANTED_SCENARIOS[1])?.command, VIOLATING_COMMAND);
    assert.equal(plantedCommands.get(PLANTED_SCENARIOS[2])?.command, NOT_EXAMINED_COMMAND);
    // IDENTICAL, AND ASSERTED TO BE. If these two ever drifted apart the pair would stop being a
    // discriminator and become two unrelated commands that happen to get different answers.
    assert.equal(
      plantedCommands.get(PLANTED_SCENARIOS[3])?.command,
      plantedCommands.get(PLANTED_SCENARIOS[2])?.command,
      "expected the fourth command to be the third's, character for character"
    );
    assert.equal(plantedCommands.get(PLANTED_SCENARIOS[4])?.command, BROKEN_COMMAND);
    // The two codes are ADJACENT and must not be the same one, which is the whole of what the
    // broken plant is for: a runner reading a range rather than one code would tell them apart
    // nowhere.
    assert.notEqual(NOT_EXAMINED_EXIT_CODE, 2);
  }
);

// @SCN-LNT-023
When("each of the six scenarios runs under the fitness pass", function () {
  // The REAL spawn, which is the whole of what this arm adds.
  outcomes = PLANTED_SCENARIOS.map((scnId) =>
    fitnessCheckOutcome(scnId, plantedCommands, spawnFitnessCommand)
  );
});

// @SCN-LNT-023
Then(
  "the first passes, the second fails naming the command that spoke and quoting what it printed, the third neither passes nor fails, the fourth fails although its command said what the third's said because its own row names no such code, the fifth fails because a check that broke is not one that examined nothing, and the sixth fails saying no configured row names it",
  function () {
    assert.deepEqual(
      outcomes.map((outcome) => outcome.verdict),
      ["clean", "fault", "not-examined", "fault", "fault", "fault"],
      `expected the six planted scenarios to reach three distinct verdicts; got ${JSON.stringify(
        outcomes
      )}`
    );

    assert.equal(outcomes[0]!.fault, null, "expected the clean command to raise no fault");

    const violation = outcomes[1]!.fault ?? "";
    // The quoted line can only have come from the child process's own stdout, so this is also what
    // says the command RAN rather than that a verdict was reached about it.
    assert.match(violation, /SCN-CVT-012/);
    assert.ok(
      violation.includes(VIOLATING_COMMAND),
      `expected the fault to name the command verbatim; got: ${violation}`
    );
    assert.match(violation, /exited 1/);
    assert.match(violation, /two functions over the complexity threshold/);

    // The third answer carries no sentence at all: it is the ordinary state of a check whose input
    // only CI holds, and the pass says so by reporting the scenario as neither passed nor failed.
    assert.equal(outcomes[2]!.fault, null, "expected the check that examined nothing to raise none");

    // THE ARM THIS SCENARIO EXISTS FOR (3F-3170). The same command, run again, under a row that
    // named no code for that ending — so it is a fault, and its message says the ordinary thing a
    // fault says. A runner reading one code for every target answers `not-examined` here, which is
    // a consumer's own red arriving as a non-failure.
    const unnamed = outcomes[3]!.fault ?? "";
    assert.match(unnamed, /SCN-CVT-014/);
    assert.match(unnamed, new RegExp(`exited ${NOT_EXAMINED_EXIT_CODE}`));
    assert.match(unnamed, /no pull-request body to read/);

    const broken = outcomes[4]!.fault ?? "";
    assert.match(broken, /SCN-CVT-015/);
    assert.match(broken, /exited 2/);
    assert.match(broken, /usage: lint <path>/);

    const unconfigured = outcomes[5]!.fault ?? "";
    assert.match(unconfigured, /SCN-CVT-016/);
    assert.match(unconfigured, /specController\.fitnessChecks/);
  }
);

/**
 * THE TWO ENDINGS THE PROTOCOL ITSELF SPENDS, TYPED HERE RATHER THAN IMPORTED — and that is the
 * INVERSE of the reasoning above it, deliberately. The not-examined plant spells its ending from
 * the check's own export because that ending is a fact about one check and may move; these two are
 * the fixed points a pass and a violation are read by, and a plant that spelled them from the same
 * constant the reader compares against would go on passing if both were changed together. Typed,
 * they say WHICH endings are refused rather than that some pair of them is.
 */
const CLEAN_RUN_ENDING = 0;
const VIOLATION_ENDING = 1;

/**
 * The ending the accepted row names — and it is deliberately one that is SPOKEN FOR elsewhere.
 * `lint:scn-subissues` says "I examined nothing" with it and this product's own `balance` spends it
 * on a pending-items verdict under `--strict`, and the row naming it is still read as written: the
 * field says what THAT row's command means by an ending, which is the row author's sentence rather
 * than the runner's. Only the protocol's own two are refused.
 */
const ACCEPTED_ENDING = 3;

/* ═══ @integration FOR @SCN-LNT-025 — the refusal happens before anything runs ═══════════════════
 *
 * WHAT THIS ARM ADDS OVER THE @unit ONE. Over there the refusal is read off `fitnessCommandsOf`,
 * which takes no `run` argument at all — so it cannot spawn, structurally, and that is as far as
 * reasoning gets. Here each planted row names a REAL command that writes a REAL file whenever it
 * runs, the rows are read from a REAL manifest through `fitnessCommandsAt`, and the two refused
 * rows' files are then asserted absent.
 *
 * AND THE ABSENCE IS READ AGAINST A TRACE SHOWN TO ARRIVE. Four rows name the same command line,
 * character for character apart from where each writes; the accepted row's command is then run
 * through `spawnFitnessCommand` and its file IS there. Without that half, a trace mechanism that
 * never worked would look exactly like a refusal that ran nothing.
 */

// @SCN-LNT-025

/** One planted target: its own root, the row it carries, and the file its command writes. */
interface PlantedTarget {
  readonly scn: string;
  readonly root: string;
  readonly trace: string;
}

/** The four planted targets, in the order the Then reads them. */
let plantedTargets: PlantedTarget[] = [];
/** What each read came to — the refusal it was met with, or the row it was read as. */
let refusals: (string | null)[] = [];
let readRegistries: (FitnessCommandRegistry | null)[] = [];

/** The command every planted row names: it writes its trace, and that is all it does. */
function tracingCommand(trace: string): string {
  return `node -e "require('node:fs').writeFileSync('${trace}', 'ran')"`;
}

/** Write one planted target's manifest, carrying its one row exactly as a target spells it. */
function plantManifest(target: PlantedTarget, notExaminedExit: number | undefined): void {
  const row: Record<string, unknown> = {
    scn: target.scn,
    characteristic: "traceability",
    command: tracingCommand(target.trace),
  };
  // ABSENT, NOT `undefined`: the fourth row must name no ending AT ALL in the file on disk, and a
  // key spelled with `undefined` would be dropped by `JSON.stringify` here but is a different
  // fixture from one that was never written.
  if (notExaminedExit !== undefined) row.notExaminedExit = notExaminedExit;
  writeFileSync(
    join(target.root, "package.json"),
    `${JSON.stringify({ name: "planted-target", specController: { fitnessChecks: [row] } }, null, 2)}\n`,
    "utf8"
  );
}

// @SCN-LNT-025
Given("four rows, each naming a command that leaves a trace behind it whenever it runs", function () {
  plantedTargets = [1, 2, 3, 4].map((nth) => {
    const root = mkdtempSync(join(tmpdir(), `fitness-refusal-${nth}-`));
    return { scn: `SCN-CVT-02${nth}`, root, trace: join(root, "it-ran") };
  });
  // The traces are asserted ABSENT before anything is read, so a file left behind by an earlier run
  // cannot be mistaken for this run's evidence — and one already there would make the whole arm
  // green for a reason that has nothing to do with the refusal.
  for (const target of plantedTargets) {
    if (existsSync(target.trace)) {
      assert.fail(`expected ${target.trace} not to exist before anything was read`);
    }
  }
});

// @SCN-LNT-025
Given(
  "the first names, as the ending by which its command says it examined nothing, the ending of a clean run; the second names the ending of a run that found something; the third names an ending that is neither; and the fourth names no ending at all",
  function () {
    const spent = [CLEAN_RUN_ENDING, VIOLATION_ENDING, ACCEPTED_ENDING, undefined];
    plantedTargets.forEach((target, nth) => plantManifest(target, spent[nth]));
    // Read back off the FILES rather than off the literals above: the fixture's whole claim is what
    // is written down in four manifests, and an arm asserting what it meant to write would pass
    // over a fixture that wrote something else.
    assert.deepEqual(
      plantedTargets.map(
        (target) =>
          (
            JSON.parse(readFileSync(join(target.root, "package.json"), "utf8")) as {
              specController: { fitnessChecks: { notExaminedExit?: number }[] };
            }
          ).specController.fitnessChecks[0]!.notExaminedExit
      ),
      [CLEAN_RUN_ENDING, VIOLATION_ENDING, ACCEPTED_ENDING, undefined],
      "expected the four planted manifests to name a clean run's ending, a violation's, a third that is neither, and none at all"
    );
    // The two refused endings are the PROTOCOL'S, and the accepted one is neither of them — stated
    // as an assertion because a fixture whose three numbers had drifted together would prove that
    // the reader refuses everything and read as though it discriminated.
    assert.notEqual(ACCEPTED_ENDING, CLEAN_RUN_ENDING);
    assert.notEqual(ACCEPTED_ENDING, VIOLATION_ENDING);
  }
);

// @SCN-LNT-025
When("each of those rows is read on its own", function () {
  refusals = [];
  readRegistries = [];
  for (const target of plantedTargets) {
    try {
      // THE REAL MANIFEST, THROUGH THE REAL READER. `fitnessCommandsAt` is what the fitness pass
      // itself calls, so this is the same moment a target's rows are read on a real run.
      readRegistries.push(fitnessCommandsAt(target.root));
      refusals.push(null);
    } catch (refused) {
      refusals.push((refused as Error).message);
      readRegistries.push(null);
    }
  }
});

// @SCN-LNT-025
Then(
  "the first two are refused, each refusal naming the row it is about and the value that row carries, and neither command has left the trace it leaves whenever it runs",
  function () {
    for (const nth of [0, 1]) {
      const target = plantedTargets[nth]!;
      // `?? null` rather than a bare index: the read is what this arm is about, so an index that
      // came back short would otherwise be narrowed away rather than asserted on.
      const refusal = refusals[nth] ?? null;
      // `assert.fail` rather than `assert.ok(refusal !== null, …)`: cucumber renders an assertion
      // carrying an `actual`/`expected` pair as a bare `false !== true` diff, and this arm's whole
      // report is the sentence that says WHICH row went unrefused.
      if (refusal === null) {
        assert.fail(
          `expected the row naming ${nth === 0 ? CLEAN_RUN_ENDING : VIOLATION_ENDING} to be refused when the target's rows were read, and no refusal came`
        );
      }
      // WHICH ROW AND WHICH VALUE. A refusal saying only that the configuration is wrong sends the
      // reader hunting through every row a target carries for the one that said it.
      assert.match(refusal, new RegExp(target.scn));
      assert.match(refusal, new RegExp(`notExaminedExit: ${nth === 0 ? CLEAN_RUN_ENDING : VIOLATION_ENDING}`));
      // AND IT HAPPENED BEFORE ANYTHING RAN. The command that row names writes this file every time
      // it runs; the file is not there, so the command was not run.
      if (existsSync(target.trace)) {
        assert.fail(
          `expected the refused row's command never to have run, but it left ${target.trace} behind`
        );
      }
    }
  }
);

// @SCN-LNT-025
Then(
  "the third and fourth are read as written, and the third's command then runs and leaves that same trace",
  function () {
    const accepted = plantedTargets[2]!;
    const silent = plantedTargets[3]!;
    assert.equal(refusals[2], null, "expected a row naming a third ending to be read, not refused");
    assert.equal(refusals[3], null, "expected a row naming no ending at all to be read, not refused");
    assert.equal(readRegistries[2]?.get(accepted.scn)?.notExaminedExit, ACCEPTED_ENDING);
    assert.equal(readRegistries[3]?.get(silent.scn)?.notExaminedExit, null);

    // THE POSITIVE CONTROL, AND THE ARM IS WORTH NOTHING WITHOUT IT. The same command line the two
    // refused rows named, run for real through the pass's own spawn — its trace arrives, so the
    // absence asserted above is a command that did not run rather than a trace that never worked.
    const outcome = fitnessCheckOutcome(accepted.scn, readRegistries[2]!, spawnFitnessCommand);
    assert.equal(outcome.verdict, "clean", outcome.fault ?? "");
    if (!existsSync(accepted.trace)) {
      assert.fail(
        `expected the accepted row's command to leave ${accepted.trace} behind when it ran, and it did not`
      );
    }
  }
);
