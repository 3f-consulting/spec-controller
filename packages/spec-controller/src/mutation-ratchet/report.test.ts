/**
 * Unit pin for the measurement counted out of a mutation report — the kills are the killed and the
 * timed-out, the population is those plus the survived and the never-covered, and the four statuses
 * the metric does not score are in neither (@SCN-RAT-010, 3F-2799).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe/it strings carry the @SCN id
 * matching features/mutation-ratchet.feature, so a grep of either returns both halves of the pair.
 * This scenario is `@unit` alone — nothing here reads a disk, so there is no wiring to reconcile.
 *
 * THE CLASSIFICATION IS RESTATED HERE RATHER THAN IMPORTED, AND THAT IS THE WHOLE POINT OF THE ARM.
 * A test that read the module's own two sets would agree with them by construction — including on
 * the day somebody moves `NoCoverage` out of one, which is exactly the edit this scenario exists to
 * red on. The tables below are the second entry, written from the metric's rule rather than from
 * the code that implements it.
 *
 * WHY THERE IS A SWEEP AS WELL AS A WORKED EXAMPLE. The worked example is one report holding all
 * eight statuses at once, and it reds a folded denominator loudly — but it fixes each status in one
 * position and one file, so a classifier right about that arrangement and wrong about another is
 * green against it. The sweep drives every ordered pair of the eight statuses through the counter,
 * each pair twice — both mutants filed under one path, then one under each of two — and pins each
 * status's membership independently of what it sits beside and of how the report groups it. Neither
 * half subsumes the other: the sweep never holds eight statuses at once, and the worked example
 * never varies the arrangement.
 *
 * AND EVERY REPORT BELOW CARRIES AT LEAST ONE SCORED MUTANT, DELIBERATELY. A report holding nothing
 * the metric scores is a run that measured nothing, and what that is answered with is
 * @SCN-RAT-009's ruling rather than this one's. Anchoring each sweep report with a single kill
 * keeps this arm to the question it asks — which set a status lands in — and leaves that one where
 * it belongs.
 */

import { describe, it, expect } from "vitest";

import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  measurementFromReport,
  readMutationReport,
  type MutationReportRead,
} from "./report.js";
import type { GateRecord } from "./record.js";
import { noMeasurement, verdictFor, type MutationMeasurement } from "./verdict.js";

/** The gate, as a project names it — the caller's word, never one read out of a report. */
const GATE = "domain";

/**
 * The path this arm's reports are said to have been read from — a fixture's own word for it.
 *
 * IT IS CARRIED SO A REFUSAL CAN NAME IT (@SCN-RAT-009) AND IS OTHERWISE INERT HERE, which the
 * assertions below rely on: every figure this arm checks is counted out of the text, so a counter
 * that reached for the path instead would have nothing to reach.
 */
const COUNTED_FROM = "somewhere/the-sweep-wrote/this-gate.json";

/**
 * The measurement a report counts to, with the read's refusal arm unwrapped.
 *
 * EVERY EXPECTATION IN THIS ARM WAS WRITTEN AGAINST A BARE MEASUREMENT (3F-2799) AND IS UNCHANGED.
 * What moved is the reader's shape: @SCN-RAT-009 widened it into a result that can refuse, so the
 * unwrapping lives here rather than in twenty assertions. A refusal over one of these reports is a
 * failure of the arm rather than a value it quietly reads a zero out of — every report below holds
 * scored mutants on purpose.
 */
function counted(gate: string, text: string): MutationMeasurement {
  const read = measurementFromReport(gate, text, COUNTED_FROM);
  if (!read.ok) throw new Error(`the fixture was refused rather than counted: ${read.reason}`);
  return read.measurement;
}

/**
 * The statuses the metric counts as a kill — stated from the metric's rule, not read from the
 * module. A timeout is a kill: the mutant changed the code enough that the suite never finished,
 * which is the suite noticing by a slower road.
 */
const KILL_STATUSES = ["Killed", "Timeout"] as const;

/**
 * The statuses that are in the population and are not a kill. `NoCoverage` belongs here and is the
 * member a lenient reader drops: a mutant no test reached is one this suite would not have noticed,
 * which is precisely what is being measured.
 */
const SURVIVOR_STATUSES = ["Survived", "NoCoverage"] as const;

/**
 * The four the metric does not score, and each is in neither set for the same reason. A mutant that
 * would not compile is not a survivor — nobody's assertion failed to catch it, because there was
 * never anything there to catch — and the same holds of one that faulted at run time, one the run
 * was told to ignore, and one that never got as far as being tried.
 */
const UNSCORED_STATUSES = ["CompileError", "RuntimeError", "Ignored", "Pending"] as const;

const EVERY_STATUS = [...KILL_STATUSES, ...SURVIVOR_STATUSES, ...UNSCORED_STATUSES] as const;

type MutantStatus = (typeof EVERY_STATUS)[number];

/** What one mutant of a status is worth to each of the two counts, per the table above. */
function worthOf(status: string): { readonly kills: number; readonly population: number } {
  if ((KILL_STATUSES as readonly string[]).includes(status)) return { kills: 1, population: 1 };
  if ((SURVIVOR_STATUSES as readonly string[]).includes(status)) return { kills: 0, population: 1 };
  return { kills: 0, population: 0 };
}

/** One file of a report, written as a tally of statuses. */
type FileTally = Readonly<Partial<Record<MutantStatus, number>>>;

/** A whole report, written as a tally per file. */
type ReportTally = Readonly<Record<string, Readonly<Record<string, number>>>>;

/** A report's text, built from a per-file tally plus whatever else the document should carry. */
function reportTextOf(files: ReportTally, extra: object = {}): string {
  let nextId = 0;
  const built = Object.fromEntries(
    Object.entries(files).map(([path, tally]) => [
      path,
      {
        language: "typescript",
        mutants: Object.entries(tally).flatMap(([status, count]) =>
          Array.from({ length: count }, () => ({
            id: String(nextId++),
            mutatorName: "ConditionalExpression",
            status,
          })),
        ),
      },
    ]),
  );
  return JSON.stringify({ schemaVersion: "1.0", ...extra, files: built }, null, 2);
}

/** How many mutants of one status a whole report tallies, whichever file each sits in. */
function heldAcross(files: ReportTally, status: string): number {
  return Object.values(files).reduce<number>((sum, tally) => sum + (tally[status] ?? 0), 0);
}

/**
 * THE WORKED EXAMPLE — one report, three files, all eight statuses, and the four unscored ones
 * spread so that folding any single one of them into the population lands on a different wrong
 * number. Five that would not compile, two that faulted, three ignored and one never tried: fold
 * them all and the population reads 27, fold exactly one and it reads 21, 18, 19 or 17. Every one
 * of those is red here, and none collides with the 16 that is right.
 *
 * AND NO ONE FILE HOLDS THE ANSWER. The three files score 5/7, 3/5 and 2/4, so a counter that
 * stopped at the first — or kept only the last — reds. A single-file fixture would have been green
 * against exactly that fault, which is the shape a small fixture takes by default.
 */
const WORKED_FILES = {
  "src/alpha.ts": { Killed: 4, Timeout: 1, Survived: 2, CompileError: 2, RuntimeError: 1 },
  "src/beta.ts": {
    Killed: 2,
    Timeout: 1,
    Survived: 1,
    NoCoverage: 1,
    CompileError: 1,
    Ignored: 2,
    Pending: 1,
  },
  "src/gamma.ts": {
    Killed: 1,
    Timeout: 1,
    Survived: 1,
    NoCoverage: 1,
    CompileError: 2,
    RuntimeError: 1,
    Ignored: 1,
  },
} as const satisfies Readonly<Record<string, FileTally>>;

/**
 * The thresholds the report's own run was configured against, planted holding figures the mutants
 * do not imply. Transcribing any of them would be taking the runner's verdict on its own homework
 * as the measurement, one artefact further out than the record this library reconciles against.
 */
const PLANTED_THRESHOLDS = { high: 90, low: 71, break: 88 } as const;

const WORKED_REPORT = reportTextOf(WORKED_FILES, { thresholds: PLANTED_THRESHOLDS });

/**
 * A SECOND REPORT OF EXACTLY THE SAME SIZE, COUNTING TO DIFFERENT FIGURES. Twenty-seven mutants
 * again, two files instead of three, and 12 kills of 22 rather than 10 of 16.
 *
 * IT IS HERE BECAUSE A PLANT GOT PAST EVERYTHING ELSE. `if (mutants.length === 27) return 10/16`
 * — an answer keyed to the fixture's shape rather than counted out of it — was green against all
 * ten assertions, because every other report these tests build is a different size and falls
 * through to the real counting. One more report of the same size and a different answer is what
 * closes that, and no arm above can do it: they all drive the one report whose answer is 10/16.
 */
const SAME_SIZE_FILES = {
  "src/delta.ts": { Killed: 3, Timeout: 2, Survived: 5, NoCoverage: 1, CompileError: 1, Ignored: 1 },
  "src/epsilon.ts": { Killed: 6, Timeout: 1, Survived: 2, NoCoverage: 2, RuntimeError: 2, Pending: 1 },
} as const satisfies Readonly<Record<string, FileTally>>;

describe("[SCN-RAT-010] measurementFromReport — the counts are the mutants' own", () => {
  it("is driven by a fixture holding all eight statuses, spread across three files", () => {
    expect(Object.keys(WORKED_FILES)).toHaveLength(3);
    expect(
      EVERY_STATUS.reduce<number>((sum, status) => sum + heldAcross(WORKED_FILES, status), 0),
    ).toBe(27);
    for (const status of EVERY_STATUS) {
      expect(
        heldAcross(WORKED_FILES, status),
        `the fixture holds no mutant of status ${status}`,
      ).toBeGreaterThan(0);
    }
  });

  it("holds 10 kills — the killed and the timed-out, and nothing besides", () => {
    expect(counted(GATE, WORKED_REPORT).detected).toBe(10);
  });

  it("holds a population of 16 — those kills plus the survived and the uncovered", () => {
    expect(counted(GATE, WORKED_REPORT).total).toBe(16);
  });

  it("does not fold the four statuses the metric does not score into the population", () => {
    const measurement = counted(GATE, WORKED_REPORT);
    expect(measurement.total, "every unscored mutant folded into the population").not.toBe(27);
    for (const status of UNSCORED_STATUSES) {
      const folded = 16 + heldAcross(WORKED_FILES, status);
      expect(
        measurement.total,
        `folding ${status} alone into the population would read ${folded}`,
      ).not.toBe(folded);
    }
  });

  it("takes both counts across every file the report groups, never one file's own", () => {
    const measurement = counted(GATE, WORKED_REPORT);
    const perFile = Object.entries(WORKED_FILES).map(([path, tally]) => ({
      path,
      counted: counted(GATE, reportTextOf({ [path]: tally })),
    }));
    for (const { path, counted } of perFile) {
      expect(
        [counted.detected, counted.total],
        `${path} alone must not carry the whole report's counts`,
      ).not.toEqual([measurement.detected, measurement.total]);
    }
    expect(perFile.reduce((sum, one) => sum + one.counted.detected, 0)).toBe(measurement.detected);
    expect(perFile.reduce((sum, one) => sum + one.counted.total, 0)).toBe(measurement.total);
  });

  it("reads no figure the report's own thresholds state", () => {
    const measurement = counted(GATE, WORKED_REPORT);
    expect(Object.keys(measurement).sort()).toEqual(["detected", "gate", "total"]);
    for (const [name, figure] of Object.entries(PLANTED_THRESHOLDS)) {
      expect(measurement.detected, `thresholds.${name} reached the kills`).not.toBe(figure);
      expect(measurement.total, `thresholds.${name} reached the population`).not.toBe(figure);
    }
  });

  it("counts the same whether the report states thresholds of its own or states none at all", () => {
    expect(counted(GATE, reportTextOf(WORKED_FILES))).toEqual(
      counted(GATE, WORKED_REPORT),
    );
  });

  it("counts a second report of the very same size to different figures", () => {
    expect(
      EVERY_STATUS.reduce<number>((sum, status) => sum + heldAcross(SAME_SIZE_FILES, status), 0),
    ).toBe(27);
    expect(counted(GATE, reportTextOf(SAME_SIZE_FILES))).toEqual({
      gate: GATE,
      detected: 12,
      total: 22,
    });
  });

  it("names the gate in the words its caller used, never a name read out of the report", () => {
    expect(counted("state-model", WORKED_REPORT).gate).toBe("state-model");
    expect(counted(GATE, WORKED_REPORT)).toEqual({
      gate: GATE,
      detected: 10,
      total: 16,
    });
  });
});

/** One kill, filed on its own path, so no sweep report is a run that measured nothing. */
const ANCHOR: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  "src/anchor.ts": { Killed: 1 },
};

/**
 * THE SWEEP — every ordered pair of the eight statuses, each pair counted twice: both mutants filed
 * under one path, then one under each of two. 8 × 8 × 2 = 128 reports, every one checked against
 * the classification stated at the top of this file rather than against the module's own.
 *
 * WHAT THE TWO HALVES WERE MEASURED TO CATCH, rather than what they were hoped to. Seven breaks
 * were planted in `report.ts` and run: folding the four unscored statuses into the population,
 * dropping `NoCoverage` from it, dropping `Timeout` from the kills, counting only the first file,
 * keeping only the last, and collapsing mutants that share a status all red BOTH halves — the
 * sweep names the offending pair, the worked example names the wrong figure. Transcribing the
 * report's own thresholds reds the WORKED EXAMPLE ALONE, because no report the sweep builds
 * carries a thresholds block. So neither half subsumes the other, and the sweep's value here is
 * breadth over arrangement rather than a fault the worked example is blind to.
 *
 * AND THE SWEEP IS COUNTED, NOT ASSUMED. Collecting disagreements and asserting the list is empty
 * is green when the loop never ran at all, so the number of reports actually driven is asserted
 * beside it.
 */
describe("[SCN-RAT-010] measurementFromReport — every status is counted into the same set whichever report carries it", () => {
  it("classifies all eight statuses identically across 128 arrangements of a pair", () => {
    const disagreements: string[] = [];
    let checked = 0;
    for (const first of EVERY_STATUS) {
      for (const second of EVERY_STATUS) {
        const kills = 1 + worthOf(first).kills + worthOf(second).kills;
        const population = 1 + worthOf(first).population + worthOf(second).population;
        const together: ReportTally =
          first === second
            ? { ...ANCHOR, "src/one.ts": { [first]: 2 } }
            : { ...ANCHOR, "src/one.ts": { [first]: 1, [second]: 1 } };
        const apart: ReportTally = {
          ...ANCHOR,
          "src/one.ts": { [first]: 1 },
          "src/two.ts": { [second]: 1 },
        };
        for (const files of [together, apart]) {
          checked += 1;
          const measurement = counted(GATE, reportTextOf(files));
          if (measurement.detected !== kills || measurement.total !== population) {
            disagreements.push(
              `${first} + ${second} across ${Object.keys(files).length} file(s): counted ` +
                `${measurement.detected}/${measurement.total}, the metric states ${kills}/${population}`,
            );
          }
        }
      }
    }
    expect(checked).toBe(EVERY_STATUS.length * EVERY_STATUS.length * 2);
    expect(disagreements).toEqual([]);
  });

  it("counts three mutants of one status exactly as the metric states them, for each of the eight", () => {
    const tallies = EVERY_STATUS.map((status) => {
      const measurement = counted(
        GATE,
        reportTextOf({ ...ANCHOR, "src/one.ts": { [status]: 3 } }),
      );
      return `${status}: ${measurement.detected}/${measurement.total}`;
    });
    expect(tallies).toEqual([
      "Killed: 4/4",
      "Timeout: 4/4",
      "Survived: 1/4",
      "NoCoverage: 1/4",
      "CompileError: 1/1",
      "RuntimeError: 1/1",
      "Ignored: 1/1",
      "Pending: 1/1",
    ]);
  });
});

/**
 * @SCN-RAT-009 — a report that is absent, unreadable, shapeless or holding no scored mutant reds as
 * no measurement, rather than as a score of zero.
 *
 * THE FIVE ROWS ARE ONE FAULT WEARING FIVE FACES, and each face is reached by a different reader
 * being lenient. Nothing at the path is the sweep that never ran; unreadable text is the sweep
 * killed part-way through its own write; a document of the wrong shape is a path pointing at
 * somebody else's artefact; a document with no grouping in it and a grouping with nothing scored in
 * it are the two ways a run can finish having measured nothing.
 *
 * WHAT THIS ARM CANNOT REACH, AND WHY THE @integration ARM EXISTS BESIDE IT. Four of the five rows
 * are decided on TEXT, and text is something this arm can compose. The fifth is decided on a tree,
 * and the only tree this arm hands the reader is a path that is not there — so a reader which
 * refused every path it was ever given would be green from here to the horizon. That control is the
 * @integration arm's, which plants a readable report on a real tree outside this repository's own
 * and requires it to come back as a measurement. Measured rather than hoped: a `readMutationReport`
 * planted to refuse unconditionally leaves every assertion below green and reds the @integration
 * arm on the spot.
 */

/**
 * The bar a refusal is NOT reconciled against — composed here, as a unit arm composes its inputs.
 *
 * IT IS PRESENT FOR THE ONE ASSERTION THAT NEEDS A BAR: the contrast between no measurement and a
 * measurement of zero. Reconciling a real zero against these counts reaches a regression, and the
 * whole ruling of this scenario is that the two must not be spelled the same.
 */
const BANKED: GateRecord = {
  gate: GATE,
  detected: 2175,
  total: 2243,
  allowance: {
    mutants: 3,
    reason: "three mutants here are detected by timeout, which can flip on a slower machine",
  },
};

/** The bank-it instruction, in a caller's own words — never one this library could have invented. */
const BANK_COMMAND = "bank-the-record domain --and-say-why";

/**
 * Where this arm's report is sought.
 *
 * IT IS UNDER NEITHER THIS TREE NOR THE ONE THE TESTS RUN FROM, deliberately. A refusal that names
 * a path is only worth reading if the path it names is the one it was handed, and a fixture sitting
 * under the working directory cannot tell "the path you gave me" from "the path I assumed".
 */
const SOUGHT_AT = join(tmpdir(), "ratchet-report-that-was-never-written", "this-gate.json");

/** A report whose only mutants are ones the metric does not score — a run that measured nothing. */
const NOTHING_SCORED = reportTextOf({
  "src/one.ts": { CompileError: 2, RuntimeError: 1 },
  "src/two.ts": { Ignored: 1, Pending: 1 },
});

/** One row of the Examples table: how the report stands, and what its reason must name. */
interface RefusedRow {
  /** How the report stands, in the Examples table's own words. */
  readonly row: string;
  /** The report's text, or `null` where the row is that there is no report at all. */
  readonly text: string | null;
  /** What the reason must name, in the Examples table's own words. */
  readonly names: string;
}

/**
 * The five rows, in the Examples table's order.
 *
 * THE LAST TWO ARE NOT THE SAME ROW TOLD TWICE. A document with no grouping in it never reached the
 * point of filing a mutant; a grouping holding only statuses the metric does not score is a run
 * that filed plenty and scored none of them. A reader that answered both with one sentence would be
 * telling somebody whose sweep silently matched nothing to go and look for a missing section.
 */
const REFUSED_ROWS: readonly RefusedRow[] = [
  { row: "is not there at all", text: null, names: "no report at" },
  {
    row: "is there, but is not readable JSON",
    text: '{"files": {"src/one.ts": {"mutants": [',
    names: "not readable JSON",
  },
  {
    row: "parses, but is not a mutation-report document",
    text: '["a list of something that is not a report"]',
    names: "not a mutation-report document",
  },
  {
    row: "is a document holding no files section",
    text: '{"schemaVersion": "1.0", "thresholds": {"high": 90, "low": 71, "break": 88}}',
    names: "holds no files section",
  },
  { row: "groups files, but holds no scored mutant", text: NOTHING_SCORED, names: "the gate measured nothing" },
];

/** The read of one row: off the tree where the row is an absent report, out of its text otherwise. */
function readOf(row: RefusedRow): MutationReportRead {
  return row.text === null
    ? readMutationReport(GATE, SOUGHT_AT)
    : measurementFromReport(GATE, row.text, SOUGHT_AT);
}

/** The reason one row is refused, failing the test rather than reading a measurement out of it. */
function reasonOf(row: RefusedRow): string {
  const read = readOf(row);
  expect(read.ok, `a report that ${row.row} was read as a measurement`).toBe(false);
  return read.ok ? "" : read.reason;
}

describe("[SCN-RAT-009] readMutationReport — a run that measured nothing is not a run that passed", () => {
  it("is driven by all five rows of the Examples table, each standing differently", () => {
    expect(REFUSED_ROWS).toHaveLength(5);
    expect(new Set(REFUSED_ROWS.map((row) => row.names)).size).toBe(5);
    expect(REFUSED_ROWS.filter((row) => row.text === null)).toHaveLength(1);
  });

  for (const row of REFUSED_ROWS) {
    it(`hands back a refusal as a result when the report ${row.row}, never as an exception`, () => {
      expect(() => readOf(row)).not.toThrow();
    });

    it(`says what is wrong when the report ${row.row}, and names the path it was sought at`, () => {
      const reason = reasonOf(row);

      expect(reason, `the reason does not say "${row.names}"`).toContain(row.names);
      expect(reason, "the reason does not name the path the report was sought at").toContain(
        SOUGHT_AT,
      );
    });

    it(`reds as no measurement rather than as a regression when the report ${row.row}`, () => {
      const verdict = noMeasurement(GATE, reasonOf(row));

      expect(verdict.kind).toBe("no-measurement");
      expect(verdict.ok).toBe(false);
      expect(verdict.message).toContain(GATE);
      expect(verdict.message).toContain(reasonOf(row));
      expect(verdict.message, "the verdict does not say why a run with no score is not a pass")
        .toMatch(/not a run that passed/);
    });
  }

  it("quotes the fault the report itself raised, where there was one to quote", () => {
    for (const row of REFUSED_ROWS) {
      if (row.text === null) continue;
      let raised: string | null = null;
      try {
        JSON.parse(row.text);
      } catch (cause) {
        raised = cause instanceof Error ? cause.message : String(cause);
      }
      if (raised === null) {
        // AND WHERE NOTHING WAS RAISED, NOTHING IS CLAIMED. A reader answering every refusal with
        // the parse sentence still says each row's own words somewhere inside it, so every other
        // assertion here is green against it; this is the half that is not.
        expect(
          reasonOf(row),
          `a report that ${row.row} is refused as unreadable JSON, which it is not`,
        ).not.toContain("not readable JSON");
        continue;
      }
      expect(reasonOf(row), `the reason drops the fault the report raised: ${raised}`).toContain(
        raised,
      );
    }
  });

  it("reconciles a run that really did measure 0 kills to a regression instead", () => {
    const zero = verdictFor(BANKED, { gate: GATE, detected: 0, total: BANKED.total }, BANK_COMMAND);

    expect(zero.kind).toBe("regression");
    expect(zero.ok).toBe(false);
    for (const row of REFUSED_ROWS) {
      expect(
        noMeasurement(GATE, reasonOf(row)).message,
        `a report that ${row.row} reads exactly as a measurement of zero does`,
      ).not.toBe(zero.message);
    }
  });

  it("refuses a path that is there but cannot be read, rather than letting the fault out", () => {
    // A DIRECTORY IS THE UNREADABLE PATH EVERY TREE ALREADY HOLDS, so this needs nothing planted:
    // the path exists, and reading it raises. It is the one route left by which a fault could still
    // reach a caller who was promised a result, and the Rule's first sentence is that none can.
    let read: MutationReportRead;
    try {
      read = readMutationReport(GATE, tmpdir());
    } catch (cause) {
      throw new Error(`the reader threw instead of refusing: ${String(cause)}`);
    }

    expect(read.ok, `${tmpdir()} was read as a measurement`).toBe(false);
    expect(read.ok ? "" : read.reason).toContain(tmpdir());
  });

  it("reads a report holding scored mutants out of the very same text it refuses the rest of", () => {
    const read = measurementFromReport(GATE, WORKED_REPORT, SOUGHT_AT);

    expect(read.ok, "the reader refuses even a report holding scored mutants").toBe(true);
    expect(read.ok ? read.measurement : null).toEqual({ gate: GATE, detected: 10, total: 16 });
  });
});
