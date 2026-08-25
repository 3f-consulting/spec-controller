/**
 * Unit pin for the mutation producer's pure half (@SCN-MUT-007, 3F-2761; @SCN-MUT-008, 3F-2762).
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
 */

import { describe, it, expect } from "vitest";

import {
  parseMeasuredEvidenceObservations,
  type MeasuredEvidenceObservation,
} from "@3f-consulting/spec-controller-core/internal";

import { measurementArtefactWith } from "./measurementArtefact.js";
import { mutantOutcomesIn, mutationScoreIn, mutationScoreOf } from "./mutationScore.js";

/**
 * How many mutants of each outcome the fixture report carries, and the block it also carries.
 *
 * SEVEN AND TWO AGAINST TWO AND ONE IS NINE OVER TWELVE, WHICH IS 75 — and every wrong reading of
 * the same report is a different number: counting every mutant found reads 56.25, the metric's
 * covered-code variant reads 69.23, killed-only reads 58.33, and the thresholds block names 95
 * and 90. A fixture whose wrong answers collided would pass while the producer read the wrong
 * field.
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

/** The score those mutants imply, spelled out rather than re-derived through the code under test. */
const DERIVED_SCORE = 75;

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

/** The score a report is worth, which is the whole of what this producer takes from one. */
function scoreOf(report: unknown): number | null {
  return mutationScoreOf(mutantOutcomesIn(report));
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

describe("[SCN-MUT-007] a mutation run posts a score derived from its mutants", () => {
  it("[SCN-MUT-007] the measurement it posts reads back as one Evidence Observation carrying that score", () => {
    const score = scoreOf(reportOf(OUTCOMES, { high: 95, low: 90 }));

    expect(score).toBe(DERIVED_SCORE);
    // BOTH terms of the address, because neither is one on its own (@SCN-LNT-012): the @SCN says
    // which row the credit posts to, the check tag says which of that row's Evidence Obligations
    // it answers.
    expect(observationsFor(score!)).toEqual([
      {
        qualityCheck: "lint",
        scnId: "SCN-MSD-001",
        checkTag: "mutation",
        measured: DERIVED_SCORE,
      },
    ]);
  });

  it("[SCN-MUT-007] moving the report's own thresholds block moves nothing", () => {
    // THE SAME MUTANTS, A DIFFERENT VERDICT BESIDE THEM. A producer transcribing that block would
    // answer differently here while every assertion about the shape of what it posted still held,
    // which is why the block is moved rather than merely made to disagree once.
    expect(scoreOf(reportOf(OUTCOMES, { high: 95, low: 90 }))).toBe(DERIVED_SCORE);
    expect(scoreOf(reportOf(OUTCOMES, { high: 60, low: 40 }))).toBe(DERIVED_SCORE);
    expect(scoreOf(reportOf(OUTCOMES, {}))).toBe(DERIVED_SCORE);
  });

  it("[SCN-MUT-007] the outcomes the metric holds outside its valid set are outside the score", () => {
    // Errored, failed-to-compile and ignored mutants are false positives to the metric, so piling
    // more of them on may not move a score by so much as a fraction. A denominator that counted
    // them would fall here and nowhere else — and would quietly under-report every real run.
    const heavier = { ...OUTCOMES, RuntimeError: 40, CompileError: 30, Ignored: 20 };
    expect(scoreOf(reportOf(heavier, { high: 95, low: 90 }))).toBe(DERIVED_SCORE);
  });

  it("[SCN-MUT-007] a report whose every mutant is outside the valid set carries no score at all", () => {
    // NOT ZERO. Zero is the score of a suite that detected nothing, and a run with nothing to
    // detect has not earned it — the quotient has no answer, so the pure half says so and what to
    // do about it belongs to the edge that asked.
    const noneValid = { RuntimeError: 1, CompileError: 1, Ignored: 2 };
    expect(scoreOf(reportOf(noneValid, { high: 95, low: 90 }))).toBeNull();
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

describe("[SCN-MUT-008] a mutation run that produced no readable report has no score to post", () => {
  it("[SCN-MUT-008] a report that is absent, empty or unparseable yields no score", () => {
    // ONE ASSERTION OVER ALL THREE, because they are one behaviour met three ways and a producer
    // that answered two of them would be a producer nobody could describe.
    expect(NOTHING_READABLE.map(mutationScoreIn)).toEqual([null, null, null]);
  });

  it("[SCN-MUT-008] and none of them is a zero, which is the score of a suite that detected nothing", () => {
    // THE NEGATIVE IS THE WHOLE SCENARIO. `null` and `0` are both falsy and a caller reading this
    // loosely would post the zero; a score of zero is a claim about the code, and there is no
    // code-shaped fact here at all. NaN is the other reachable wrong answer — `0 / 0 × 100` —
    // which the reader would drop, leaving a defect that looks exactly like a sweep that never ran.
    for (const score of NOTHING_READABLE.map(mutationScoreIn)) {
      expect(typeof score).not.toBe("number");
    }
  });

  it("[SCN-MUT-008] a report it CAN read still scores, so nothing-to-post is not everything-dropped", () => {
    // The control. Without it every assertion above is satisfied by a reader that returns null for
    // everything, which posts nothing on a healthy nightly and reads as a nightly that stopped.
    expect(mutationScoreIn(JSON.stringify(reportOf(OUTCOMES, { high: 95, low: 90 })))).toBe(
      DERIVED_SCORE,
    );
  });
});
