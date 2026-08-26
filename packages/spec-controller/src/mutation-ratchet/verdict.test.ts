/**
 * Unit pin for the regression verdict — fewer kills than the record less its allowance, whether or
 * not the population also grew (@SCN-RAT-004, 3F-2794).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe/it strings carry the @SCN id matching
 * features/mutation-ratchet.feature, so a grep of either returns both halves of its pair — this arm
 * and the step block in tests/steps/mutationRatchet.steps.ts.
 *
 * THREE RUNS, THREE DIFFERENT WAYS OF LOSING KILLS, and the middle one is the reason the other two
 * are not enough. A run that loses kills with its population unmoved is the plain case; a run that
 * loses them WHILE the population grows is the case a reconciler answers wrongly if it looks at the
 * growth first, because the growth is true and innocent on its own and explains the fallen score
 * without anyone having to look further. The third is the boundary the operator mandated: exactly
 * one kill past what the allowance covers.
 *
 * WHAT THIS ARM CANNOT PIN ON ITS OWN, SAID PLAINLY. Every run below is a regression under `<` and
 * under `<=` alike, so nothing here separates the two comparisons. Its green twin — the measurement
 * the allowance exactly covers, one mutant away — is @SCN-RAT-005's, and the pair is what makes the
 * off-by-one impossible to hide in either direction. Asserting that side here would be folding a
 * second scenario's behaviour into this one's evidence.
 *
 * THE FLOOR IS ASSERTED AS A FIGURE THE MESSAGE CARRIES, NOT AS THE BAR IT WAS JUDGED ON. The record
 * banked 96.9683% and its floor sits at 96.8346%; the two are far enough apart that a verdict
 * printing the banked score where the floor belongs reds here.
 */

import { describe, it, expect } from "vitest";

import { parseGateRecords, floorOf, recordedScoreOf, scoreOf, type GateRecord } from "./record.js";
import { verdictFor } from "./verdict.js";

/** The name the fixture record is filed under — this file's own, never a name the module knows. */
const RECORD_FILE = "quality-thresholds.yml";

/** The gate the fixture records, named as a project would name it rather than as this module does. */
const GATE = "domain";

/**
 * The bank-it instruction, as one caller words it — never a name this module could have invented.
 *
 * A FIXTURE OF THE FILE RATHER THAN OF ONE ARM, because `verdictFor` takes it on every call: the
 * text a verdict may need to hand its reader is an input to the reconciler, not a fact about any
 * one run. Only the arms that ask for the record to be banked print it (@SCN-RAT-006).
 */
const BANK_COMMAND = "bank-the-record domain --and-say-why";

/**
 * A record banking 2175 kills of 2243 mutants, allowing three of them.
 *
 * THE ALLOWANCE IS THREE RATHER THAN ONE ON PURPOSE. It has to be wide enough that the boundary run
 * below — one kill past what it covers — is a different measurement from the plain case, or the two
 * rows collapse into one and the table asserts the boundary twice while claiming to assert both.
 */
const RECORD_TEXT = `
mutation-gates:
  domain:
    detected: 2175
    total: 2243
    slack-mutants: 3
    slack-reason: "three mutants here are detected by timeout, and a timeout can flip to Survived on a slower runner with no change to the suite"
`;

function recordOfFixture(): GateRecord {
  const record = parseGateRecords(RECORD_TEXT, RECORD_FILE).get(GATE);
  if (record === undefined) throw new Error(`the fixture record states no gate "${GATE}".`);
  return record;
}

/**
 * The exact figure as the message states it — not a longer number, and not a negated one.
 *
 * A PLAIN SUBSTRING CHECK IS SATISFIED BY THE WRONG ANSWER HERE, which is measured rather than
 * feared: reversing the subtraction that counts the lost kills makes the message say "-15", and
 * `toContain("15 kill(s) lost")` passes on it. The lookbehind is what closes that.
 */
function figure(value: number): string {
  return `(?<![\\d.-])${value}(?!\\d)`;
}

/** The figure, in the phrase that names what it is. */
function figureNamed(value: number, phrase: string): RegExp {
  return new RegExp(`${figure(value)} ${phrase}`);
}

/** A count pair, both halves whole. */
function countPair(detected: number, total: number): RegExp {
  return new RegExp(`${figure(detected)}/${figure(total)}`);
}

/** The three runs of the scenario's Examples table, each losing its kills a different way. */
const RUNS = [
  { separates: "the population unmoved", detected: 2160, total: 2243, lost: 15 },
  { separates: "the population grown", detected: 2160, total: 2400, lost: 15 },
  { separates: "one kill past the allowance", detected: 2171, total: 2243, lost: 4 },
] as const;

describe("[SCN-RAT-004] verdictFor — fewer kills than the record less its allowance", () => {
  for (const run of RUNS) {
    describe(`a run of ${run.detected}/${run.total} — ${run.separates}`, () => {
      const verdict = () => verdictFor(recordOfFixture(), { gate: GATE, ...run }, BANK_COMMAND);

      it("is a regression, and the gate does not stand", () => {
        expect(verdict()).toMatchObject({ kind: "regression", ok: false });
      });

      it("names the kills lost and the allowance they were measured against", () => {
        // The figure whole, and its own sign: `toContain("15 kill(s) lost")` is satisfied by a
        // verdict that subtracted the wrong way round and said "-15", which is a measured hole
        // rather than a hypothetical one — the plant that reversed the subtraction passed it.
        expect(verdict().message).toMatch(figureNamed(run.lost, "kill\\(s\\) lost"));
        expect(verdict().message).toMatch(new RegExp(`allowance of ${figure(3)}`));
      });

      it("names both count pairs, the recorded one and the measured one", () => {
        expect(verdict().message).toMatch(countPair(2175, 2243));
        expect(verdict().message).toMatch(countPair(run.detected, run.total));
      });

      it("states the floor the record implies, rather than the score the record banked", () => {
        const record = recordOfFixture();

        // 96.8346 against a banked 96.9683 — a verdict reaching for the banked score reds here.
        expect(floorOf(record).toFixed(4)).not.toEqual(recordedScoreOf(record).toFixed(4));
        expect(verdict().message).toContain(`${floorOf(record).toFixed(4)}%`);
      });

      it("says a mutant that used to die now survives, and where to go and find it", () => {
        expect(verdict().message).toContain("used to kill now survives");
        expect(verdict().message).toContain("report");
      });

      it("names the gate, so a verdict read beside its siblings says which one it is", () => {
        expect(verdict().message).toContain(GATE);
      });
    });
  }
});

/**
 * Unit pin for the within-slack verdict — a kill lost, but not past the record less the allowance
 * it states (@SCN-RAT-005, 3F-2795).
 *
 * THIS ARM IS THE GREEN HALF OF THE BOUNDARY, AND IT IS WHY THE RED HALF ABOVE COULD NOT PIN IT
 * ALONE. @SCN-RAT-004 reported, honestly, that every one of its runs is a regression whether the
 * kill comparison stops one mutant early or not, and whether the allowance is consulted at all or
 * quietly dropped. The second run below — the allowance spent EXACTLY — is the one measurement that
 * separates all three readings: a comparison widened by one calls it a regression, a comparison that
 * forgot the allowance calls it a regression, and only the one that is right calls it a pass.
 *
 * AND THE PASS IS ASSERTED AS A LOUD ONE, WHICH IS THE OTHER HALF OF THE SCENARIO. An allowance that
 * spends without saying so has moved the bar invisibly, so the message is held to naming the kills
 * lost, the allowance they were spent from, both count pairs, and the reason the record itself gives
 * for the allowance existing. The last of those is asserted against the fixture's own reason text
 * rather than a phrase typed twice, so a verdict that prints a reason it invented reds here.
 */

/** The two runs of this scenario's Examples table — one well inside the allowance, one exactly on it. */
const SLACK_RUNS = [
  { separates: "a kill lost well inside the allowance", detected: 2174, total: 2243, lost: 1 },
  { separates: "the allowance spent exactly", detected: 2172, total: 2243, lost: 3 },
] as const;

describe("[SCN-RAT-005] verdictFor — a kill lost inside the allowance the record states", () => {
  for (const run of SLACK_RUNS) {
    describe(`a run of ${run.detected}/${run.total} — ${run.separates}`, () => {
      const verdict = () => verdictFor(recordOfFixture(), { gate: GATE, ...run }, BANK_COMMAND);

      it("passes as a run inside the allowance, and the gate stands", () => {
        expect(verdict()).toMatchObject({ kind: "within-slack", ok: true });
      });

      it("names the kills lost and the allowance they were spent from", () => {
        // Guarded the same way @SCN-RAT-004's is: a plain substring is satisfied by a verdict that
        // subtracted the wrong way round and printed "-1", and by a longer number that happens to
        // end in the right digits.
        expect(verdict().message).toMatch(figureNamed(run.lost, "kill\\(s\\) lost"));
        expect(verdict().message).toMatch(new RegExp(`allowance of ${figure(3)}`));
      });

      it("names both count pairs, the recorded one and the measured one", () => {
        expect(verdict().message).toMatch(countPair(2175, 2243));
        expect(verdict().message).toMatch(countPair(run.detected, run.total));
      });

      it("states the reason the record itself gives for the allowance existing", () => {
        // Against the record's own text, never a phrase typed twice — a verdict printing a reason
        // of its own invention, or the empty string a reason-less record would carry, reds here.
        const reason = recordOfFixture().allowance.reason;
        expect(reason).not.toEqual("");
        expect(verdict().message).toContain(reason);
      });

      it("names the gate, so a verdict read beside its siblings says which one it is", () => {
        expect(verdict().message).toContain(GATE);
      });
    });
  }
});

/**
 * Unit pin for the population-grew verdict — a score that fell with no kill lost (@SCN-RAT-006,
 * 3F-2796).
 *
 * THE RUN IS BUILT SO A SCORE-SHAPED BAR WOULD RED ON IT, WHICH IS THE WHOLE POINT OF THE ROW. The
 * record banks 96.9683% and implies a floor of 96.8346%; the run below measures 90.6250%. A row that
 * also greened a naive score comparison would prove nothing at all about the counts model, so the
 * first assertion here is against the fixture itself — the two bars a lenient reconciler might reach
 * for are both far above what this run scored, and both are asserted to be.
 *
 * THE KILLS HELD EXACTLY, WHICH IS WHAT LICENSES THE VERDICT'S LOAD-BEARING SENTENCE. 2175 recorded,
 * 2175 measured, and 157 mutants in the run that the record never held. Nothing that used to die is
 * surviving; the score fell because the denominator moved.
 *
 * THE BANK-IT TEXT IS ASSERTED TWICE, UNDER TWO DIFFERENT CALLERS' WORDS. A verdict that invented a
 * command of its own — a script name this module has no business knowing — passes a single-caller
 * assertion the moment the fixture happens to look like the invention. Two unrelated texts, each
 * carried through verbatim, is what makes "the caller's own words" a property rather than a hope.
 *
 * AND THE EDGE OF THE CLAIM IS PINNED AS A NEGATIVE. A run that lost a kill the allowance covers
 * WHILE its population grew scores below the floor just as this one does, so the temptation to
 * answer it with the growth is real; @SCN-RAT-005 surfaced the shape and asserted neither way. It is
 * ruled here: this verdict says no mutant which used to die now survives, and of that run the
 * sentence is false, so this arm must not claim it. Asserted as "not this verdict" rather than as
 * "that verdict", because which verdict it IS belongs to @SCN-RAT-005's evidence, not this one's.
 */

/** A second caller's words for the same ask, deliberately sharing no token with the first. */
const OTHER_BANK_COMMAND = "please write 2175/2400 into the file yourself";

/** The run: every kill the record banked, over a population 157 mutants larger. */
const GROWN_RUN = { gate: GATE, detected: 2175, total: 2400 } as const;

/** The mutants the run measured that the record never held. */
const NEW_MUTANTS = 157;

/** A count pair AND the score it implies, so a score copied from the other pair reds. */
function countPairScored(detected: number, total: number): RegExp {
  const score = scoreOf(detected, total).toFixed(4).replace(".", "\\.");
  return new RegExp(`${figure(detected)}/${figure(total)} \\(${score}%\\)`);
}

describe("[SCN-RAT-006] verdictFor — a score that fell with no kill lost", () => {
  const verdict = (bankCommand: string = BANK_COMMAND) =>
    verdictFor(recordOfFixture(), GROWN_RUN, bankCommand);

  it("measures below both bars a score-shaped reconciler would reach for", () => {
    // The row's teeth: 90.6250% against a floor of 96.8346% and a banked 96.9683%. A run that
    // also cleared a naive score comparison would green under the model this one exists to reject.
    const record = recordOfFixture();
    const measured = scoreOf(GROWN_RUN.detected, GROWN_RUN.total);
    expect(measured).toBeLessThan(floorOf(record));
    expect(measured).toBeLessThan(recordedScoreOf(record));
    expect(GROWN_RUN.detected).toEqual(record.detected);
    expect(GROWN_RUN.total - record.total).toEqual(NEW_MUTANTS);
  });

  it("passes as a run whose population grew, and the gate stands", () => {
    expect(verdict()).toMatchObject({ kind: "population-grew", ok: true });
  });

  it("names the mutants the run measured that the record never held", () => {
    expect(verdict().message).toMatch(
      figureNamed(NEW_MUTANTS, "mutant\\(s\\) measured that the record never held"),
    );
  });

  it("says no kill went missing, and names neither a loss nor a count it did not measure", () => {
    // The negative is asserted as well as the positive: a verdict that reached the lost-kill
    // phrasing here would be stating the one thing this arm exists to rule out.
    expect(verdict().message).toContain("no kill went missing");
    expect(verdict().message).not.toMatch(/kill\(s\) lost/);
  });

  it("names both count pairs, each carrying the score its own counts imply", () => {
    // Scored pairs rather than bare ones: a verdict printing the recorded score beside the
    // measured counts — the copy a reader would never notice — reds here.
    expect(verdict().message).toMatch(countPairScored(2175, 2243));
    expect(verdict().message).toMatch(countPairScored(GROWN_RUN.detected, GROWN_RUN.total));
  });

  it("asks for the record to be banked, in whichever words the caller gives for it", () => {
    for (const command of [BANK_COMMAND, OTHER_BANK_COMMAND]) {
      expect(verdict(command).message).toMatch(/bank/i);
      expect(verdict(command).message).toContain(command);
    }
  });

  it("names the gate, so a verdict read beside its siblings says which one it is", () => {
    expect(verdict().message).toContain(GATE);
  });

  it("does not claim a run that lost a kill the allowance covers, however far its score fell", () => {
    // The shape @SCN-RAT-005 surfaced without ruling on: a kill lost INSIDE the allowance while
    // the population grew. Its score is below the floor exactly as this scenario's run is, so the
    // growth is there to be reached for — and reaching for it would print "no kill went missing"
    // over a run that lost one. Which verdict it IS belongs to @SCN-RAT-005; that it is not this
    // one belongs here.
    const record = recordOfFixture();
    const lostInsideAllowanceAndGrown = { gate: GATE, detected: 2172, total: 2400 };
    expect(scoreOf(2172, 2400)).toBeLessThan(floorOf(record));
    expect(verdictFor(record, lostInsideAllowanceAndGrown, BANK_COMMAND).kind).not.toEqual(
      "population-grew",
    );
  });
});

/**
 * Unit pin for the unrecorded-improvement verdict — a tree measuring better than its record
 * (@SCN-RAT-007, 3F-2797).
 *
 * THE ONE ARM WHOSE RED A READER'S INSTINCT FIGHTS, so the row is built to make the argument
 * unavoidable rather than to be believed. The run below is BETTER than the record on every reading
 * a lenient reconciler could take — above the floor, above the banked score, the same population,
 * twenty-five kills that were not there before — and it reds. The first assertion here is that
 * claim about the fixture itself: a bar shaped like a ceiling greens this run, which is precisely
 * why a ceiling is not a ratchet.
 *
 * WHAT THE GAP ACTUALLY IS, AND WHY IT CANNOT BE LEFT. 1.1146 points sit between the record and the
 * tree. That is not slack anybody stated and it is not tolerance — it is head-room, and a survivor
 * arriving inside it costs nothing and reds nothing, so the gate goes quiet exactly where it was
 * meant to be watching and stays quiet until the whole gain has been given back. The same ruling
 * is already made one level up by `complexity-exceptions` (@SCN-CPX-003): a recorded figure that
 * has stopped describing the tree has stopped being a bar, whichever side of it the tree moved to.
 *
 * THE POINTS-BETTER FIGURE IS ASSERTED WITH ITS OWN SIGN, WHICH IS A MEASURED HOLE RATHER THAN A
 * FEARED ONE. This subtraction runs the opposite way round to every other one in the file — the
 * MEASUREMENT less the RECORD — so the reversal that @SCN-RAT-004 caught printing "-15" is exactly
 * the reversal available here, and `pointsFigure` is what closes it.
 *
 * AND THE TWO FIGURES THE ASK CARRIES ARE THE MEASURED ONES, ASSERTED BOTH WAYS. "Bank the record"
 * is the sentence, so writing the RECORD's own counts into it is the natural slip, and it is a slip
 * a message that already prints both pairs elsewhere hides completely: every figure a reader is
 * looking for is somewhere on the line. So the ask is pinned positively on the measured pair and
 * negatively on the recorded one.
 */

/** A four-decimal figure, whole and carrying its own sign — the dot escaped, so it matches a dot. */
function pointsFigure(value: number): string {
  return `(?<![\\d.-])${value.toFixed(4).replace(".", "\\.")}(?!\\d)`;
}

/** The run: every kill the record banked and twenty-five more, over the very same population. */
const IMPROVED_RUN = { gate: GATE, detected: 2200, total: 2243 } as const;

/** The kills the run made that the record never banked. */
const UNRECORDED_KILLS = 25;

describe("[SCN-RAT-007] verdictFor — a tree measuring better than the record it last banked", () => {
  const record = () => recordOfFixture();
  const verdict = (bankCommand: string = BANK_COMMAND) =>
    verdictFor(record(), IMPROVED_RUN, bankCommand);

  /** How far above the record the run measured, in points — the figure the verdict owes its reader. */
  const pointsBetter = () =>
    scoreOf(IMPROVED_RUN.detected, IMPROVED_RUN.total) - recordedScoreOf(record());

  it("measures above every bar a ceiling-shaped reconciler holds, which is why a ceiling greens it", () => {
    // The row's teeth. 98.0829% against a floor of 96.8346% and a banked 96.9683%, on an unmoved
    // population — a run a bar that only asks "did the score fall" waves straight through.
    const measured = scoreOf(IMPROVED_RUN.detected, IMPROVED_RUN.total);
    expect(measured).toBeGreaterThan(floorOf(record()));
    expect(measured).toBeGreaterThan(recordedScoreOf(record()));
    expect(IMPROVED_RUN.total).toEqual(record().total);
    expect(IMPROVED_RUN.detected - record().detected).toEqual(UNRECORDED_KILLS);
    expect(pointsBetter().toFixed(4)).toEqual("1.1146");
  });

  it("reds as ratchet debt, and the gate does not stand", () => {
    expect(verdict()).toMatchObject({ kind: "unrecorded-improvement", ok: false });
  });

  it("states how many points better the tree measured than the record holds", () => {
    // Sign-guarded: the subtraction here runs measurement-less-record, the opposite way round to
    // every other one in this module, so a verdict that reversed it would print "-1.1146" and a
    // plain substring check would pass on it.
    expect(verdict().message).toMatch(new RegExp(pointsFigure(pointsBetter())));
    expect(verdict().message).not.toMatch(/-1\.1146/);
  });

  it("names both count pairs, each carrying the score its own counts imply", () => {
    expect(verdict().message).toMatch(countPairScored(2175, 2243));
    expect(verdict().message).toMatch(
      countPairScored(IMPROVED_RUN.detected, IMPROVED_RUN.total),
    );
  });

  it("says the gap is head-room a later survivor would arrive inside unnoticed", () => {
    // The argument itself, not a synonym for it: without the head-room sentence the red reads as a
    // gate punishing an improvement, which is the reading that gets this clause deleted.
    expect(verdict().message).toContain("head-room");
    expect(verdict().message).toMatch(/survivor/);
  });

  it("asks for the MEASURED figures to be banked, never the ones the record already holds", () => {
    // "Bank the record" is the sentence, so banking the record's own counts is the natural slip —
    // and one nothing else on the line would expose, because both pairs are printed anyway.
    for (const command of [BANK_COMMAND, OTHER_BANK_COMMAND]) {
      const message = verdict(command).message;
      expect(message).toMatch(
        new RegExp(`[Bb]ank ${figure(IMPROVED_RUN.detected)}/${figure(IMPROVED_RUN.total)}`),
      );
      expect(message).not.toMatch(new RegExp(`[Bb]ank ${figure(2175)}/${figure(2243)}`));
      expect(message).toContain(command);
    }
  });

  it("does not reach for the phrasing of a run that lost something", () => {
    // Nothing went missing here, so the two sentences that say something did must not appear —
    // a verdict reusing the regression's line would send its reader hunting for a survivor that
    // this run does not have.
    expect(verdict().message).not.toMatch(/kill\(s\) lost/);
    expect(verdict().message).not.toContain("used to kill now survives");
  });

  it("names the gate, so a verdict read beside its siblings says which one it is", () => {
    expect(verdict().message).toContain(GATE);
  });
});

/**
 * Unit pin for the at-baseline verdict — a run sitting exactly on the record it is judged against,
 * and the closure of the verdict set around it (@SCN-RAT-008, 3F-2798).
 *
 * THE BORING ARM, AND THE ONE WHOSE FAILURE MODE IS INVISIBLE. Every arm above claims its runs on a
 * condition it states out loud; this one claims what is left, by falling through all four. A
 * fall-through has no condition of its own to get wrong — which is its whole virtue, and also the
 * only way it can lie. A run one of the arms above SHOULD have claimed and did not lands here and
 * is greened, and on the way out it looks exactly like a run that genuinely held its ground. So the
 * assertions below are in two halves: what the quiet verdict says, and what the reconciler as a
 * whole does with every run that is not this one.
 *
 * THE SECOND ROW IS WHERE THE READING IS PINNED, AND IT IS NOT A FLOAT PROBE. `scoreFellFrom` and
 * `scoreRoseFrom` are `<` and `>` of the same two cross-multiplied products, so EQUAL is the one
 * answer neither can give — and equal is a fact about the RATIO, not about the pair. A run of
 * 4350/4486 against a record of 2175/2243 is score-equal with both of its counts moved, so it
 * separates a fall-through that is genuinely unconditional from one written as "the very same two
 * counts" with the refusal left standing behind it; the two agree on every other row here.
 * @SCN-RAT-007 measured that this tree's division is correctly rounded — `d/t` and `(dk)/(tk)` are
 * the same double for every `k` to 100,000 against this fixture — so the row is a genuine equality
 * rather than a probe of the arithmetic, and it is not sold as one.
 *
 * AND THE SWEEP IS THE HALF THE WORKED ROWS CANNOT COVER. Two green examples cannot show that
 * nothing ELSE reaches this arm, nor that no run falls out of the reconciler with no verdict at
 * all. The sweep asserts both, over a population built to contain every reading: `at-baseline`
 * exactly on the record's ratio and nowhere else, and a verdict — never a refusal — for every pair
 * in it.
 */

/** Both runs of the scenario's Examples table: score-equal, one with its counts moved and one not. */
const BASELINE_RUNS = [
  { separates: "both counts unmoved", detected: 2175, total: 2243 },
  { separates: "the ratio held while both counts doubled", detected: 4350, total: 4486 },
] as const;

describe("[SCN-RAT-008] verdictFor — a run sitting exactly on the record it last banked", () => {
  for (const run of BASELINE_RUNS) {
    describe(`a run of ${run.detected}/${run.total} — ${run.separates}`, () => {
      const record = () => recordOfFixture();
      const verdict = (bankCommand: string = BANK_COMMAND) =>
        verdictFor(record(), { gate: GATE, detected: run.detected, total: run.total }, bankCommand);

      it("scores exactly what the record banked — neither above it nor below, as whole products", () => {
        // The row's teeth, asserted on the fixture before the verdict is asked for anything: the
        // two cross-multiplied products are EQUAL, which is the one answer `<` and `>` both miss.
        expect(run.detected * record().total).toEqual(record().detected * run.total);
        expect(scoreOf(run.detected, run.total)).toEqual(recordedScoreOf(record()));
      });

      it("passes as a run sitting exactly on its record, and the gate stands", () => {
        expect(verdict()).toMatchObject({ kind: "at-baseline", ok: true });
      });

      it("names both count pairs, each carrying the score its own counts imply", () => {
        expect(verdict().message).toMatch(countPairScored(2175, 2243));
        expect(verdict().message).toMatch(countPairScored(run.detected, run.total));
      });

      it("states the score the record banked, which is the score the run measured", () => {
        expect(verdict().message).toContain(`${recordedScoreOf(record()).toFixed(4)}%`);
      });

      it("asks for nothing to be banked, in any words the caller gives for banking", () => {
        // The one thing a QUIET green owes: the two loud greens either side of it end in an ask,
        // and a reader who sees an ask on all three has lost the distinction between them. Both
        // callers' words, so a verdict carrying only one of them through still reds.
        for (const command of [BANK_COMMAND, OTHER_BANK_COMMAND]) {
          expect(verdict(command).message).not.toContain(command);
        }
      });

      it("names no kill lost, no head-room, no floor, and no reason for an allowance nothing spent", () => {
        // Every sentence below belongs to an arm this run is not, and each is one copy-paste away.
        // The floor is the sharpest of them: 96.8346 against a banked 96.9683, so a message that
        // reached for `regression`'s line would carry a figure this run never came near.
        const message = verdict().message;
        expect(message).not.toMatch(/kill\(s\) lost/);
        expect(message).not.toContain("head-room");
        expect(message).not.toContain("used to kill now survives");
        expect(message).not.toContain(`${floorOf(record()).toFixed(4)}%`);
        expect(message).not.toContain(record().allowance.reason);
      });

      it("names the gate, so a verdict read beside its siblings says which one it is", () => {
        expect(verdict().message).toContain(GATE);
      });
    });
  }
});

/**
 * The pairs the closure sweep is run over — every reading of this Rule, and the boundaries between
 * them, against the one fixture record.
 *
 * BUILT FROM THE RECORD'S OWN RATIO RATHER THAN TYPED OUT, so the population moves with the fixture
 * instead of agreeing with it by coincidence. For each population size the candidates straddle the
 * kills that ratio implies — the allowance spent exactly, one kill inside it, the ratio itself, one
 * kill past it — plus the extremes, so no arm is missed and no boundary is approached from one side
 * only. `2243` and `4486` are the two populations on which the ratio lands whole.
 */
const SWEEP_PAIRS: readonly { readonly detected: number; readonly total: number }[] = (() => {
  const pairs: { detected: number; total: number }[] = [];
  for (const total of [1, 2, 3, 68, 2242, 2243, 2244, 2400, 4485, 4486, 4487]) {
    const onRatio = (total * 2175) / 2243;
    const floorOnRatio = Math.floor(onRatio);
    for (const detected of [
      0,
      1,
      floorOnRatio - 3,
      floorOnRatio - 1,
      floorOnRatio,
      Math.ceil(onRatio),
      Math.ceil(onRatio) + 1,
      total - 1,
      total,
    ]) {
      if (detected >= 0 && detected <= total) pairs.push({ detected, total });
    }
  }
  return pairs;
})();

describe("[SCN-RAT-008] verdictFor — the verdict set closes, so no run falls out unanswered", () => {
  const record = () => recordOfFixture();

  it("sweeps a population holding both score-equal runs and a great many that are not", () => {
    // Without this the two assertions below are satisfiable by a sweep that never reaches the case
    // it is about: an iff over a population containing no equality at all is vacuously true.
    const onTheRecord = SWEEP_PAIRS.filter(
      (pair) => pair.detected * record().total === record().detected * pair.total,
    );
    expect(onTheRecord).toContainEqual({ detected: 2175, total: 2243 });
    expect(onTheRecord).toContainEqual({ detected: 4350, total: 4486 });
    expect(SWEEP_PAIRS.length - onTheRecord.length).toBeGreaterThan(40);
  });

  it("answers every run in it — no pair is refused a reading, and none returns nothing", () => {
    // The closure claim, and the reason this scenario exists. A pair that reaches no arm leaves
    // `verdictFor` by its refusal, so the refusal is caught rather than allowed to red the whole
    // test: what is wanted in the failure output is WHICH runs fall out, not merely that one did.
    const unanswered: string[] = [];
    for (const pair of SWEEP_PAIRS) {
      try {
        const verdict = verdictFor(record(), { gate: GATE, ...pair }, BANK_COMMAND);
        if (typeof verdict.ok !== "boolean" || verdict.message === "") {
          unanswered.push(`${pair.detected}/${pair.total} → an empty verdict`);
        }
      } catch {
        unanswered.push(`${pair.detected}/${pair.total}`);
      }
    }
    expect(unanswered).toEqual([]);
  });

  it("answers at-baseline exactly on the record's ratio, and never anywhere else", () => {
    // The other half of the fall-through's failure mode: an arm above letting a run through that
    // it should have claimed lands here and is greened. Asserted as an iff so both directions red
    // — a run off the ratio reading as at-baseline, and a run on it reading as anything else.
    const misread: string[] = [];
    for (const pair of SWEEP_PAIRS) {
      const onTheRecord = pair.detected * record().total === record().detected * pair.total;
      const kind = verdictFor(record(), { gate: GATE, ...pair }, BANK_COMMAND).kind;
      if ((kind === "at-baseline") !== onTheRecord) {
        misread.push(`${pair.detected}/${pair.total} → ${kind}`);
      }
    }
    expect(misread).toEqual([]);
  });

  it("reaches every reading this Rule has built, so the fall-through swallowed none of them", () => {
    // A fall-through that quietly absorbed one of the arms above would look, from this scenario's
    // two green rows alone, exactly like a fall-through that absorbed nothing. Named as a superset
    // rather than an exact set: a later reading of this Rule adds to what the sweep reaches.
    const reached = new Set(
      SWEEP_PAIRS.map((pair) => verdictFor(record(), { gate: GATE, ...pair }, BANK_COMMAND).kind),
    );
    for (const kind of [
      "regression",
      "within-slack",
      "population-grew",
      "unrecorded-improvement",
      "at-baseline",
    ]) {
      expect([...reached]).toContain(kind);
    }
  });
});

/**
 * Unit pin for the population-shrank verdict — kills that fell past the allowance while the mutant
 * population fell with them (@SCN-RAT-016, 3F-2809).
 *
 * THE ARM EXISTS BECAUSE TWO UNRELATED EVENTS ARE COUNT-IDENTICAL HERE. Remove one mutant this
 * suite killed and the record sees one kill fewer over one mutant fewer; remove one SURVIVING
 * mutant while a weakened assertion loses a kill, and the record sees exactly the same pair. No
 * arithmetic over two whole numbers separates them, so the assertions below hold the verdict to
 * saying so rather than to picking one — the sentence `regression` is licensed to make, that a
 * mutant this suite used to kill now survives, is asserted ABSENT here.
 *
 * THE RUN IS BUILT SO A FLOOR-SHAPED RECONCILER WOULD GREEN IT, which is the row's teeth. The
 * record implies a floor of 96.8346% and this run measures 96.8610% — above it. A reconciler
 * reading the floor as its bar hands this run a pass outright, so the first assertion is against
 * the fixture itself: kills past the allowance, population down, and a score still above the floor.
 *
 * AND THE ORDER IS PINNED FROM BOTH SIDES, BECAUSE THE ORDER IS THE RULE. The shrink is consulted
 * INSIDE the kill comparison, so a run whose kills held — or whose kills fell only inside the
 * allowance — is not this reading however far its population fell; and a run that lost kills while
 * its population held still or GREW is still @SCN-RAT-004's regression. Both directions are
 * asserted, because a shrink test consulted before the kills greens on the first and a shrink test
 * consulted instead of `total`'s direction reds on the second.
 */

/** The run: kills down 15, and the population down 13 with them. */
const SHRUNK_RUN = { gate: GATE, detected: 2160, total: 2230 } as const;

/** How far the kills fell, and how far the population fell with them. */
const KILLS_FELL = 15;
const MUTANTS_FELL = 13;

describe("[SCN-RAT-016] verdictFor — a population that shrank alongside its kills", () => {
  const record = () => recordOfFixture();
  const verdict = (bankCommand: string = BANK_COMMAND) =>
    verdictFor(record(), SHRUNK_RUN, bankCommand);

  it("falls past the allowance on kills, falls on population, and still scores above the floor", () => {
    // The row's teeth, asserted on the fixture before the verdict is asked for anything: both
    // counts moved down, the kills by more than the allowance covers, and the score the pair
    // implies sits ABOVE the floor the record implies — so a gate reading that floor as its bar
    // greens this run, and every assertion below is about a reading that does not.
    expect(SHRUNK_RUN.detected).toBeLessThan(record().detected - record().allowance.mutants);
    expect(SHRUNK_RUN.total).toBeLessThan(record().total);
    expect(record().detected - SHRUNK_RUN.detected).toEqual(KILLS_FELL);
    expect(record().total - SHRUNK_RUN.total).toEqual(MUTANTS_FELL);
    expect(scoreOf(SHRUNK_RUN.detected, SHRUNK_RUN.total)).toBeGreaterThan(floorOf(record()));
  });

  it("reds as a population that shrank, and the gate does not stand", () => {
    expect(verdict()).toMatchObject({ kind: "population-shrank", ok: false });
  });

  it("names both falls — the kills, and the mutants that fell with them", () => {
    // Each figure whole and its own sign, the guard @SCN-RAT-004 measured: a subtraction made the
    // wrong way round prints "-15", which a plain substring check is satisfied by.
    expect(verdict().message).toMatch(figureNamed(KILLS_FELL, "kill\\(s\\) fewer"));
    expect(verdict().message).toMatch(figureNamed(MUTANTS_FELL, "mutant\\(s\\) fewer"));
  });

  it("names both count pairs, each carrying the score its own counts imply", () => {
    expect(verdict().message).toMatch(countPairScored(2175, 2243));
    expect(verdict().message).toMatch(countPairScored(SHRUNK_RUN.detected, SHRUNK_RUN.total));
  });

  it("says the two cases look identical from here, and that it reds either way", () => {
    expect(verdict().message).toContain("look identical from here");
    expect(verdict().message).toContain("reds either way");
  });

  it("does not assert the lost kill the counts cannot prove", () => {
    // The one sentence this arm exists to withhold. `regression` is one copy-paste away and reads
    // perfectly here — which is exactly why the absence is asserted rather than assumed.
    expect(verdict().message).not.toContain("used to kill now survives");
    expect(verdict().message).not.toMatch(/kill\(s\) lost/);
  });

  it("hands a reader who removed tested code a deliberate hand-lowering, with its reason", () => {
    expect(verdict().message).toContain("If you removed tested code");
    expect(verdict().message).toContain("by hand");
    expect(verdict().message).toContain("reason in the commit");
  });

  it("hands a reader who removed none the survivor in the run's own report", () => {
    expect(verdict().message).toContain("If you removed none");
    expect(verdict().message).toContain("survivor");
    expect(verdict().message).toContain("report");
  });

  it("asks for nothing to be banked, and names no flag that would lower the record", () => {
    // @SCN-RAT-012 stands unchanged — the recorder refuses to write a lower figure and no flag
    // overrides that refusal — so a verdict pointing at either would be pointing at a door that
    // does not open. Both callers' words, so one carried through still reds; and no `--` anywhere,
    // so a flag this module invented cannot hide behind wording neither caller happens to use.
    for (const command of [BANK_COMMAND, OTHER_BANK_COMMAND]) {
      expect(verdict(command).message).not.toContain(command);
    }
    expect(verdict().message).not.toMatch(/bank/i);
    expect(verdict().message).not.toMatch(/--/);
  });

  it("names the gate, so a verdict read beside its siblings says which one it is", () => {
    expect(verdict().message).toContain(GATE);
  });

  it("is not reached by a run whose kills held, however far its population fell", () => {
    // The shrink is consulted INSIDE the kill comparison, never beside it. Both runs below shrink
    // the population by the same 13 mutants as the scenario's own; one loses no kill at all, the
    // other loses one the allowance covers. A shrink test asked before the kills claims both.
    for (const run of [
      { gate: GATE, detected: 2175, total: 2230 },
      { gate: GATE, detected: 2174, total: 2230 },
    ]) {
      expect(run.total).toBeLessThan(record().total);
      expect(verdictFor(record(), run, BANK_COMMAND).kind).not.toEqual("population-shrank");
    }
  });

  it("leaves a run that lost kills with its population unmoved or grown as a regression", () => {
    // @SCN-RAT-004's rows, re-asserted from this side: the shrink arm is reached on `total` FALLING
    // and on nothing else, so a population that held still — or one that grew, which is the row
    // whose growth is not allowed to be the answer — is the regression it always was.
    for (const run of [
      { gate: GATE, detected: 2160, total: 2243 },
      { gate: GATE, detected: 2160, total: 2400 },
    ]) {
      expect(verdictFor(record(), run, BANK_COMMAND)).toMatchObject({
        kind: "regression",
        ok: false,
      });
    }
  });
});
