/**
 * @unit for @SCN-LNT-023 — the fitness pass runs the command its configured row names, and the
 * scenario fails on a non-zero exit.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe/it strings carry [SCN-LNT-023],
 * matching features/fitness-reconciliation.feature and the @integration arm's step block in
 * tests/steps/fitnessRunner.steps.ts.
 *
 * THE PROCESS IS INJECTED HERE AND REAL IN THE OTHER ARM. Everything below hands
 * `fitnessCheckFault` a `run` that answers from a table, so the two things a verdict actually
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
import {
  fitnessCheckFault,
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
  { scn: "SCN-CPX-005", characteristic: "complexity", command: "eslint" },
  { scn: "@SCN-MUT-011", characteristic: "mutation", command: "pnpm --silent mutation:score" },
];

describe("[SCN-LNT-023] the command a configured row names", () => {
  it("[SCN-LNT-023] is read off each row and keyed by the bare @SCN the row is about", () => {
    // The sigil is stripped exactly as the ledger's own reading of these rows strips it: a target
    // that spells `"@SCN-MUT-011"` names the same scenario as one that spells it bare, or the row
    // is filed under a key the running scenario's tag line never asks for.
    expect([...fitnessCommandsOf(ROWS)]).toEqual([
      ["SCN-CPX-005", "eslint"],
      ["SCN-MUT-011", "pnpm --silent mutation:score"],
    ]);
  });

  it("[SCN-LNT-023] drops a row that names no scenario or no command, and reads nothing from a non-list", () => {
    // A half-read row is worse than a dropped one: it would leave a scenario resolving to a command
    // the target never wrote, or a command attached to no scenario. Both terms or neither.
    expect([
      ...fitnessCommandsOf([
        { characteristic: "complexity", command: "eslint" },
        { scn: "SCN-CPX-005", characteristic: "complexity" },
        { scn: "SCN-CPX-005", characteristic: "complexity", command: "   " },
        { scn: "  ", characteristic: "complexity", command: "eslint" },
        "not a row",
        null,
      ]),
    ]).toEqual([]);
    expect([...fitnessCommandsOf(undefined)]).toEqual([]);
    expect([...fitnessCommandsOf("SCN-CPX-005")]).toEqual([]);
  });
});

describe("[SCN-LNT-023] the exit code the row's command answers with", () => {
  const commands = fitnessCommandsOf(ROWS);

  it("[SCN-LNT-023] is no fault at zero, and the command reached for is the one the row names", () => {
    const { run, ran } = recordingRun({});
    expect(fitnessCheckFault("SCN-CPX-005", commands, run)).toBeNull();
    expect(ran).toEqual(["eslint"]);
  });

  it("[SCN-LNT-023] is a fault at non-zero, naming the command, its exit code and what it printed", () => {
    const { run } = recordingRun({
      eslint: { status: 1, stdout: "src/a.ts:12  complexity of 14\n", stderr: "" },
    });
    const fault = fitnessCheckFault("SCN-CPX-005", commands, run);
    // The three things the reader needs to act without going and finding the row themselves.
    expect(fault).toContain("SCN-CPX-005");
    expect(fault).toContain("`eslint`");
    expect(fault).toContain("exited 1");
    expect(fault).toContain("src/a.ts:12  complexity of 14");
  });

  it("[SCN-LNT-023] quotes stderr too, and says so where the command printed nothing at all", () => {
    const { run } = recordingRun({ eslint: { status: 2, stderr: "cannot read the config\n" } });
    expect(fitnessCheckFault("SCN-CPX-005", commands, run)).toContain("cannot read the config");
    // A silent non-zero exit is a fault report of its own: the message must not read as though the
    // quoting broke.
    const silent = recordingRun({ eslint: { status: 1 } });
    expect(fitnessCheckFault("SCN-CPX-005", commands, silent.run)).toContain("printed nothing");
  });

  it("[SCN-LNT-023] is a fault when the command never answered with a code at all", () => {
    // `null` is what a spawn reports for a command killed by a signal, or one that could not be
    // started. Folding it into the non-zero arm would print "exited null" at the person.
    const { run } = recordingRun({ eslint: { status: null } });
    const fault = fitnessCheckFault("SCN-CPX-005", commands, run);
    expect(fault).toContain("`eslint`");
    expect(fault).toContain("did not run to completion");
    expect(fault).not.toContain("exited");
  });
});

describe("[SCN-LNT-023] a @fitness scenario no configured row names", () => {
  it("[SCN-LNT-023] is a fault, and nothing is run for it", () => {
    // THIS SCENARIO'S OWN RULING (3F-3142 left the runtime half of @SCN-LNT-020 here). Such a
    // scenario said which axis it is on and nothing about what it asserts, so nothing was examined
    // — and a pass would put a scenario in the fitness report saying a check ran when none did.
    const { run, ran } = recordingRun({});
    const fault = fitnessCheckFault("SCN-CPX-005", new Map(), run);
    expect(fault).toContain("SCN-CPX-005");
    expect(fault).toContain("specController.fitnessChecks");
    expect(ran).toEqual([]);
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
    scn: "SCN-MUT-011",
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
    const outcome = fitnessMeasurement("SCN-MUT-011", MEASURED_CHECKS, commands, run);
    expect(outcome.fault).toBeNull();
    expect(outcome.measurement).toEqual({
      scnId: "SCN-MUT-011",
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
      const outcome = fitnessMeasurement("SCN-MUT-011", MEASURED_CHECKS, commands, run);
      // BOTH halves, every time: either alone is the quiet failure the ruling names.
      expect(outcome.measurement).toBeNull();
      expect(outcome.fault).toContain("SCN-MUT-011");
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
    const outcome = fitnessMeasurement("SCN-MUT-011", MEASURED_CHECKS, commands, run);
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
    postFitnessMeasurement(root, { scnId: "SCN-MUT-011", checkTag: "mutation", measured: 240 });
    // THROUGH THE REAL READER, not by inspecting the JSON: a producer that agreed with the reader
    // by inspection would agree until the day one of them was edited, and a mis-keyed row is not
    // loud — it is dropped, and the obligation reconciles missing.
    expect(postedAt(root)).toEqual([
      { qualityCheck: "lint", scnId: "SCN-MUT-011", checkTag: "mutation", measured: 240 },
    ]);
  });

  it("[SCN-LNT-024] posts BESIDE what this run already measured, never over it", () => {
    const root = plantedRoot();
    mkdirSync(path.join(root, path.dirname(MEASUREMENT_ARTEFACT_PATH)), { recursive: true });
    writeFileSync(
      path.join(root, MEASUREMENT_ARTEFACT_PATH),
      JSON.stringify({
        measurements: [{ scnId: "SCN-CIP-014", checkTag: "ci-run-time", measured: 42.1 }],
      }),
      "utf8"
    );
    postFitnessMeasurement(root, { scnId: "SCN-MUT-011", checkTag: "mutation", measured: 240 });
    expect(postedAt(root)).toEqual([
      { qualityCheck: "lint", scnId: "SCN-CIP-014", checkTag: "ci-run-time", measured: 42.1 },
      { qualityCheck: "lint", scnId: "SCN-MUT-011", checkTag: "mutation", measured: 240 },
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
