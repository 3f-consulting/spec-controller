/**
 * @unit for @SCN-LNT-023 — the fitness pass runs the command its configured row names and reads its
 * verdict off the ending: a clean run, a violation, or — where that row named the code its command
 * says so with — a check that examined nothing.
 *
 * THE THIRD ANSWER IS OPT-IN AND THE ARMS BELOW ARE BUILT AROUND THAT (3F-3170). Two registries run
 * through every arm that touches it: one whose row NAMES a code, one whose row names none. The
 * second is not a control in the decorative sense — it is the arm the previous runner could not
 * pass, because a code fixed for every target reads a consumer's own red as a skip.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe/it strings carry [SCN-LNT-023],
 * matching features/fitness-reconciliation.feature and the @integration arm's step block in
 * tests/steps/fitnessRunner.steps.ts.
 *
 * THE PROCESS IS INJECTED HERE AND REAL IN THE OTHER ARM. Everything below hands
 * `fitnessCheckOutcome` a `run` that answers from a table, so the two things a verdict actually
 * depends on — which row a scenario resolves to, and what an exit code means — are read without a
 * shell being involved at all. The arms that would be a nuisance to stage as executables (a
 * non-zero exit that printed nothing, a command killed before it answered) are ordinary rows here.
 * The @integration arm then spawns for real, so neither reading stands alone.
 *
 * THE INJECTED `run` RECORDS WHAT IT WAS ASKED TO RUN, and that is not incidental. A verdict rule
 * that resolved the wrong row, or ran a command for a scenario no row names, would satisfy every
 * assertion about the MESSAGE while running the wrong thing — so the commands actually reached for
 * are asserted beside the verdicts, and the no-row arm asserts that nothing was reached for at all.
 *
 * Parent: 3F-3138 — the general shape of a converted fitness check.
 */

import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, it, expect } from "vitest";

import {
  fitnessChecksOf,
  parseMeasuredEvidenceObservations,
  type FitnessCheckRegistry,
  type MeasurementReport,
} from "@3f-consulting/spec-controller-core/internal";

import { MEASUREMENT_ARTEFACT_PATH } from "./measurementArtefact.js";
import { NOT_EXAMINED_EXIT_CODE } from "./scnSubIssueGate.js";
import {
  fitnessCheckOutcome,
  fitnessCommandsOf,
  fitnessMeasurement,
  measuredNumberOf,
  postFitnessMeasurement,
  type FitnessCommandResult,
  type RunFitnessCommand,
} from "./fitnessRunner.js";

/** A `run` that answers from a table and records every command it was handed. */
function recordingRun(answers: Record<string, Partial<FitnessCommandResult>>): {
  run: RunFitnessCommand;
  ran: string[];
} {
  const ran: string[] = [];
  const run: RunFitnessCommand = (command) => {
    ran.push(command);
    const answer = answers[command] ?? {};
    // `??` would be wrong here and quietly: an answer stating `status: null` — the code a killed
    // command reports — would default back to a clean exit and the arm that needs it would prove
    // the zero case twice.
    return {
      status: "status" in answer ? (answer.status ?? null) : 0,
      stdout: answer.stdout ?? "",
      stderr: answer.stderr ?? "",
    };
  };
  return { run, ran };
}

/** The two rows the arms below resolve against, in the shape a manifest spells them. */
const ROWS = [
  { scn: "SCN-AAA-001", characteristic: "complexity", command: "eslint" },
  { scn: "@SCN-AAA-007", characteristic: "mutation", command: "pnpm --silent mutation:score" },
];

/**
 * The code the arms below plant a row with — and it is deliberately NOT the one the first check to
 * answer this way chose (3F-3170).
 *
 * A ROW'S CODE IS THE ROW'S, so an arm planting the code the runner used to be fixed at would pass
 * against a runner that had never learnt to read the row at all. Planting a different one is what
 * makes the arm the discriminator between "reads the row" and "still reads a constant".
 */
const PLANTED_NOT_EXAMINED_EXIT = 7;

/** The same two rows, the first of them naming the code its command says it examined nothing with. */
const ROWS_NAMING_THE_CODE = [
  { ...ROWS[0], notExaminedExit: PLANTED_NOT_EXAMINED_EXIT },
  ROWS[1],
];

describe("[SCN-LNT-023] the command a configured row names", () => {
  it("[SCN-LNT-023] is read off each row and keyed by the bare @SCN the row is about", () => {
    // The sigil is stripped exactly as the ledger's own reading of these rows strips it: a target
    // that spells `"@SCN-AAA-007"` names the same scenario as one that spells it bare, or the row
    // is filed under a key the running scenario's tag line never asks for.
    expect([...fitnessCommandsOf(ROWS)]).toEqual([
      ["SCN-AAA-001", { command: "eslint", notExaminedExit: null }],
      ["SCN-AAA-007", { command: "pnpm --silent mutation:score", notExaminedExit: null }],
    ]);
  });

  it("[SCN-LNT-023] carries the code a row names for a check that examined nothing, and null where it names none", () => {
    // OPT-IN, PER ROW, AND NEVER INFERRED (3F-3170). `null` is not a default standing in for a
    // number the reader could have worked out — it is the row saying nothing on the point, which
    // every row said until one asked, and which every row that never asks goes on saying.
    expect([...fitnessCommandsOf(ROWS_NAMING_THE_CODE)]).toEqual([
      ["SCN-AAA-001", { command: "eslint", notExaminedExit: PLANTED_NOT_EXAMINED_EXIT }],
      ["SCN-AAA-007", { command: "pnpm --silent mutation:score", notExaminedExit: null }],
    ]);
  });

  it("[SCN-LNT-023] takes only a whole number as a naming, and everything else as no naming at all", () => {
    // A ROW THE READER CANNOT TAKE AT ITS WORD GETS THE SAFE READING, and that direction is the
    // whole of why this is safe to state so quietly: a naming misread as absent leaves the code a
    // FAULT, loud where the person is. Misread the other way and a broken check would be reported
    // as one that examined nothing. A row naming an ending the protocol has already spent is
    // refused outright when the rows are read, and that is @SCN-LNT-025's sentence rather than
    // this one's — the reading here comes first, and it is what makes the refusal a judgement of
    // what a row SAID rather than a guess at what it meant.
    const unreadable = fitnessCommandsOf([
      { scn: "SCN-A", characteristic: "complexity", command: "a", notExaminedExit: "7" },
      { scn: "SCN-B", characteristic: "complexity", command: "b", notExaminedExit: 7.5 },
      { scn: "SCN-C", characteristic: "complexity", command: "c", notExaminedExit: null },
      { scn: "SCN-D", characteristic: "complexity", command: "d", notExaminedExit: Number.NaN },
    ]);
    expect([...unreadable.values()].map((row) => row.notExaminedExit)).toEqual([
      null,
      null,
      null,
      null,
    ]);
    // And the row itself SURVIVES — an unreadable field is not a reason to drop the command with
    // it, which would turn a typo into a scenario naming no check at all.
    expect([...unreadable.keys()]).toEqual(["SCN-A", "SCN-B", "SCN-C", "SCN-D"]);
  });

  it("[SCN-LNT-023] drops a row that names no scenario or no command, and reads nothing from a non-list", () => {
    // A half-read row is worse than a dropped one: it would leave a scenario resolving to a command
    // the target never wrote, or a command attached to no scenario. Both terms or neither.
    expect([
      ...fitnessCommandsOf([
        { characteristic: "complexity", command: "eslint" },
        { scn: "SCN-AAA-001", characteristic: "complexity" },
        { scn: "SCN-AAA-001", characteristic: "complexity", command: "   " },
        { scn: "  ", characteristic: "complexity", command: "eslint" },
        "not a row",
        null,
      ]),
    ]).toEqual([]);
    expect([...fitnessCommandsOf(undefined)]).toEqual([]);
    expect([...fitnessCommandsOf("SCN-AAA-001")]).toEqual([]);
  });
});

describe("[SCN-LNT-023] the exit code the row's command answers with", () => {
  const commands = fitnessCommandsOf(ROWS);

  it("[SCN-LNT-023] is no fault at zero, and the command reached for is the one the row names", () => {
    const { run, ran } = recordingRun({});
    expect(fitnessCheckOutcome("SCN-AAA-001", commands, run)).toEqual({
      verdict: "clean",
      fault: null,
    });
    expect(ran).toEqual(["eslint"]);
  });

  it("[SCN-LNT-023] is a fault at non-zero, naming the command, its exit code and what it printed", () => {
    const { run } = recordingRun({
      eslint: { status: 1, stdout: "src/a.ts:12  complexity of 14\n", stderr: "" },
    });
    const outcome = fitnessCheckOutcome("SCN-AAA-001", commands, run);
    expect(outcome.verdict).toBe("fault");
    // The three things the reader needs to act without going and finding the row themselves.
    expect(outcome.fault).toContain("SCN-AAA-001");
    expect(outcome.fault).toContain("`eslint`");
    expect(outcome.fault).toContain("exited 1");
    expect(outcome.fault).toContain("src/a.ts:12  complexity of 14");
  });

  it("[SCN-LNT-023] quotes stderr too, and says so where the command printed nothing at all", () => {
    const { run } = recordingRun({ eslint: { status: 2, stderr: "cannot read the config\n" } });
    expect(fitnessCheckOutcome("SCN-AAA-001", commands, run).fault).toContain(
      "cannot read the config"
    );
    // A silent non-zero exit is a fault report of its own: the message must not read as though the
    // quoting broke.
    const silent = recordingRun({ eslint: { status: 1 } });
    expect(fitnessCheckOutcome("SCN-AAA-001", commands, silent.run).fault).toContain(
      "printed nothing"
    );
  });

  it("[SCN-LNT-023] is a fault when the command never answered with a code at all", () => {
    // `null` is what a spawn reports for a command killed by a signal, or one that could not be
    // started. Folding it into the non-zero arm would print "exited null" at the person.
    const { run } = recordingRun({ eslint: { status: null } });
    const outcome = fitnessCheckOutcome("SCN-AAA-001", commands, run);
    expect(outcome.verdict).toBe("fault");
    expect(outcome.fault).toContain("`eslint`");
    expect(outcome.fault).toContain("did not run to completion");
    expect(outcome.fault).not.toContain("exited");
  });
});

describe("[SCN-LNT-023] a check that could not examine anything (3F-3169, made opt-in at 3F-3170)", () => {
  const naming = fitnessCommandsOf(ROWS_NAMING_THE_CODE);
  const silent = fitnessCommandsOf(ROWS);

  it("[SCN-LNT-023] neither passes nor fails where its own row named that code, and raises no fault", () => {
    // THE THIRD ANSWER, AND IT IS NOT A PASS. 3F-3163 taught `lint:scn-subissues` to say "there is
    // no pull-request body to read, so nothing was examined" with a code of its own; a runner that
    // folded that into the fault arm reds an honest tree, and one that folded it into the clean arm
    // greens a scenario that examined nothing. Neither, then — the pass reports it as skipped.
    const { run, ran } = recordingRun({ eslint: { status: PLANTED_NOT_EXAMINED_EXIT } });
    expect(fitnessCheckOutcome("SCN-AAA-001", naming, run)).toEqual({
      verdict: "not-examined",
      fault: null,
    });
    // It still RAN, which is the half the credit reader takes: the answer came from the command.
    expect(ran).toEqual(["eslint"]);
  });

  it("[SCN-LNT-023] is a FAULT on that same ending where the row named no such code (3F-3170)", () => {
    // THE WHOLE POINT, AND THE ARM A RUNNER WITH ONE CODE FOR EVERY TARGET CANNOT PASS. The
    // ending planted here is the one `lint:scn-subissues` uses — and it is also the one this
    // product's own `balance` spends on a pending-items verdict under `--strict`. A row that said
    // nothing about what that ending means gets the two-answer reading, so the consumer keeps
    // their red; a runner reading that code for everybody hands it back to them as a skip.
    const { run } = recordingRun({
      eslint: { status: NOT_EXAMINED_EXIT_CODE, stderr: "1 Pending Item under --strict\n" },
    });
    const outcome = fitnessCheckOutcome("SCN-AAA-001", silent, run);
    expect(outcome.verdict).toBe("fault");
    expect(outcome.fault).toContain(`exited ${NOT_EXAMINED_EXIT_CODE}`);
    expect(outcome.fault).toContain("1 Pending Item under --strict");
  });

  it("[SCN-LNT-023] reads the code off the ROW rather than off any one check's own spelling", () => {
    // `lint:scn-subissues` IS THE FIRST MEMBER, NOT THE RULE. Its own code is a fact about that
    // check, and a runner pinned to it would be reading one check's answer into every target's
    // commands. So a row naming a DIFFERENT code is heard on that code and on no other — which
    // this pair states in both directions over the one registry.
    const { run } = recordingRun({ eslint: { status: NOT_EXAMINED_EXIT_CODE } });
    expect(fitnessCheckOutcome("SCN-AAA-001", naming, run).verdict).toBe("fault");
    const named = recordingRun({ eslint: { status: PLANTED_NOT_EXAMINED_EXIT } });
    expect(fitnessCheckOutcome("SCN-AAA-001", naming, named.run).verdict).toBe("not-examined");
  });

  it("[SCN-LNT-023] is that ONE code and not a range, so a broken check stays a fault", () => {
    // A range would hand the third answer to every check that broke — and the code a target's own
    // tooling spends on a usage error is routinely the NEIGHBOUR of the one it says this with. So
    // the only ending heard this way is the exact one the row named, and every other ending a
    // command can reach is a check that broke.
    for (const status of [1, 2, 4, PLANTED_NOT_EXAMINED_EXIT - 1, 127]) {
      const { run } = recordingRun({ eslint: { status, stderr: "usage: eslint <path>\n" } });
      expect(fitnessCheckOutcome("SCN-AAA-001", naming, run).verdict).toBe("fault");
    }
    const { run } = recordingRun({ eslint: { status: PLANTED_NOT_EXAMINED_EXIT } });
    expect(fitnessCheckOutcome("SCN-AAA-001", naming, run).verdict).toBe("not-examined");
  });
});

describe("[SCN-LNT-023] a @fitness scenario no configured row names", () => {
  it("[SCN-LNT-023] is a fault, and nothing is run for it", () => {
    // THIS SCENARIO'S OWN RULING (3F-3142 left the runtime half of @SCN-LNT-020 here). Such a
    // scenario said which axis it is on and nothing about what it asserts, so nothing was examined
    // — and a pass would put a scenario in the fitness report saying a check ran when none did.
    const { run, ran } = recordingRun({});
    const outcome = fitnessCheckOutcome("SCN-AAA-001", new Map(), run);
    // A FAULT AND NOT THE THIRD ANSWER (3F-3169). Nothing was examined here either, but the reason
    // is a corpus somebody has to fix rather than an input CI holds — so it reds where the person
    // is, exactly as it did before the third answer existed.
    expect(outcome.verdict).toBe("fault");
    expect(outcome.fault).toContain("SCN-AAA-001");
    expect(outcome.fault).toContain("specController.fitnessChecks");
    expect(ran).toEqual([]);
  });
});

/* ═══ @unit FOR @SCN-LNT-025 — the two endings no row may spend ══════════════════════════════ */

/**
 * WHY EVERY ARM BELOW CALLS THE READER AND NOTHING ELSE. The refusal is at the READ, so what these
 * arms exercise is `fitnessCommandsOf` on its own — and that reader takes no `run` argument at all,
 * which is the structural half of "before anything is spawned": there is nothing in its signature
 * to spawn with. The other half is the @integration arm in `tests/steps/fitnessRunner.steps.ts`,
 * where every planted command would leave a trace on disk and the refused ones leave none.
 *
 * THE ACCEPTED ARMS ARE NOT DECORATION. A reader that refused every row would satisfy both refusal
 * arms and nothing else, so the endings that stay the row's — including the two this product's own
 * `balance` spends — are planted beside them.
 */

/** One row in the shape a manifest spells it, naming whatever ending it is handed. */
function rowNaming(named: unknown): readonly unknown[] {
  return [{ scn: "SCN-AAA-001", characteristic: "complexity", command: "eslint", notExaminedExit: named }];
}

/** The refusal a row naming `named` is met with — asserted to have happened at all. */
function refusalOver(named: unknown): string {
  let refusal: string | null = null;
  try {
    fitnessCommandsOf(rowNaming(named));
  } catch (refused) {
    refusal = (refused as Error).message;
  }
  expect(
    refusal,
    `expected a row naming ${JSON.stringify(named)} to be refused when the rows were read`
  ).not.toBeNull();
  return refusal ?? "";
}

describe("[SCN-LNT-025] a row spending one of the protocol's own endings on the third answer", () => {
  it("[SCN-LNT-025] is refused at the read where the ending it spends is a clean run's", () => {
    // THE CHECK WOULD REPORT ITSELF AS HAVING EXAMINED NOTHING ON EXACTLY THE RUNS WHERE IT WORKED.
    // A clean run is how the pass hears "I found nothing", so a row spending that ending on the
    // third answer leaves the check with no way left to say it passed.
    const refusal = refusalOver(0);
    // The row AND the value, because "the configuration is invalid" sends the reader hunting
    // through thirteen rows for the one that said it.
    expect(refusal).toContain("SCN-AAA-001");
    expect(refusal).toContain("notExaminedExit: 0");
  });

  it("[SCN-LNT-025] is refused at the read where the ending it spends is a violation's", () => {
    // EVERY FINDING WOULD ARRIVE AS A CHECK THAT EXAMINED NOTHING — a red becoming a non-failure at
    // whatever scale that check runs, on the one ending the tooling world agrees means "I found
    // something". And it is the arm that says why the refusal cannot wait for the run: the run that
    // would discover it IS the run whose failure it swallows.
    const refusal = refusalOver(1);
    expect(refusal).toContain("SCN-AAA-001");
    expect(refusal).toContain("notExaminedExit: 1");
  });

  it("[SCN-LNT-025] says at the refusal that every other ending stays the row's, so it is not read as a list of permitted ones", () => {
    // THE REFUSAL IS AGAINST THE PROTOCOL'S OWN FIXED POINTS, NOT AGAINST ANY TOOL'S TAXONOMY, and
    // the message has to say so or the next reader tidies two refusals into an allow-list. Pinned
    // rather than left to the prose, because a comment saying this would go quietly false.
    for (const spent of [0, 1]) {
      expect(refusalOver(spent)).toContain("is the row's to name");
    }
  });

  it("[SCN-LNT-025] reads a row naming any other ending as written, including the two this product itself spends", () => {
    // `balance` answers 2 for a usage fault and 4 for an unsound run (`src/cli-balance/cli.ts`), and
    // BOTH are still the row author's to name: the field says what THAT command means by an ending,
    // and a runner with opinions about another tool's taxonomy is what 3F-3170 removed. A consumer
    // whose check honestly has no subject to examine and says so with 2 is stating a fact about
    // their own command.
    for (const named of [2, 3, 4, 7, 64, 127]) {
      expect([...fitnessCommandsOf(rowNaming(named)).values()]).toEqual([
        { command: "eslint", notExaminedExit: named },
      ]);
    }
  });

  it("[SCN-LNT-025] reads a row naming no ending at all as written, and one whose naming it cannot take at its word", () => {
    // THE DEFAULT IS UNTOUCHED BY THIS REFUSAL. A row silent on the point keeps the two-answer
    // reading (3F-3170), and a value the reader cannot take at its word is no naming either — so
    // neither is refused, and neither reaches the third answer.
    expect([...fitnessCommandsOf(rowNaming(undefined)).values()]).toEqual([
      { command: "eslint", notExaminedExit: null },
    ]);
    expect([...fitnessCommandsOf([{ scn: "SCN-AAA-001", command: "eslint" }]).values()]).toEqual([
      { command: "eslint", notExaminedExit: null },
    ]);
    // AND A STRING SPELLING OF A REFUSED ENDING IS NOT ONE. `"0"` is not a naming, so it is not a
    // naming of the clean run's ending either — the reader refuses what it has READ, and reading
    // and judging in one step is how a refusal starts guessing at what a target meant.
    expect([...fitnessCommandsOf(rowNaming("0")).values()]).toEqual([
      { command: "eslint", notExaminedExit: null },
    ]);
  });
});

/* ═══ @unit FOR @SCN-LNT-024 — the measured half ═════════════════════════════════════════════ */

/**
 * WHAT THIS ARM PROVES THAT THE @integration ONE CANNOT REACH CHEAPLY. The number rule is read over
 * a table of things a command might print — a number, prose, nothing, a number the measurement
 * reader would refuse — none of which needs a process to have printed them. The posting rule is
 * read against an artefact this arm writes into a throwaway root and then reads back through the
 * REAL reader, which is the only reading that can catch a producer and a reader disagreeing about
 * the keys of a row neither of them wrote.
 */

/** The two rows the measured arms resolve against, in the shape a manifest spells them. */
const MEASURED_ROWS = [
  {
    scn: "SCN-AAA-007",
    characteristic: "mutation",
    command: "pnpm --silent mutation:score",
    atLeast: 240,
  },
];

/**
 * The SAME rows as the LEDGER reads them — the half of the row this runner cites but never authors.
 *
 * BUILT THROUGH THE LEDGER'S OWN READER RATHER THAN HAND-KEYED, because the whole claim of the
 * citation below is that the credit's `checkTag` and the debit's `staticCheck` are one word read
 * once. A hand-built map here would let the runner cite a characteristic the obligation rule never
 * raises, and this arm would say it was right to.
 */
const MEASURED_CHECKS: FitnessCheckRegistry = fitnessChecksOf(MEASURED_ROWS);

describe("[SCN-LNT-024] the number a measured row's command printed", () => {
  it("[SCN-LNT-024] is read off what it printed, whatever whitespace came with it", () => {
    expect(measuredNumberOf("240\n")).toBe(240);
    expect(measuredNumberOf("  97.5  \n\n")).toBe(97.5);
    // Zero is a real measurement — a suite can kill nothing — and must not read as "no number".
    expect(measuredNumberOf("0")).toBe(0);
  });

  it("[SCN-LNT-024] is absent where the command printed prose, nothing, or more than one thing", () => {
    expect(measuredNumberOf("mutation score: 240")).toBeNull();
    expect(measuredNumberOf("")).toBeNull();
    expect(measuredNumberOf("   \n ")).toBeNull();
    // Two numbers is not one measurement, and taking the first would post a number nobody meant.
    expect(measuredNumberOf("240\n241\n")).toBeNull();
  });

  it("[SCN-LNT-024] is absent where the number is one the measurement reader would refuse", () => {
    // A number posted here that `parseMeasuredEvidenceObservations` drops leaves the row reading
    // `missing` with nothing red anywhere — the silent failure this scenario exists to foreclose.
    // So the refusal happens HERE, where it fails the scenario out loud.
    expect(measuredNumberOf("-1")).toBeNull();
    expect(measuredNumberOf("Infinity")).toBeNull();
    expect(measuredNumberOf("NaN")).toBeNull();
  });
});

describe("[SCN-LNT-024] the measurement a measured row's command yields", () => {
  const commands = fitnessCommandsOf(MEASURED_ROWS);

  it("[SCN-LNT-024] cites the scenario's own @SCN and the characteristic its row names", () => {
    const { run, ran } = recordingRun({
      "pnpm --silent mutation:score": { stdout: "240\n" },
    });
    const outcome = fitnessMeasurement("SCN-AAA-007", MEASURED_CHECKS, commands, run);
    expect(outcome.fault).toBeNull();
    expect(outcome.measurement).toEqual({
      scnId: "SCN-AAA-007",
      checkTag: "mutation",
      measured: 240,
    });
    // The command reached for is the one the row names — a rule that resolved the wrong row would
    // satisfy every assertion about the number while measuring something else.
    expect(ran).toEqual(["pnpm --silent mutation:score"]);
  });

  it("[SCN-LNT-024] is a fault with NOTHING measured where the command printed no usable number", () => {
    for (const printed of ["mutation score: 240", "", "-1"]) {
      const { run } = recordingRun({ "pnpm --silent mutation:score": { stdout: printed } });
      const outcome = fitnessMeasurement("SCN-AAA-007", MEASURED_CHECKS, commands, run);
      // BOTH halves, every time: either alone is the quiet failure the ruling names.
      expect(outcome.measurement).toBeNull();
      expect(outcome.fault).toContain("SCN-AAA-007");
      expect(outcome.fault).toContain("pnpm --silent mutation:score");
    }
  });

  it("[SCN-LNT-024] does not read the exit code — the number is the evidence, and the bar is the ledger's", () => {
    // A command that answered with a number and a non-zero code has honoured the contract. Whether
    // 240 clears its bar is the ledger's sentence (3F-2509), and a runner that redded on it would
    // be the second arbiter of one characteristic.
    const { run } = recordingRun({
      "pnpm --silent mutation:score": { status: 1, stdout: "240\n", stderr: "swept in 9m" },
    });
    const outcome = fitnessMeasurement("SCN-AAA-007", MEASURED_CHECKS, commands, run);
    expect(outcome.fault).toBeNull();
    expect(outcome.measurement?.measured).toBe(240);
  });

  it("[SCN-LNT-024] is a fault, and nothing is run, for a scenario no configured row names", () => {
    const { run, ran } = recordingRun({});
    const outcome = fitnessMeasurement("SCN-CVT-099", MEASURED_CHECKS, commands, run);
    expect(outcome.measurement).toBeNull();
    expect(outcome.fault).toContain("specController.fitnessChecks");
    expect(ran).toEqual([]);
  });
});

describe("[SCN-LNT-024] the artefact a measured row's number posts into", () => {
  /** A throwaway root, so the posting rule is read over a real file rather than a mock of one. */
  function plantedRoot(): string {
    return mkdtempSync(path.join(tmpdir(), "scn-lnt-024-"));
  }

  /** What the artefact at a root says, read back through the reader `balance` itself uses. */
  function postedAt(root: string): unknown {
    const artefact = readFileSync(path.join(root, MEASUREMENT_ARTEFACT_PATH), "utf8");
    return parseMeasuredEvidenceObservations(JSON.parse(artefact) as MeasurementReport);
  }

  it("[SCN-LNT-024] is created where the run has posted nothing yet, and reads back through the real reader", () => {
    const root = plantedRoot();
    postFitnessMeasurement(root, { scnId: "SCN-AAA-007", checkTag: "mutation", measured: 240 });
    // THROUGH THE REAL READER, not by inspecting the JSON: a producer that agreed with the reader
    // by inspection would agree until the day one of them was edited, and a mis-keyed row is not
    // loud — it is dropped, and the obligation reconciles missing.
    expect(postedAt(root)).toEqual([
      { qualityCheck: "lint", scnId: "SCN-AAA-007", checkTag: "mutation", measured: 240 },
    ]);
  });

  it("[SCN-LNT-024] posts BESIDE what this run already measured, never over it", () => {
    const root = plantedRoot();
    mkdirSync(path.join(root, path.dirname(MEASUREMENT_ARTEFACT_PATH)), { recursive: true });
    writeFileSync(
      path.join(root, MEASUREMENT_ARTEFACT_PATH),
      JSON.stringify({
        measurements: [{ scnId: "SCN-AAA-006", checkTag: "ci-run-time", measured: 42.1 }],
      }),
      "utf8"
    );
    postFitnessMeasurement(root, { scnId: "SCN-AAA-007", checkTag: "mutation", measured: 240 });
    expect(postedAt(root)).toEqual([
      { qualityCheck: "lint", scnId: "SCN-AAA-006", checkTag: "ci-run-time", measured: 42.1 },
      { qualityCheck: "lint", scnId: "SCN-AAA-007", checkTag: "mutation", measured: 240 },
    ]);
  });

  it("[SCN-LNT-024] writes nothing at all where there was no measurement to post", () => {
    const root = plantedRoot();
    postFitnessMeasurement(root, null);
    // Not an empty artefact — no artefact. An empty one would be this producer claiming the run
    // measured nothing, over the top of whatever a sibling had already posted.
    expect(existsSync(path.join(root, MEASUREMENT_ARTEFACT_PATH))).toBe(false);
  });
});
