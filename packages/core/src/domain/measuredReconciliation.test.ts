/**
 * @unit for the MEASURED arm of `reconcileEvidenceObligation` — an obligation holding a ceiling,
 * reconciled against a number. Opened by @SCN-CIP-004; the remaining arms join it here as their
 * own scenarios land (@SCN-CIP-005 failing, @SCN-CIP-006 missing, @SCN-CIP-002 un-ceilinged).
 *
 * Bidirectional evidence: each describe carries its @SCN id, matching features/ci-run-time.feature
 * and the @integration steps in tests/steps/ciRunTime.steps.ts.
 *
 * ONE FILE FOR THE ARMS, because they are one decision read several ways and a reader who wants to
 * know what a measured obligation does needs them side by side. Split across four files, the ORDER
 * of the arms — the thing @SCN-CIP-002 turns on — would be invisible in each.
 */

import { describe, it, expect } from "vitest";

import { reconcileEvidenceObligation } from "./qualityCheckReconciliation.js";
import type { EvidenceObligation, EvidenceObservation } from "./journal.js";

const CHECK = "ci-run-time";
const SCN = "SCN-MSD-001";

/** A measured obligation, with or without an authored ceiling. */
const obligation = (threshold?: number): EvidenceObligation => ({
  qualityCheck: "lint",
  staticCheck: CHECK,
  measured: true,
  ...(threshold !== undefined ? { threshold } : {}),
});

/** A measurement citing `SCN` and naming `CHECK`, unless told otherwise. */
const measurement = (
  measured: number,
  scnId = SCN,
  checkTag = CHECK
): EvidenceObservation => ({ qualityCheck: "lint", scnId, checkTag, measured });

describe("[SCN-CIP-004] a measurement within its threshold reconciles satisfied", () => {
  it("reconciles satisfied under the ceiling, carrying both sides", () => {
    const item = reconcileEvidenceObligation(SCN, obligation(75), [measurement(42.1)]);
    expect(item.outcome).toBe("satisfied");
    expect(item.staticCheck).toBe(CHECK);
    // BOTH numbers ride the item — the ceiling on the debit, the measurement on the credit — which
    // is what makes a failing row actionable without a second lookup (@SCN-CIP-008 renders them).
    expect(item.evidenceObligation?.threshold).toBe(75);
    expect(item.evidenceObservation).toEqual(measurement(42.1));
  });

  it("reconciles satisfied AT the ceiling — at-or-below, not below", () => {
    // The boundary, pinned rather than assumed. A ceiling a measurement sits exactly on has not
    // been exceeded; `<` would red a run for hitting its bar precisely, which is not a rule anyone
    // would state out loud, and is exactly the kind of thing that survives review unnoticed.
    expect(reconcileEvidenceObligation(SCN, obligation(75), [measurement(75)]).outcome).toBe(
      "satisfied"
    );
  });

  it("answers the obligation whose CHECK the measurement names, not merely the row it cites", () => {
    // The @SCN-LNT-012 lesson on this axis. Both measurements cite this row; only one of them is
    // about this obligation, and matching on the citation alone would hand the first one found to
    // both — turning the second check's real state into a report about the first.
    const item = reconcileEvidenceObligation(SCN, obligation(75), [
      measurement(99, SCN, "coverage"),
      measurement(42.1, SCN, CHECK),
    ]);
    expect(item.outcome).toBe("satisfied");
    expect(item.evidenceObservation).toEqual(measurement(42.1, SCN, CHECK));
  });

  it("ignores a measurement of the same check citing a DIFFERENT row", () => {
    // The other half of the address. Two suites share one characteristic and differ only by @SCN
    // (@SCN-CIP-007), so a reader keyed on the check tag alone would credit one suite's row with
    // the other's wall-clock.
    expect(
      reconcileEvidenceObligation(SCN, obligation(75), [measurement(42.1, "SCN-MSD-002", CHECK)])
        .outcome
    ).toBe("missing");
  });

  it("leaves a STATIC obligation on the static route, unaffected by any measurement", () => {
    // The two arms must not bleed. A static check reconciles by exists / enforced-over-real-source
    // and knows nothing of numbers; a measurement citing its row must not discharge it.
    const staticObligation: EvidenceObligation = { qualityCheck: "lint", staticCheck: CHECK };
    expect(
      reconcileEvidenceObligation(SCN, staticObligation, [measurement(42.1)]).outcome
    ).toBe("missing");
  });
});

describe("[SCN-CIP-005] a measurement over its threshold reconciles failing", () => {
  it("reconciles failing above the ceiling, carrying both sides", () => {
    const item = reconcileEvidenceObligation(SCN, obligation(75), [measurement(96.4)]);
    expect(item.outcome).toBe("failing");
    // The two numbers are what make the row actionable: "over its threshold" sends a reader
    // nowhere, "96.4 against 75" sends them somewhere. @SCN-CIP-008 renders them; this is where
    // they are pinned as PRESENT.
    expect(item.evidenceObligation?.threshold).toBe(75);
    expect(item.evidenceObservation).toEqual(measurement(96.4));
  });

  it("fails on the barest overrun, not on a margin", () => {
    // There is no tolerance band on the ledger. The wrapper's own trigger-and-gate report is where
    // runner variance is absorbed; what reaches here is the FAILING threshold, and a number above
    // it is above it. A margin quietly added here would be a second, undocumented ceiling.
    expect(reconcileEvidenceObligation(SCN, obligation(75), [measurement(75.001)]).outcome).toBe(
      "failing"
    );
  });

  it("is `failing` and not `watermelon` — the suite ran, and was too slow", () => {
    // Both are out-of-balance, and they are different facts with different cures. The watermelon is
    // a check that never ran; this is a check that ran and did not meet its bar. Collapsing them
    // would send a reader to wire up a step that is already wired.
    expect(reconcileEvidenceObligation(SCN, obligation(75), [measurement(96.4)]).outcome).not.toBe(
      "watermelon"
    );
  });
});

describe("[SCN-CIP-006] a measured obligation no measurement reaches reconciles missing", () => {
  it("reconciles missing when no measurement arrived at all", () => {
    const item = reconcileEvidenceObligation(SCN, obligation(75), []);
    expect(item.outcome).toBe("missing");
    expect(item.evidenceObligation?.threshold).toBe(75);
  });

  it("is never BALANCED — the reading the whole axis exists to refuse", () => {
    // A suite whose timing nobody measured must not look like a suite that came in under its
    // threshold. `satisfied` is the only outcome that would let it; the assertion is written
    // against that word rather than against `missing` so it keeps its meaning if the absence ever
    // acquires a more specific name.
    expect(reconcileEvidenceObligation(SCN, obligation(75), []).outcome).not.toBe("satisfied");
  });

  it("carries NO credit side — the debit stands alone", () => {
    // `missing` is (Obligation Exists, Observation None) in the canon side-profile, so the smart
    // constructor refuses an item that carries an observation. Asserted because the whole point of
    // the outcome is that nothing was observed.
    expect(reconcileEvidenceObligation(SCN, obligation(75), []).evidenceObservation).toBeUndefined();
  });

  it("is NOT the watermelon — that outcome is a read fact this axis cannot observe", () => {
    // On the static axis, "the check exists and CI does not run it" is read from the manifest and
    // the workflow, so it is observable and has its own name. A measured check is read from
    // nowhere. Pinned so a later reader does not "improve" missing into a watermelon the axis
    // cannot honestly detect — which would send someone to wire up a step that is already wired.
    expect(reconcileEvidenceObligation(SCN, obligation(75), []).outcome).not.toBe("watermelon");
  });

  it("stays missing when the artefact holds OTHER checks' measurements", () => {
    // The absence has to be about THIS obligation. An artefact full of other suites' numbers is
    // still an artefact with nothing for this one, and a reader that answered from the pile would
    // report a suite nobody timed as timed.
    expect(
      reconcileEvidenceObligation(SCN, obligation(75), [
        measurement(10, SCN, "coverage"),
        measurement(10, "SCN-MSD-002", CHECK),
      ]).outcome
    ).toBe("missing");
  });
});

describe("[SCN-CIP-002] a measured obligation whose threshold nothing supplies never reads satisfied", () => {
  it("never reads satisfied, even though a measurement arrived", () => {
    // The cheap reading — absent means unbounded, so every measurement is under it — would produce
    // a green row for a check nobody set a bar for: the watermelon this axis exists to refuse,
    // manufactured by the engine rather than by the target.
    const item = reconcileEvidenceObligation(SCN, obligation(), [measurement(12.5)]);
    expect(item.outcome).not.toBe("satisfied");
    expect(item.outcome).toBe("missing");
  });

  it("decides on the DEBIT, before the measurement is sought", () => {
    // The arm's ORDER is the mechanism. Taken after the match, an absent ceiling would fall through
    // to `measured <= undefined` — which JavaScript answers false to — and the row would read
    // `failing`: loud, but naming the wrong fault and sending a reader to optimise a suite whose
    // real problem is that nobody wrote its bar. Both arms below must agree, whatever the number.
    expect(reconcileEvidenceObligation(SCN, obligation(), [measurement(0.1)]).outcome).toBe(
      "missing"
    );
    expect(reconcileEvidenceObligation(SCN, obligation(), [measurement(9999)]).outcome).toBe(
      "missing"
    );
  });

  it("carries the un-ceilinged obligation, so the row can name what is unsupplied", () => {
    // Separate fields, and this is why: `measured` marks the route, `threshold` holds the bar, and
    // an obligation that is visibly one without the other is a fact on the row rather than an
    // absence a reader has to notice.
    const item = reconcileEvidenceObligation(SCN, obligation(), []);
    expect(item.evidenceObligation?.measured).toBe(true);
    expect(item.evidenceObligation?.threshold).toBeUndefined();
  });
});

describe("[SCN-CIP-007] two scenarios sharing one measured check keep their own ceilings", () => {
  /** The two suites the first consumer times, with the ceilings canon gives them. */
  const UNIT = "SCN-MSD-001";
  const BDD = "SCN-MSD-002";

  // The fixture DISAGREES across the rows on purpose: one suite inside its ceiling, one over.
  // Two rows that agreed could not tell a per-@SCN reader from a per-tag one — both would produce
  // the same report — so the disagreement is what gives this its teeth.
  const measurements = [measurement(42.1, UNIT), measurement(181.7, BDD)];

  it("credits the unit suite's row with the unit suite's measurement", () => {
    const item = reconcileEvidenceObligation(UNIT, obligation(75), measurements);
    expect(item.outcome).toBe("satisfied");
    expect(item.evidenceObservation).toEqual(measurement(42.1, UNIT));
  });

  it("credits the other suite's row with the OTHER suite's measurement, against its own ceiling", () => {
    // 181.7 is comfortably inside the unit suite's 75-second world only if a reader has taken the
    // wrong row's ceiling; against its own 150 it is an overrun. Both halves are asserted because
    // asserting one leaves the other free to be the one that was mis-credited.
    const item = reconcileEvidenceObligation(BDD, obligation(150), measurements);
    expect(item.outcome).toBe("failing");
    expect(item.evidenceObservation).toEqual(measurement(181.7, BDD));
  });

  it("is the shape the STATIC axis calls a corpus fault, and here is legal", () => {
    // On the static axis two stepless scenarios sharing one UNDISCRIMINATED bare check leaves the
    // second `missing` by design (@SCN-LNT-008): one run is one credit, and the corpus hop keeps
    // first-in-corpus order. Since @SCN-LNT-015 the two axes agree — a static check's registry
    // entry names the row it credits, as a measurement has always arrived carrying its own @SCN.
    // What still differs is only WHERE the citation comes from. Neither row here is missing, which
    // is the arrangement both axes now reach.
    expect(reconcileEvidenceObligation(UNIT, obligation(75), measurements).outcome).not.toBe(
      "missing"
    );
    expect(reconcileEvidenceObligation(BDD, obligation(150), measurements).outcome).not.toBe(
      "missing"
    );
  });
});

/**
 * @unit for @SCN-MUT-004 — the FLOOR arm of the same reconciler: the comparison taken off the
 * obligation rather than assumed, and the boundary that comes with it.
 *
 * Bidirectional evidence: the describe carries @SCN-MUT-004, matching
 * features/mutation-score.feature and the @integration steps in tests/steps/mutationScore.steps.ts.
 *
 * IT LIVES BESIDE THE CEILING ARM for the reason the arms above live together: this is one decision
 * read two ways, and a reader asking what a measured obligation does needs both directions in view.
 * The at-most arm is @SCN-CIP-004/-005's and is not re-asserted here.
 */
const FLOOR_CHECK = "mutation";

/** The bar this repository's own domain core is held to, borrowed as a realistic floor. */
const BAR = 91.87;

/** A measured obligation whose bar is a FLOOR — the comparison authored in the manifest entry. */
const floorObligation = (): EvidenceObligation => ({
  qualityCheck: "lint",
  staticCheck: FLOOR_CHECK,
  measured: true,
  threshold: BAR,
  atLeast: true,
});

/** A mutation score citing `SCN` — a number and nothing else, as every credit on this axis is. */
const score = (measured: number): EvidenceObservation => measurement(measured, SCN, FLOOR_CHECK);

describe("[SCN-MUT-004] a measurement at or above its at-least bar reconciles satisfied", () => {
  it("reconciles satisfied above the floor, carrying both sides", () => {
    // 92.52 against 91.87 — the one fixture shape that cannot pass while the engine ignores what
    // the debit said, because read as the ceiling this axis was built as, these same two numbers
    // are `failing`.
    const item = reconcileEvidenceObligation(SCN, floorObligation(), [score(92.52)]);
    expect(item.outcome).toBe("satisfied");
    expect(item.staticCheck).toBe(FLOOR_CHECK);
    expect(item.evidenceObligation?.threshold).toBe(BAR);
    expect(item.evidenceObservation).toEqual(score(92.52));
  });

  it("reconciles satisfied AT the floor — at-or-above, not above", () => {
    // The boundary, pinned rather than assumed, and the mirror of the ceiling's at-or-below. A
    // floor a score sits exactly on has been met; `>` would red a run for hitting its bar
    // precisely, which is not a rule anyone would state out loud.
    expect(reconcileEvidenceObligation(SCN, floorObligation(), [score(BAR)]).outcome).toBe(
      "satisfied"
    );
  });
});

/**
 * @unit for @SCN-MUT-005 — the same floor arm reaching the OTHER answer, and the two numbers that
 * make that answer actionable.
 *
 * Bidirectional evidence: the describe carries @SCN-MUT-005, matching
 * features/mutation-score.feature and the @integration steps in tests/steps/mutationScore.steps.ts.
 *
 * THE FIXTURE IS BUILT TO DISAGREE WITH THE OTHER DIRECTION. 91.4 against a floor of 91.87 is
 * `failing`; the SAME two numbers read as the ceiling this axis was built as are `satisfied`. So
 * these assertions cannot pass while the comparison is taken from anywhere but the debit — which
 * is the whole of what this scenario is worth over @SCN-MUT-004. The at-most reading is
 * @SCN-CIP-004/-005's and is deliberately NOT re-asserted here; it is the fixture's construction,
 * not a second claim.
 *
 * THE ROW's VERDICT is asserted at @integration, through the real `reconcile`, because that is
 * where the outcome has to travel to be worth anything.
 */
describe("[SCN-MUT-005] a measurement below its at-least bar reconciles failing", () => {
  /** The shortfall: comfortably inside 91.87 read as a ceiling, and short of it read as a floor. */
  const SHORTFALL = 91.4;

  it("reconciles failing below the floor, carrying both sides", () => {
    const item = reconcileEvidenceObligation(SCN, floorObligation(), [score(SHORTFALL)]);
    expect(item.outcome).toBe("failing");
    expect(item.staticCheck).toBe(FLOOR_CHECK);
    // Both numbers ride the one item — the bar off the debit, the measurement off the credit —
    // which is what makes the row actionable without a second lookup: "mutation is failing" sends
    // a reader nowhere, "91.4 against a floor of 91.87" sends them somewhere. @SCN-MUT-006 renders
    // them; this is where they are pinned as PRESENT.
    expect(item.evidenceObligation?.threshold).toBe(BAR);
    expect(item.evidenceObservation).toEqual(score(SHORTFALL));
  });

  it("fails on the barest shortfall, not on a margin", () => {
    // There is no tolerance band on the ledger, in either direction. A score below its floor is
    // below it, and a margin quietly added here would be a second, undocumented bar — the very
    // thing retiring the runner's own `break` threshold was for.
    expect(reconcileEvidenceObligation(SCN, floorObligation(), [score(91.869)]).outcome).toBe(
      "failing"
    );
  });

  it("is `failing` and not `missing` — the sweep ran, and the suite was not strong enough", () => {
    // Both are out-of-balance, and they are different facts with different cures. `missing` is a
    // sweep whose number never arrived; this is a number that arrived and did not meet its bar.
    // Collapsing them would send a reader to fix a nightly that is running perfectly well.
    const outcome = reconcileEvidenceObligation(SCN, floorObligation(), [score(SHORTFALL)]).outcome;
    expect(outcome).not.toBe("missing");
    expect(outcome).not.toBe("watermelon");
  });

  it("never reads satisfied on the floor arm just because a number arrived", () => {
    // The reading this whole axis exists to refuse, stated on the direction that was added last:
    // a suite whose mutants are surviving must not look like one that met its bar. Written against
    // `satisfied` rather than for `failing` so it keeps its meaning if the shortfall ever acquires
    // a more specific name.
    expect(
      reconcileEvidenceObligation(SCN, floorObligation(), [score(SHORTFALL)]).outcome
    ).not.toBe("satisfied");
  });
});
