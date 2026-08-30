/**
 * Unit pin for what the mutation producer reads out of a report (@SCN-MUT-007, 3F-2761;
 * @SCN-MUT-008, 3F-2762).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe/it strings carry the @SCN id
 * matching features/mutation-score.feature, so a grep of either returns both halves of its pair —
 * an arm here and a step block in tests/steps/mutationScoreProducer.steps.ts.
 *
 * THE ASSERTION GOES THROUGH THE REAL READER, never against a literal of this file's own. A row
 * this producer keys one way and `parseMeasuredEvidenceObservations` reads another is not a loud
 * failure: the reader drops it and its Evidence Obligation reconciles `missing`, so a drifted
 * producer looks exactly like a mutation run that never happened — the one reading this axis
 * exists to keep unreachable. @SCN-CIP-009 takes the same route for the same reason.
 *
 * WHAT THIS ARM ADDS OVER THE @integration ONE. That arm runs the real producer over a planted
 * tree and so proves the whole seam — the argument parse, the spawn, the report found on disk,
 * the write. This one chooses the mutants, which is what lets the metric's boundary be pinned at
 * the edges a real run cannot be staged into: a report with no valid mutant at all, and a report
 * whose thresholds block is moved while its mutants are held still. The same division holds for
 * @SCN-MUT-008 — the reading of a report that is not there is pinned here, and what a run with
 * nothing to post then DOES is pinned over a real producer, because it is not a reading at all.
 *
 * THE READING IS THE RATCHET LIBRARY'S (3F-2927). The counting of statuses has one home,
 * `src/mutation-ratchet/report.ts`, and this arm reaches the mutants through it rather than
 * through a second copy — which is what makes the number the ledger reconciles and the number the
 * ratchet reconciles the same number rather than two that agree. What is composed here is the one
 * step left outside that reader: which of the two counts `mutationScoreCli.ts` posts. A producer
 * built as a command line is not a function this arm can call, so that step is spelled here and
 * run for real by the @integration arm — which is therefore where "the number is not those
 * mutants read as a percentage" has its teeth, and why no arm below restates it.
 */

import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, it, expect } from "vitest";

import {
  parseMeasuredEvidenceObservations,
  type MeasuredEvidenceObservation,
} from "@3f-consulting/spec-controller-core/internal";

import {
  measurementFromReport,
  readMutationReport,
  type MutationReportRead,
} from "../src/mutation-ratchet/index.js";

import { measurementArtefactWith } from "./measurementArtefact.js";

/**
 * How many mutants of each outcome the fixture report carries, and the block it also carries.
 *
 * SEVEN AND TWO IS NINE DETECTED, OVER TWELVE VALID — and every wrong reading of the same report
 * is a different number: those nine as a percentage read 75, counting every mutant found reads
 * 56.25, the metric's covered-code variant reads 69.23, killed-only reads 58.33, the population
 * itself is 12, and the thresholds block names 95 and 90. A fixture whose wrong answers collided
 * would pass while the producer read the wrong field.
 */
const OUTCOMES = {
  Killed: 7,
  Timeout: 2,
  Survived: 2,
  NoCoverage: 1,
  RuntimeError: 1,
  CompileError: 1,
  Ignored: 2,
} as const;

/** The kills those mutants imply, spelled out rather than re-derived through the code under test. */
const DETECTED_KILLS = 9;

/**
 * A mutation report in the shape `mutation-testing-report-schema@3.7.3` defines, over two files.
 *
 * TWO FILES, BECAUSE ONE WOULD NOT SHOW THE WALK. Stryker keys the mutants by the file they were
 * made in, so a reader that took only the first file's list would score a tree by whichever file
 * sorted first — right on this repository's smallest module and wrong on every real run.
 */
function reportOf(
  outcomes: Readonly<Record<string, number>>,
  thresholds: Readonly<Record<string, number>>,
): unknown {
  const mutants = Object.entries(outcomes).flatMap(([status, count]) =>
    Array.from({ length: count }, (_, at) => ({
      id: `${status}-${at}`,
      mutatorName: "ConditionalExpression",
      location: { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } },
      status,
    })),
  );
  const half = Math.ceil(mutants.length / 2);
  return {
    schemaVersion: "2",
    thresholds,
    files: {
      "packages/core/src/domain/first.ts": {
        language: "typescript",
        source: "",
        mutants: mutants.slice(0, half),
      },
      "packages/core/src/domain/second.ts": {
        language: "typescript",
        source: "",
        mutants: mutants.slice(half),
      },
    },
  };
}

/**
 * What this arm calls the gate it is reading, and where it says the report was sought.
 *
 * THE PATH IS UNDER NEITHER THIS TREE NOR THE ONE THE TESTS RUN FROM, deliberately: the absent-report
 * row below is only absent if nothing could have written there.
 */
const GATE = "domain";
const SOUGHT_AT = join(tmpdir(), "mutation-report-that-was-never-written", "mutation.json");

/** The kills a read is worth, taken exactly as `mutationScoreCli.ts` takes them. */
function killsFrom(read: MutationReportRead): number | null {
  return read.ok ? read.measurement.detected : null;
}

/** The kills a report is worth, which is the whole of what this producer takes from one. */
function killsOf(report: unknown): number | null {
  return killsFrom(measurementFromReport(GATE, JSON.stringify(report), SOUGHT_AT));
}

/**
 * The kills the producer is left with by a sweep that left this behind — off the tree where there
 * is nothing to read, out of the text otherwise, which is the split `readMutationReport` makes.
 */
function killsLeftBy(source: string | undefined): number | null {
  return killsFrom(
    source === undefined
      ? readMutationReport(GATE, SOUGHT_AT)
      : measurementFromReport(GATE, source, SOUGHT_AT),
  );
}

/** What a measurement is worth to the ledger, read back through the reader `--measurements` uses. */
function observationsFor(measured: number): MeasuredEvidenceObservation[] {
  const artefact = measurementArtefactWith(
    { scnId: "SCN-MSD-001", checkTag: "mutation", measured },
    undefined,
  );
  // Through JSON, because that is the only form the artefact ever reaches the reader in — an
  // in-memory object would pass over a key the serialiser drops.
  return parseMeasuredEvidenceObservations(
    JSON.parse(JSON.stringify(artefact)) as { measurements?: unknown },
  );
}

describe("[SCN-MUT-007] a mutation run posts the kills its mutants imply", () => {
  it("[SCN-MUT-007] the measurement it posts reads back as one Evidence Observation carrying that count", () => {
    const kills = killsOf(reportOf(OUTCOMES, { high: 95, low: 90 }));

    expect(kills).toBe(DETECTED_KILLS);
    // BOTH terms of the address, because neither is one on its own (@SCN-LNT-012): the @SCN says
    // which row the credit posts to, the check tag says which of that row's Evidence Obligations
    // it answers.
    expect(observationsFor(kills!)).toEqual([
      {
        qualityCheck: "lint",
        scnId: "SCN-MSD-001",
        checkTag: "mutation",
        measured: DETECTED_KILLS,
      },
    ]);
  });

  it("[SCN-MUT-007] moving the report's own thresholds block moves nothing", () => {
    // THE SAME MUTANTS, A DIFFERENT VERDICT BESIDE THEM. A producer transcribing that block would
    // answer differently here while every assertion about the shape of what it posted still held,
    // which is why the block is moved rather than merely made to disagree once.
    expect(killsOf(reportOf(OUTCOMES, { high: 95, low: 90 }))).toBe(DETECTED_KILLS);
    expect(killsOf(reportOf(OUTCOMES, { high: 60, low: 40 }))).toBe(DETECTED_KILLS);
    expect(killsOf(reportOf(OUTCOMES, {}))).toBe(DETECTED_KILLS);
  });

  it("[SCN-MUT-007] the outcomes the metric holds outside its valid set are outside the count", () => {
    // Errored, failed-to-compile and ignored mutants are false positives to the metric, so piling
    // more of them on may not move the kills by so much as one. They are outside a kill count
    // twice over — none is detected and none is in the population — so a reader folding them into
    // either term would fall here and nowhere else.
    const heavier = { ...OUTCOMES, RuntimeError: 40, CompileError: 30, Ignored: 20 };
    expect(killsOf(reportOf(heavier, { high: 95, low: 90 }))).toBe(DETECTED_KILLS);
  });

  it("[SCN-MUT-007] a report whose every mutant is outside the valid set carries no count at all", () => {
    // NOT ZERO. Zero is the kill count of a suite that detected nothing, and a run with nothing to
    // detect has not earned it — the report holds no scored mutant, so the pure half says so and
    // what to do about it belongs to the edge that asked.
    const noneValid = { RuntimeError: 1, CompileError: 1, Ignored: 2 };
    expect(killsOf(reportOf(noneValid, { high: 95, low: 90 }))).toBeNull();
  });
});

/**
 * The three shapes a sweep leaves when it produced nothing this can read, as SOURCE rather than
 * as parsed reports.
 *
 * SOURCE, BECAUSE THAT IS THE ONLY FORM THE PRODUCER EVER HAS ONE IN. Two of these three cannot
 * be expressed as a parsed report at all — absent has no object, and unparseable is exactly the
 * text `JSON.parse` refuses — so a fixture built out of objects would be pinning a boundary one
 * step inside the one the producer stands on.
 */
const NOTHING_READABLE: readonly (string | undefined)[] = [
  undefined,
  "",
  '{"files": {"a.ts": {"mutants": [',
];

describe("[SCN-MUT-008] a mutation run that produced no readable report has no kills to post", () => {
  it("[SCN-MUT-008] a report that is absent, empty or unparseable yields no count", () => {
    // ONE ASSERTION OVER ALL THREE, because they are one behaviour met three ways and a producer
    // that answered two of them would be a producer nobody could describe.
    expect(NOTHING_READABLE.map(killsLeftBy)).toEqual([null, null, null]);
  });

  it("[SCN-MUT-008] and none of them is a zero, which is the kill count of a suite that killed nothing", () => {
    // THE NEGATIVE IS THE WHOLE SCENARIO. `null` and `0` are both falsy and a caller reading this
    // loosely would post the zero; a count of zero is the kill count of a suite that killed
    // nothing, a claim about the CODE assembled out of a fault in the harness measuring it, and
    // there is no code-shaped fact here at all.
    for (const kills of NOTHING_READABLE.map(killsLeftBy)) {
      expect(typeof kills).not.toBe("number");
    }
  });

  it("[SCN-MUT-008] a report it CAN read still counts, so nothing-to-post is not everything-dropped", () => {
    // The control. Without it every assertion above is satisfied by a reader that returns null for
    // everything, which posts nothing on a healthy nightly and reads as a nightly that stopped.
    expect(killsLeftBy(JSON.stringify(reportOf(OUTCOMES, { high: 95, low: 90 })))).toBe(
      DETECTED_KILLS,
    );
  });
});
