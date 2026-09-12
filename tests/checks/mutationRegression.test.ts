/**
 * Unit arms for the per-mutant comparison — @SCN-MRG-001, a kill the record made that this run
 * does not; @SCN-MRG-002, a kill this run makes that the record did not; @SCN-MRG-003, a mutant
 * this run holds that the record has no entry for at all; and @SCN-MRG-004, the record's own
 * entries this run does not name, which are compared by nothing.
 *
 * WHY THIS TIER, POSITIVELY. The comparison is a pure join between two lists of mutants, so every
 * status the rule turns on can be put in front of it directly and cheaply — including the three
 * (`CompileError`, `RuntimeError`, `Ignored`) that no run of this repository's own suite produces
 * on demand, and which a fixture built out of a real sweep therefore could not reach at all. The
 * `@integration` arm beside it drives the same rule over report documents read off disk, which is
 * the shape the record actually arrives in; neither arm subsumes the other.
 *
 * WHY @SCN-MRG-002 IS THIS TIER AND ONLY THIS TIER. A gain changes nothing a process can watch —
 * no verdict moves, no exit code moves, nothing is written anywhere — so an arm driving it through
 * documents on disk would be an arm watching a clean comparison stay clean, which is the shape a
 * comparator doing nothing at all also produces. The classification is the only observable there
 * is, and it is observable exactly here.
 *
 * WHY @SCN-MRG-003 IS THIS TIER AND ONLY THIS TIER, AND WHAT KEEPS ITS TWO NEGATIVES HONEST. Its
 * whole claim is that a mutant reaches neither side of the verdict, so — like the gain — there is
 * nothing on disk, in an exit code or in a process for a wider arm to watch: the classification is
 * the observable, and it is observable here. The hazard that comes with it is that both assertions
 * are negative, and a comparison returning nothing for everything satisfies both. So the tree it is
 * put in front of carries a lost kill and a gain that must BOTH still be named, and stands each new
 * mutant next to a recorded one sharing its file and its mutator. A comparison gone quiet drops the
 * two controls; a loose file-and-mutator join pairs each new mutant with its neighbour and names
 * the pairing; a "detected now, not detected in the record" reading of a gain names the new kill.
 * Every one of those is a red here rather than an unnoticed empty list.
 *
 * WHY @SCN-MRG-004 IS THIS TIER AND ONLY THIS TIER, AND WHAT MAKES ITS COUNT AN INSTRUMENT. What it
 * asserts is a cardinality — how much of the record the verdict is about — and a cardinality is
 * observable wherever the comparison is, which is here. The hazard is that the two ways of getting
 * it wrong both count nothing as uncompared: a comparison that drops the unmatched entries in
 * silence, and one joining loosely enough to find them all a partner. So the tree below plants each
 * unmatched entry in the file and under the mutator of a mutant this run DOES name — the silent
 * reading then reports one lost kill and the loose one reports four, and the arm asks for the whole
 * lost-kill list rather than for an absence. The count is then read a second time against a run
 * naming every recorded entry, where it must fall to none: a number that cannot move is a number a
 * constant satisfies.
 *
 * @SCN-MRG-005 IS NOT HERE. Its arms read a RECORD rather than compare two lists of mutants, and
 * they live in mutationRegressionRecord.test.ts — which is where `max-lines` put them and where
 * they belong anyway: nothing they assert turns on the comparison at all.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describes carry [SCN-MRG-001],
 * [SCN-MRG-002], [SCN-MRG-003] and [SCN-MRG-004], matching features/mutation-regression.feature
 * and, for the first, the step block in tests/steps/mutationRegression.steps.ts.
 */

import { describe, expect, it } from "vitest";

import {
  comparisonOf,
  describeComparison,
  describeLostKill,
  gains,
  lostKills,
  type LostKill,
  type Mutant,
} from "./mutationRegression.js";

/**
 * The mutant the scenario is about — this repository's own lost kill, by file, line and mutator.
 *
 * Its span and replacement are carried because they are half the identity the two sides are joined
 * on; nothing below asserts them, and the control beside it differs in every one.
 */
const SUBJECT = {
  file: "packages/core/src/domain/evidenceReconciliation.ts",
  mutatorName: "ConditionalExpression",
  replacement: "true",
  startLine: 339,
  startColumn: 11,
  endLine: 339,
  endColumn: 46,
} as const;

/** A second mutant beside it, detected on both sides — the row that must never be named. */
const CONTROL = {
  file: "packages/core/src/domain/ledgerLine.ts",
  mutatorName: "ArithmeticOperator",
  replacement: "-",
  startLine: 88,
  startColumn: 5,
  endLine: 88,
  endColumn: 20,
} as const;

/** One side's view of a mutant: the identity, plus what happened to it on that side. */
function withStatus(identity: Omit<Mutant, "status">, status: string): Mutant {
  return { ...identity, status };
}

/**
 * Every kill a record can hold, against every status that is not one — the Outline's own rows.
 *
 * `NoCoverage` is not a spare case. It is what the measured plant returned: the covering test was
 * removed, so the coverage left with the assertion and the mutant came back never-covered rather
 * than survived.
 */
const ROWS: readonly (readonly [recorded: string, current: string])[] = [
  ["Killed", "Survived"],
  ["Killed", "NoCoverage"],
  ["Killed", "RuntimeError"],
  ["Killed", "CompileError"],
  ["Killed", "Ignored"],
  ["Timeout", "Survived"],
];

describe("[SCN-MRG-001] a mutant the record detected that this run does not is a lost kill, named by its file, its line and its mutator", () => {
  it.each(ROWS)("%s in the record and %s now is a lost kill", (recorded, current) => {
    const lost = lostKills(
      [withStatus(SUBJECT, recorded), withStatus(CONTROL, "Killed")],
      [withStatus(SUBJECT, current), withStatus(CONTROL, "Killed")],
    );

    expect(lost).toHaveLength(1);
    expect(lost[0]).toEqual({
      file: SUBJECT.file,
      line: SUBJECT.startLine,
      mutatorName: SUBJECT.mutatorName,
      recordedStatus: recorded,
      currentStatus: current,
    });
  });

  it.each(ROWS)(
    "names %s-turned-%s by its file, its line, its mutator and both statuses, in one readable sentence",
    (recorded, current) => {
      const found = lostKills([withStatus(SUBJECT, recorded)], [withStatus(SUBJECT, current)]);

      expect(found).toHaveLength(1);
      const sentence = describeLostKill(found[0] as LostKill);

      for (const part of [SUBJECT.file, String(SUBJECT.startLine), SUBJECT.mutatorName, recorded, current]) {
        expect(sentence).toContain(part);
      }
    },
  );

  it("names no mutant this run still detects, so the comparison is not answering lost to everything", () => {
    const bothSides = [withStatus(CONTROL, "Killed"), withStatus(SUBJECT, "Killed")];

    expect(lostKills(bothSides, bothSides)).toEqual([]);
  });
});

describe("[SCN-MRG-002] a mutant the record did not detect that this run kills is a gain, and it passes with nobody asked to bank it", () => {
  /**
   * A third mutant, undetected on BOTH sides and at a different status on each.
   *
   * IT IS THE ROW THAT SEPARATES A GAIN FROM A DIFFERENCE. Two plausible wrong readings of "gain"
   * — every mutant whose status moved, and every mutant the record did not detect — both name this
   * one, and the tree below has no other mutant either of them would name. Without it the arm is
   * green against a comparison that has not understood the word.
   */
  const UNNOTICED = {
    file: "packages/core/src/domain/evidenceObligation.ts",
    mutatorName: "StringLiteral",
    replacement: '""',
    startLine: 142,
    startColumn: 9,
    endLine: 142,
    endColumn: 31,
  } as const;

  /** The recorded sweep: the subject undetected, the control killed, the third undetected too. */
  const RECORDED = [
    withStatus(SUBJECT, "Survived"),
    withStatus(CONTROL, "Killed"),
    withStatus(UNNOTICED, "Survived"),
  ];

  /** This run: the subject now killed, the control killed still, the third undetected as ever. */
  const THIS_RUN = [
    withStatus(SUBJECT, "Killed"),
    withStatus(CONTROL, "Killed"),
    withStatus(UNNOTICED, "NoCoverage"),
  ];

  it("is the one gain this run has made, named by its file, its line, its mutator and both statuses", () => {
    expect(gains(RECORDED, THIS_RUN)).toEqual([
      {
        file: SUBJECT.file,
        line: SUBJECT.startLine,
        mutatorName: SUBJECT.mutatorName,
        recordedStatus: "Survived",
        currentStatus: "Killed",
      },
    ]);
  });

  it("costs this run no kill, so the comparison ends clean and nobody is asked to record anything", () => {
    expect(lostKills(RECORDED, THIS_RUN)).toEqual([]);
  });

  it("reads a mutant the record detected and this run detects still as no gain at all", () => {
    expect(gains(RECORDED, THIS_RUN).map((one) => one.file)).not.toContain(CONTROL.file);
  });

  it("reads a mutant that moved between two statuses the suite noticed nothing by as no gain either", () => {
    expect(gains(RECORDED, THIS_RUN).map((one) => one.file)).not.toContain(UNNOTICED.file);
  });
});

describe("[SCN-MRG-003] a mutant this run holds that the record does not is new code's, and is neither a loss nor a gain", () => {
  /**
   * A kill standing on both sides, unmoved — and the neighbour the new survivor is planted beside.
   *
   * IT IS HERE TO BE MIS-PAIRED. A comparison joining on the file and the mutator alone cannot tell
   * this mutant from the new one below it, because those two fields are all they are compared by
   * and both agree. Paired, a recorded kill against a current survivor is a lost kill — reported at
   * THIS mutant's line, which is a line whose kill never went anywhere.
   */
  const KILL_BESIDE = {
    file: "packages/core/src/domain/evidenceReconciliation.ts",
    mutatorName: "ConditionalExpression",
    replacement: "true",
    startLine: 339,
    startColumn: 11,
    endLine: 339,
    endColumn: 46,
  } as const;

  /** A survivor standing on both sides, unmoved — the neighbour the new kill is planted beside. */
  const SURVIVOR_BESIDE = {
    file: "packages/core/src/domain/ledgerLine.ts",
    mutatorName: "ArithmeticOperator",
    replacement: "-",
    startLine: 88,
    startColumn: 5,
    endLine: 88,
    endColumn: 20,
  } as const;

  /**
   * A real lost kill, on both sides and detected on only one — the first of the two controls.
   *
   * THE NEGATIVES BELOW ARE WHY IT IS HERE. "This mutant is not a lost kill" and "this mutant is not
   * a gain" are both true of a comparison that has stopped returning anything at all, so an arm
   * asserting only those passes a comparator that has gone silent. Asked for the whole list rather
   * than for an absence, the question becomes what would stop being COUNTED — and this row is the
   * count that goes missing.
   */
  const LOST = {
    file: "packages/core/src/domain/qualityCheckReconciliation.ts",
    mutatorName: "BooleanLiteral",
    replacement: "false",
    startLine: 764,
    startColumn: 7,
    endLine: 764,
    endColumn: 22,
  } as const;

  /** A real gain, on both sides and detected on only one — the second control, for `gains`. */
  const GAINED = {
    file: "packages/core/src/domain/evidenceObligation.ts",
    mutatorName: "StringLiteral",
    replacement: '""',
    startLine: 142,
    startColumn: 9,
    endLine: 142,
    endColumn: 31,
  } as const;

  /**
   * New code this run mutated and the record has no entry for, surviving.
   *
   * THE SURVIVING ONE IS THE CASE THE OLD RECORDER REFUSED. A mutant nothing kills, in code nothing
   * covers yet, is what a change adding a line ahead of its test produces — and a comparison reading
   * "undetected now, and not undetected in the record" as a loss names it, at its own line, on
   * nearly every push. It shares its file and its mutator with the recorded kill above and differs
   * in everything else the identity is made of.
   */
  const NEW_SURVIVOR = {
    file: KILL_BESIDE.file,
    mutatorName: KILL_BESIDE.mutatorName,
    replacement: "false",
    startLine: 351,
    startColumn: 11,
    endLine: 351,
    endColumn: 40,
  } as const;

  /**
   * New code this run mutated and the record has no entry for, killed.
   *
   * THE KILLED ONE IS THE OTHER WRONG ANSWER'S FAVOURITE. Read as "detected now, and not detected in
   * the record", a gain is exactly this mutant — and calling it one says the suite improved where in
   * fact it was never asked. It shares its file and its mutator with the recorded survivor above.
   */
  const NEW_KILL = {
    file: SURVIVOR_BESIDE.file,
    mutatorName: SURVIVOR_BESIDE.mutatorName,
    replacement: "+",
    startLine: 95,
    startColumn: 5,
    endLine: 95,
    endColumn: 19,
  } as const;

  /** The recorded sweep: a kill, a survivor, the kill that is about to go, the survivor about to be killed. */
  const RECORDED = [
    withStatus(KILL_BESIDE, "Killed"),
    withStatus(SURVIVOR_BESIDE, "Survived"),
    withStatus(LOST, "Killed"),
    withStatus(GAINED, "Survived"),
  ];

  /**
   * This run: the same four, two of them moved — plus two mutants the record has no entry for.
   *
   * EACH NEW MUTANT FOLLOWS ITS NEIGHBOUR IN THE LIST, and that is not incidental. A loose join
   * builds its lookup from this side, so under a key both members share the later one wins; putting
   * the new mutant second is what makes the mis-pairing the loose join would produce reach the
   * verdict instead of being shadowed by the neighbour it cannot be told apart from.
   */
  const THIS_RUN = [
    withStatus(KILL_BESIDE, "Killed"),
    withStatus(NEW_SURVIVOR, "Survived"),
    withStatus(SURVIVOR_BESIDE, "Survived"),
    withStatus(NEW_KILL, "Killed"),
    withStatus(LOST, "Survived"),
    withStatus(GAINED, "Killed"),
  ];

  it("leaves the one real lost kill as the whole of what this run has lost, so a comparison gone quiet is not mistaken for one that found nothing to say", () => {
    expect(lostKills(RECORDED, THIS_RUN)).toEqual([
      {
        file: LOST.file,
        line: LOST.startLine,
        mutatorName: LOST.mutatorName,
        recordedStatus: "Killed",
        currentStatus: "Survived",
      },
    ]);
  });

  it("leaves the one real gain as the whole of what this run has gained", () => {
    expect(gains(RECORDED, THIS_RUN)).toEqual([
      {
        file: GAINED.file,
        line: GAINED.startLine,
        mutatorName: GAINED.mutatorName,
        recordedStatus: "Survived",
        currentStatus: "Killed",
      },
    ]);
  });

  it("reads the surviving mutant the record has no entry for as no lost kill, because a kill the record never made is a kill this run cannot have lost", () => {
    expect(lostKills(RECORDED, THIS_RUN).map((one) => one.line)).not.toContain(NEW_SURVIVOR.startLine);
  });

  it("reads the killed mutant the record has no entry for as no gain, because a mutant the record was never put to the question about has improved on nothing", () => {
    expect(gains(RECORDED, THIS_RUN).map((one) => one.line)).not.toContain(NEW_KILL.startLine);
  });
});

describe("[SCN-MRG-004] mutants the record holds that this run's report does not name are reported as uncompared, with their number, rather than read as lost kills", () => {
  /** A kill standing on both sides at the same span — compared, and not lost. */
  const STANDING = {
    file: "packages/core/src/domain/evidenceReconciliation.ts",
    mutatorName: "ConditionalExpression",
    replacement: "true",
    startLine: 339,
    startColumn: 11,
    endLine: 339,
    endColumn: 46,
  } as const;

  /**
   * A kill the record made that this run, at the same span, no longer makes — the one real loss.
   *
   * IT IS THE CONTROL THAT MUST SURVIVE EVERY ASSERTION BELOW. "None of the uncompared is a lost
   * kill" is true of a comparison that has stopped returning lost kills at all, so the arm asks for
   * the whole list rather than for an absence, and this row is the entry that goes missing from it.
   */
  const LOST = {
    file: "packages/core/src/domain/ledgerLine.ts",
    mutatorName: "ArithmeticOperator",
    replacement: "-",
    startLine: 88,
    startColumn: 5,
    endLine: 88,
    endColumn: 20,
  } as const;

  /**
   * A recorded kill whose file this run edited, so its mutant moved twelve lines down.
   *
   * THE RECORD STILL HOLDS IT AT THE OLD SPAN and this run names nothing there, so it is compared
   * by nothing. Read as a loss it would red a push that lost no kill; dropped in silence it would
   * shrink the population the verdict is about without saying so.
   */
  const DRIFTED_KILL = {
    file: STANDING.file,
    mutatorName: STANDING.mutatorName,
    replacement: "false",
    startLine: 345,
    startColumn: 11,
    endLine: 345,
    endColumn: 40,
  } as const;

  /** A recorded timeout in the same edited file, likewise left behind at a span nothing names. */
  const DRIFTED_TIMEOUT = {
    file: STANDING.file,
    mutatorName: STANDING.mutatorName,
    replacement: "true",
    startLine: 402,
    startColumn: 7,
    endLine: 402,
    endColumn: 31,
  } as const;

  /** A recorded survivor in a second edited file, at a span this run names nothing at. */
  const DRIFTED_SURVIVOR = {
    file: "packages/core/src/domain/evidenceObligation.ts",
    mutatorName: "StringLiteral",
    replacement: '""',
    startLine: 142,
    startColumn: 9,
    endLine: 142,
    endColumn: 31,
  } as const;

  /**
   * Where the drifted kill's mutant actually is on this run — same file, same mutator, new span.
   *
   * THIS IS WHAT MAKES THE THREE UNCOMPARED ENTRIES WORTH PLANTING RATHER THAN MERELY ABSENT. A
   * comparison joining on the file and the mutator alone cannot tell this mutant from either
   * recorded entry in that file, and its lookup is built from this side, so under that key it is
   * the one they all pair with — and it survived. Both recorded kills there are then reported lost,
   * and so is the kill standing beside them that never moved.
   */
  const MOVED_KILL = {
    file: STANDING.file,
    mutatorName: STANDING.mutatorName,
    replacement: "false",
    startLine: 351,
    startColumn: 11,
    endLine: 351,
    endColumn: 40,
  } as const;

  /** Where the drifted survivor's mutant is on this run — and it is killed there. */
  const MOVED_SURVIVOR = {
    file: DRIFTED_SURVIVOR.file,
    mutatorName: DRIFTED_SURVIVOR.mutatorName,
    replacement: '""',
    startLine: 148,
    startColumn: 9,
    endLine: 148,
    endColumn: 31,
  } as const;

  /** The recorded sweep: five mutants, three of them at spans this run has moved past. */
  const RECORDED = [
    withStatus(STANDING, "Killed"),
    withStatus(LOST, "Killed"),
    withStatus(DRIFTED_KILL, "Killed"),
    withStatus(DRIFTED_TIMEOUT, "Timeout"),
    withStatus(DRIFTED_SURVIVOR, "Survived"),
  ];

  /**
   * This run: two of the record's own five, plus the two mutants the edits moved.
   *
   * EACH MOVED MUTANT FOLLOWS THE ENTRY IT WOULD BE CONFUSED WITH. A loose join builds its lookup
   * from this side, so under a key several mutants share the later one wins — putting the moved
   * mutant second is what carries the mis-pairing through to the verdict instead of letting the
   * neighbour it cannot be told apart from shadow it.
   */
  const THIS_RUN = [
    withStatus(STANDING, "Killed"),
    withStatus(MOVED_KILL, "Survived"),
    withStatus(LOST, "Survived"),
    withStatus(MOVED_SURVIVOR, "Killed"),
  ];

  /** The same record, read against a run that names every entry it holds, at the recorded spans. */
  const NOTHING_DRIFTED = RECORDED.map((mutant) => ({ ...mutant }));

  it("says it compared two of the record's five mutants, and that the other three were compared by nothing", () => {
    const counts = comparisonOf(RECORDED, THIS_RUN);

    expect(counts.compared).toBe(2);
    expect(counts.uncompared).toBe(3);
  });

  it("accounts for every mutant the record held exactly once, as compared or as compared by nothing", () => {
    const counts = comparisonOf(RECORDED, THIS_RUN);

    expect(counts.compared + counts.uncompared).toBe(RECORDED.length);
  });

  it("leaves the one compared kill this run no longer makes as the whole of what this run has lost", () => {
    const counts = comparisonOf(RECORDED, THIS_RUN);

    expect(counts.lost).toBe(1);
    expect(lostKills(RECORDED, THIS_RUN)).toEqual([
      {
        file: LOST.file,
        line: LOST.startLine,
        mutatorName: LOST.mutatorName,
        recordedStatus: "Killed",
        currentStatus: "Survived",
      },
    ]);
  });

  it("names none of the three among this run's lost kills, because a run that never named a mutant has been put to no question about it", () => {
    const lines = lostKills(RECORDED, THIS_RUN).map((one) => one.line);

    for (const drifted of [DRIFTED_KILL, DRIFTED_TIMEOUT, DRIFTED_SURVIVOR]) {
      expect(lines).not.toContain(drifted.startLine);
    }
  });

  it("says all three numbers in one sentence, so an answer about a corner of the record cannot be read as an answer about the whole of it", () => {
    const sentence = describeComparison(comparisonOf(RECORDED, THIS_RUN));

    expect(sentence).toContain("2 of the record's 5 mutants");
    expect(sentence).toContain("1 of them a lost kill");
    expect(sentence).toContain("3 were compared by nothing");
  });

  it("counts five compared and none uncompared when this run names every entry the record holds, so the three is the fixture's and not a constant", () => {
    const counts = comparisonOf(RECORDED, NOTHING_DRIFTED);

    expect(counts.compared).toBe(5);
    expect(counts.uncompared).toBe(0);
  });
});
