/**
 * @unit for @SCN-LNT-024 — the fitness pass runs a MEASURED row's command, reads the number off
 * what it printed, and posts that number as this run's credit for the characteristic the row names.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe/it strings carry [SCN-LNT-024],
 * matching features/fitness-reconciliation.feature and the @integration arm's step block in
 * tests/steps/fitnessMeasurement.steps.ts.
 *
 * WHAT THIS ARM PROVES THAT THE @integration ONE CANNOT REACH CHEAPLY. The number rule is read over
 * a table of things a command might print — a number, prose, nothing, a number the measurement
 * reader would refuse — none of which needs a process to have printed them. The posting rule is
 * read against an artefact this arm writes into a throwaway root and then reads back through the
 * REAL reader, which is the only reading that can catch a producer and a reader disagreeing about
 * the keys of a row neither of them wrote.
 *
 * IT CARRIES ITS OWN `run` DOUBLE RATHER THAN BORROWING THE STATIC HALF'S (3F-3196). The two arms
 * inject the same `RunFitnessCommand` seam, and the obvious move would be to state the double once
 * and import it — but a `.test.ts` importing a `.test.ts` re-registers the imported file's suites
 * in the importing file's run, so the whole static half would be counted twice. The double is six
 * lines of table lookup with nothing to get wrong; the rules it feeds are stated once each, in the
 * modules, which is where a second copy would have mattered.
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
  type FitnessCheckIndex,
  type MeasurementReport,
} from "@3f-consulting/spec-controller-core/internal";

import {
  fitnessCommandsOf,
  type FitnessCommandResult,
  type RunFitnessCommand,
} from "./fitnessCommand.js";
import {
  fitnessMeasurement,
  measuredNumberOf,
  postFitnessMeasurement,
} from "./fitnessMeasurement.js";
import { MEASUREMENT_ARTEFACT_PATH } from "./measurementArtefact.js";

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
 * The SAME rows as the LEDGER reads them — the half of the row this pass cites but never authors.
 *
 * BUILT THROUGH THE LEDGER'S OWN READER RATHER THAN HAND-KEYED, because the whole claim of the
 * citation below is that the credit's `checkTag` and the debit's `staticCheck` are one word read
 * once. A hand-built map here would let the pass cite a characteristic the obligation rule never
 * raises, and this arm would say it was right to.
 */
const MEASURED_CHECKS: FitnessCheckIndex = fitnessChecksOf(MEASURED_ROWS);

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
    // 240 clears its bar is the ledger's sentence (3F-2509), and a pass that redded on it would
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
