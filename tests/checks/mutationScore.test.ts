/**
 * Unit pin for what the mutation producer reads out of a report (@SCN-MUT-007, 3F-2761;
 * @SCN-MUT-008, 3F-2762).
 *
 * Bidirectional evidence (Evidence Manifesto §9): each describe/it string carries the @SCN id
 * matching features/mutation-score.feature, so a grep of either returns both halves of its pair —
 * an arm here and a step block in tests/steps/mutationScoreProducer.steps.ts.
 *
 * ONE ARM PER SCENARIO, AND THAT IS FORCED RATHER THAN CHOSEN (3F-3224). The two rules are one
 * module's and a single arm over one corpus would state them both — but `parse/vitest.ts` reads
 * ONE citation per assertion (`parseScnCitation`, first-bracket-wins, @SCN-LDG-016), so a title
 * naming two codes credits the first and leaves the second reconciling `missing`. Measured, not
 * assumed: the single-arm form redded `balance:self` with SCN-MUT-008 at `U/-`.
 *
 * WHAT THE READING IS, WHICH IS NOT WHAT THIS FILE IS NAMED FOR (3F-3224). `mutationScore.ts`
 * beside it exports a path and nothing else; the reading is `src/mutation-ratchet/report.ts`'s and
 * these arms reach it there, never through a second copy — which is what makes the number the
 * ledger reconciles and the number the ratchet reconciles one number rather than two that agree.
 * Composed here is the one step left outside that reader: which of the two counts
 * `mutationScoreCli.ts` posts. Both go through the REAL reader, never against a literal of this
 * file's own — a row this producer keys one way and `parseMeasuredEvidenceObservations` reads
 * another is not a loud failure: the reader drops it and the obligation reconciles `missing`, so a
 * drifted producer looks exactly like a run that never happened, the one reading this axis exists
 * to keep unreachable. @SCN-CIP-009 takes the same route for the same reason.
 *
 * WHAT THESE ARMS ADD OVER THE @integration ONES, WHICH ARE THIS PAIR'S REAL-RUN HALF. Those run
 * the real producer over a planted tree and so prove the whole seam — the argument parse, the
 * spawn, the report found on disk, the write. These choose the mutants, which is what lets the
 * boundary be pinned at the edges a real run cannot be staged into: a report with no valid mutant
 * at all, and one whose thresholds block moves while its mutants are held still. A producer built
 * as a command line is not a function an arm can call, so "the number is not those mutants read as
 * a percentage" has its teeth over there and is not restated here.
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
} from "../../packages/spec-controller/src/mutation-ratchet/index.js";

import { measurementArtefactWith } from "./measurementArtefact.js";

/**
 * SEVEN AND TWO IS NINE DETECTED, OVER TWELVE VALID — and every wrong reading of the same report
 * is a different number: those nine as a percentage read 75, every mutant found reads 56.25, the
 * covered-code variant 69.23, killed-only 58.33, the population itself 12, and the thresholds
 * block 95 and 90. A fixture whose wrong answers collided would pass while the producer read the
 * wrong field.
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
 * ERRORED, FAILED-TO-COMPILE AND IGNORED ARE OUTSIDE A KILL COUNT TWICE OVER — none is detected
 * and none is in the population — so piling more on may not move the kills by so much as one, and
 * a reader folding them into either term falls on the first of these. The second is the boundary a
 * real run cannot be staged into: a report holding no scored mutant at all.
 */
const PILED_DEEPER = { ...OUTCOMES, RuntimeError: 40, CompileError: 30, Ignored: 20 };
const NONE_VALID = { RuntimeError: 1, CompileError: 1, Ignored: 2 };

/** The block a report carries about itself, which is not where any number below comes from. */
const SAYS_95_AND_90 = { high: 95, low: 90 };

/**
 * A report in the shape `mutation-testing-report-schema@3.7.3` defines, as the TEXT the producer
 * only ever has one in — two of the readings below cannot be expressed as a parsed report at all,
 * absent having no object and unparseable being exactly the text `JSON.parse` refuses.
 *
 * TWO FILES, BECAUSE ONE WOULD NOT SHOW THE WALK. Stryker keys the mutants by the file they were
 * made in, so a reader taking only the first file's list would score a tree by whichever file
 * sorted first — right on this repository's smallest module and wrong on every real run.
 */
function reportText(
  outcomes: Readonly<Record<string, number>>,
  thresholds: Readonly<Record<string, number>>,
): string {
  const mutants = Object.entries(outcomes).flatMap(([status, count]) =>
    Array.from({ length: count }, (_, at) => ({
      id: `${status}-${at}`,
      mutatorName: "ConditionalExpression",
      location: { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } },
      status,
    })),
  );
  const half = Math.ceil(mutants.length / 2);
  return JSON.stringify({
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
  });
}

/**
 * What these arms call the gate, and where they say the report was sought — UNDER NEITHER THIS
 * TREE NOR THE ONE THE TESTS RUN FROM, deliberately: the absent reading below is only absent if
 * nothing could have written there.
 */
const GATE = "domain";
const SOUGHT_AT = join(tmpdir(), "mutation-report-that-was-never-written", "mutation.json");

/** The kills a read is worth, taken exactly as `mutationScoreCli.ts` takes them. */
function killsFrom(read: MutationReportRead): number | null {
  return read.ok ? read.measurement.detected : null;
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

/** One shape a finished sweep leaves the producer, and the name this file knows it by. */
interface Reading {
  readonly reading: string;
  readonly source: string | undefined;
}

/**
 * The four readings that DO carry a number, differing in exactly the fields a wrong reader would
 * take one from. THE FIRST IS ALSO @SCN-MUT-008's CONTROL and is lent to that corpus rather than
 * restated there: without a reading that counts, every refusal over there is satisfied by a reader
 * that refuses everything — which posts nothing on a healthy nightly and reads like one that
 * stopped.
 */
const COUNTED: readonly Reading[] = [
  { reading: "the mutants, beside a thresholds block", source: reportText(OUTCOMES, SAYS_95_AND_90) },
  { reading: "the mutants, thresholds naming others", source: reportText(OUTCOMES, { high: 60, low: 40 }) },
  { reading: "the mutants, no thresholds block", source: reportText(OUTCOMES, {}) },
  { reading: "the mutants, invalid piled deeper", source: reportText(PILED_DEEPER, SAYS_95_AND_90) },
];

/** The four shapes a sweep leaves that carry no number at all, and the control they are read against. */
const UNCOUNTED: readonly Reading[] = [
  { reading: "no valid mutant at all", source: reportText(NONE_VALID, SAYS_95_AND_90) },
  { reading: "no report on the tree", source: undefined },
  { reading: "an empty report", source: "" },
  { reading: "a report cut off mid-list", source: '{"files": {"a.ts": {"mutants": [' },
  COUNTED[0]!,
];

/** Every reading in a corpus, paired with what the producer was left holding by it. */
function killsAcross(corpus: readonly Reading[]): { reading: string; kills: number | null }[] {
  return corpus.map(({ reading, source }) => ({ reading, kills: killsLeftBy(source) }));
}

describe("[SCN-MUT-007] a mutation run posts the kills its mutants imply", () => {
  it("[SCN-MUT-007] reads the same nine kills out of every report carrying those mutants, whatever each says about itself beside them, and posts that count as one Evidence Observation under both terms of its address", () => {
    // ONE ASSERTION OVER THE WHOLE CORPUS, because the count alone is not the claim. WHICH
    // reading yielded which answer is: a producer that took the thresholds block, folded the
    // invalid outcomes into either term, or walked one file's mutants rather than every file's
    // moves a row here while leaving the shape of the verdict — and often its total — intact.
    expect(killsAcross(COUNTED)).toEqual([
      { reading: "the mutants, beside a thresholds block", kills: DETECTED_KILLS },
      { reading: "the mutants, thresholds naming others", kills: DETECTED_KILLS },
      { reading: "the mutants, no thresholds block", kills: DETECTED_KILLS },
      { reading: "the mutants, invalid piled deeper", kills: DETECTED_KILLS },
    ]);

    // BOTH TERMS OF THE ADDRESS, because neither is one on its own (@SCN-LNT-012): the @SCN says
    // which row the credit posts to, the check tag says which of that row's Evidence Obligations
    // it answers. The number goes in as the reader's own, never as a literal of this file's.
    expect(observationsFor(killsLeftBy(COUNTED[0]!.source)!)).toEqual([
      {
        qualityCheck: "lint",
        scnId: "SCN-MSD-001",
        checkTag: "mutation",
        measured: DETECTED_KILLS,
      },
    ]);
  });
});

describe("[SCN-MUT-008] a mutation run that produced no readable report has no kills to post", () => {
  it("[SCN-MUT-008] carries no count at all out of any of the four shapes a sweep leaves it nothing in, and none of those is a zero, while the report it CAN read still counts beside them", () => {
    // NOT ZERO, AND THE EQUALITY IS WHAT KEEPS THAT SAID. Zero is the kill count of a suite that
    // detected nothing, and a run with nothing to detect has not earned it — so the pure half
    // says so and what to do about it belongs to the edge that asked. `null` and `0` are both
    // falsy and a caller reading this loosely would post the zero; only an equality refuses it.
    expect(killsAcross(UNCOUNTED)).toEqual([
      { reading: "no valid mutant at all", kills: null },
      { reading: "no report on the tree", kills: null },
      { reading: "an empty report", kills: null },
      { reading: "a report cut off mid-list", kills: null },
      { reading: "the mutants, beside a thresholds block", kills: DETECTED_KILLS },
    ]);
  });
});
