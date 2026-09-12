/**
 * Unit arms for reading a recorded sweep — @SCN-MRG-005, a record that is not there, is not
 * readable, is not a mutation record, or is one holding no mutant at all;
 * features/mutation-regression.feature.
 *
 * IT IS ITS OWN FILE BECAUSE IT IS ITS OWN QUESTION. The arms beside it in
 * mutationRegression.test.ts all put two lists of mutants in front of a comparison; these put a
 * piece of text in front of a reader and ask what it made of it. Nothing here reaches the verdict
 * except the control at the end, which is the point of the whole scenario: the refusal has to
 * happen before a verdict exists, because a verdict cannot tell an absent record from a record
 * with nothing lost.
 *
 * WHY THIS TIER. The four readings are four pieces of text, so they can be handed to the reader
 * directly — including the absent one, which is the absence of any text at all and which nothing
 * on disk can carry more directly than that. The `@integration` arm beside it plants three of the
 * four as real bytes and leaves the fourth deliberately unwritten, which is the one thing this
 * tier cannot reach: a name a run is actually pointed at with nothing there.
 *
 * AND WHAT KEEPS IT FROM BEING VACUOUS. Every assertion but the last says that a refusal happened,
 * and a reader that refuses everything it is ever handed satisfies all of them while being no more
 * use than one that refuses nothing. So the last arm puts a record in good order in front of the
 * same reader, where it must settle and compare — and the four readings are additionally checked
 * against each other, because four refusals saying one word would not tell anybody which of the
 * four repairs to make.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries [SCN-MRG-005], matching
 * features/mutation-regression.feature and the step block in tests/steps/mutationRegression.steps.ts.
 */

import { describe, expect, it } from "vitest";

import {
  comparisonOf,
  describeUnsettled,
  recordIn,
  type Mutant,
  type UnsettledRecord,
} from "./mutationRegression.js";

/** A mutant a record in good order holds — the identity, without the outcome. */
const SUBJECT = {
  file: "packages/core/src/domain/evidenceReconciliation.ts",
  mutatorName: "ConditionalExpression",
  replacement: "true",
  startLine: 339,
  startColumn: 11,
  endLine: 339,
  endColumn: 46,
} as const;

/** A second one beside it, so the record in good order holds more than a single file. */
const CONTROL = {
  file: "packages/core/src/domain/ledgerLine.ts",
  mutatorName: "ArithmeticOperator",
  replacement: "-",
  startLine: 88,
  startColumn: 5,
  endLine: 88,
  endColumn: 20,
} as const;

describe("[SCN-MRG-005] a record that is absent, unreadable, shapeless or holding no mutant settles nothing and says what it looked for — never a clean comparison", () => {
  /** The name the reader is pointed at, and the one every refusal below has to say back. */
  const LOOKED_FOR = "the-scheduled-sweeps-report.json";

  /** One mutant as a report files it — the whole entry, not only the fields the join reads. */
  function entryFor(identity: Omit<Mutant, "status">, status: string) {
    return {
      id: `${identity.file}:${identity.startLine}:${identity.mutatorName}`,
      mutatorName: identity.mutatorName,
      replacement: identity.replacement,
      status,
      location: {
        start: { line: identity.startLine, column: identity.startColumn },
        end: { line: identity.endLine, column: identity.endColumn },
      },
    };
  }

  /** A record in good order — two files, two mutants, both killed. */
  const IN_GOOD_ORDER = JSON.stringify({
    schemaVersion: "2",
    projectRoot: "/somebody/elses/tree",
    files: {
      [SUBJECT.file]: {
        language: "typescript",
        source: "// the source a report carries\n",
        mutants: [entryFor(SUBJECT, "Killed")],
      },
      [CONTROL.file]: {
        language: "typescript",
        source: "// likewise\n",
        mutants: [entryFor(CONTROL, "Killed")],
      },
    },
  });

  /**
   * The four ways a record fails to be one, each with the reading it must come back with.
   *
   * THE LAST IS THE ONE A DAMAGE CHECK LETS THROUGH. It parses, it carries a schema version, it is
   * grouped by file the way a report is, and it is a perfectly clean comparison against every run
   * there is — because a population of nothing loses nothing. Nothing about it is broken; it is
   * simply not an answer.
   */
  const SETTLING_NOTHING: readonly (readonly [
    words: string,
    text: string | undefined,
    reading: string,
  ])[] = [
    ["is not there at all", undefined, "there is nothing there to read"],
    [
      "is there and cannot be read",
      "{ whatever this is, a mutation run did not write it",
      "what is there is not readable",
    ],
    [
      "is readable and is not a record of a mutation run",
      JSON.stringify({ schemaVersion: "2", projectRoot: "/somebody/elses/tree", testFiles: {} }),
      "what is there is not a mutation record",
    ],
    [
      "is a record of a mutation run holding no mutant",
      JSON.stringify({
        schemaVersion: "2",
        projectRoot: "/somebody/elses/tree",
        files: { [SUBJECT.file]: { language: "typescript", source: "//\n", mutants: [] } },
      }),
      "it is a mutation record holding no mutant",
    ],
  ];

  /** The reading this text got, or a failure saying it settled when this shape settles nothing. */
  function unsettledFrom(text: string | undefined): UnsettledRecord {
    const reading = recordIn(LOOKED_FOR, text);
    if (reading.settled) {
      throw new Error(
        `${LOOKED_FOR} settled over ${reading.mutants.length} mutant(s), and this shape settles nothing.`,
      );
    }
    return reading;
  }

  it.each(SETTLING_NOTHING)(
    "a recorded sweep that %s settles nothing, and carries no mutants for a comparison to read as a clean one",
    (_words, text) => {
      const reading = recordIn(LOOKED_FOR, text);

      expect(reading.settled).toBe(false);
      expect(reading).not.toHaveProperty("mutants");
    },
  );

  it.each(SETTLING_NOTHING)(
    "a recorded sweep that %s says back the name it was looked for under",
    (_words, text) => {
      expect(describeUnsettled(unsettledFrom(text))).toContain(LOOKED_FOR);
    },
  );

  it.each(SETTLING_NOTHING)(
    "a recorded sweep that %s says which of the four readings it got",
    (_words, text, reading) => {
      expect(describeUnsettled(unsettledFrom(text))).toContain(reading);
    },
  );

  it.each(SETTLING_NOTHING)(
    "a recorded sweep that %s says that nothing was compared, so a run that found no record is never read as a run that lost no kill",
    (_words, text) => {
      expect(describeUnsettled(unsettledFrom(text))).toContain(
        "has not observed that no kill was lost",
      );
    },
  );

  it("says a different thing of each of the four, so no two ways of failing to be a record wear one word", () => {
    const said = SETTLING_NOTHING.map(([, text]) => describeUnsettled(unsettledFrom(text)));

    expect(new Set(said).size).toBe(SETTLING_NOTHING.length);
  });

  it("settles a record that is there, readable, a mutation record and holding mutants — which is what stops every assertion above being satisfied by a reader that refuses everything", () => {
    const reading = recordIn(LOOKED_FOR, IN_GOOD_ORDER);

    expect(reading.settled).toBe(true);
    expect(reading.settled ? comparisonOf(reading.mutants, reading.mutants) : undefined).toEqual({
      compared: 2,
      lost: 0,
      uncompared: 0,
    });
  });
});
