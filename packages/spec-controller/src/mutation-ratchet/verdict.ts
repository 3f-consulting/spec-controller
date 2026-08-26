/**
 * THE VERDICT — what a gate's run turned out to be, reconciled against the record it last banked
 * (@SCN-RAT-004, 3F-2794; @SCN-RAT-005, 3F-2795; @SCN-RAT-006, 3F-2796; @SCN-RAT-007, 3F-2797;
 * @SCN-RAT-008, 3F-2798; @SCN-RAT-016, 3F-2809).
 *
 * A BAR CAN ONLY ASK WHETHER ONE NUMBER FELL, AND THE INTERESTING QUESTION IS WHY. A mutation score
 * is detected over total, so it drops for two entirely unrelated reasons: a mutant this suite used
 * to kill now survives, which is the fault the gate exists for; or new mutable code arrived carrying
 * survivors with it, which is no fault at all. `record.ts` keeps the two counts apart so that this
 * module can tell those apart — and telling them apart is the whole product.
 *
 * THE KILLS ARE ASKED ABOUT FIRST, AND ASKED ABOUT ALONE. A run that loses kills WHILE its mutant
 * population grows is the shape every looser reading gets wrong. The growth is a true fact about
 * that run and innocent on its own, so a reconciler that notices it before it counts the kills
 * answers with the innocent half — the score fell, the population explains why, nobody looks any
 * further and a real regression ships. So the count comparison is the first thing this module does,
 * and the population's movement is never allowed to be the answer while a kill is missing.
 *
 * AND INSIDE THAT FIRST COMPARISON, THE POPULATION'S DIRECTION DECIDES WHICH RED IS PRINTED. A
 * population that held still or grew is what licenses the regression's sentence: nothing left the
 * scope, so the kills that vanished were lost. A population that SHRANK removes that licence, and
 * `population-shrank` says so rather than asserting it anyway — removing one killed mutant, and
 * removing one survivor beside a weakened assertion, move the two counts identically, and no
 * arithmetic over two whole numbers tells them apart (@SCN-RAT-016). Both readings are red and
 * both stop the gate; only the sentence differs, and the sentence is the whole point.
 *
 * AND THE SCORE HAS EXACTLY ONE JOB, WHICH IS THE SECOND COMPARISON AND NOT THE FIRST. Once the
 * kills are known to have held, the run either scored below what the record banked or it did not,
 * and only the first of those is a population that grew: a run whose kills ROSE far enough carries
 * its growth without any drop at all, and is an improvement rather than this. So the growth is not
 * what is asked about — the fallen score is, and the growth follows from it, because a run that
 * lost no kills can only score lower by measuring more mutants. That is the whole of what the score
 * is allowed to decide here, and it is why it is asked second (@SCN-RAT-006).
 *
 * THE FLOOR IS STATED, NEVER CONSULTED. `floorOf` is deliberately absent from every condition here.
 * It is the same bar expressed as a percentage, carried in the message because a reader arriving
 * from the sweep has a percentage in front of them and wants the bar in the units they are already
 * holding. The enforcement is the count comparison above it. The two agree exactly while the
 * population holds still and part company the moment it moves, so reading the floor AS the gate
 * would put the judgement back on the score — the confusion the counts model exists to prevent.
 *
 * NOTHING HERE NAMES A PROJECT, A CHECK, A RUNNER, A WORKFLOW OR A REPOSITORY. The gate's name
 * arrives on the record and on the measurement, both of them the caller's own words.
 */

import {
  counts,
  floorOf,
  pct,
  recordedScoreOf,
  scoreOf,
  scoreRoseOver,
  type GateRecord,
} from "./record.js";

/**
 * One gate's measured run, in the same two counts the record is kept in.
 *
 * THE SAME PAIR AS THE RECORD, AND THAT IS WHAT MAKES THE COMPARISON POSSIBLE. A measurement that
 * arrived as a score would already have folded the two events this module exists to separate into
 * one number, before anything here could look at it.
 */
export interface MutationMeasurement {
  /** The gate this run measured, as the caller names it. */
  readonly gate: string;
  /** Mutants the suite detected. */
  readonly detected: number;
  /** Every mutant the gate measured, detected or not. */
  readonly total: number;
}

/**
 * What a run turned out to be.
 *
 * `regression` IS THE ONE DECIDED ON KILLS, which is what makes it immune to the population moving,
 * and `within-slack` (@SCN-RAT-005) is its neighbour on the other side of the same comparison — the
 * two share one boundary and neither can pin it alone. `population-grew` (@SCN-RAT-006) is the third
 * built, and the first decided on anything but kills — it is the drop a bar shaped like a score
 * cannot express, and the reason the record keeps two counts rather than one. `unrecorded-improvement`
 * (@SCN-RAT-007) is the fourth, and the only RED one not decided on kills — it is the clause that
 * turns a ceiling into a ratchet, and without it every other arm here is a bar that quietly drifts
 * away from the tree it is meant to be holding. `at-baseline` (@SCN-RAT-008) is the fifth and the
 * one that CLOSES the set: it is what is left once those four have each declined a run, so from it
 * on there is no measurement this module can be handed that it cannot answer. `population-shrank`
 * (@SCN-RAT-016) is the sixth built and `population-grew`'s twin on the other side of the same
 * movement: it shares `regression`'s condition exactly and parts from it on the population's
 * direction alone, because the sentence `regression` is allowed to say is licensed by nothing
 * having left the scope. The last member sits
 * outside the comparison entirely — `no-measurement` (@SCN-RAT-009) is reached from a report that
 * holds nothing, before there are two counts to reconcile at all.
 */
export type MutationVerdictKind =
  | "no-measurement"
  | "regression"
  | "population-shrank"
  | "within-slack"
  | "population-grew"
  | "unrecorded-improvement"
  | "at-baseline";

/**
 * A verdict: whether the run stands, and the line its reader gets.
 *
 * THE MESSAGE IS NOT DECORATION. A verdict that reds without saying which kills went missing, what
 * allowance they were measured against, and what to do next is a red somebody widens the bar to
 * clear, because widening is cheaper than a hunt with no starting point.
 */
export interface MutationVerdict {
  readonly kind: MutationVerdictKind;
  /** Whether the run stands. */
  readonly ok: boolean;
  /** The line its reader gets, carrying every figure the verdict was reached from. */
  readonly message: string;
}

/**
 * Fewer kills than the record less the allowance it states.
 *
 * WHAT THE MESSAGE OWES ITS READER. The kills that went missing and the allowance they were measured
 * against, so the size of the gap is legible without arithmetic; both count pairs, so which of the
 * two figures moved is visible; the floor as a percentage, so a reader arriving from the sweep has
 * the bar in the units they are already holding; and then what to do, because a red with no starting
 * point is a red somebody widens the bar to clear.
 *
 * THE ASSERTION IT MAKES IS SAFE BECAUSE IT IS MADE ON KILLS. "A mutant this suite used to kill now
 * survives" is a claim about a mutant that still exists, and the kill count is what licenses it: the
 * population's movement does not enter the comparison, so a run that lost kills is a run that lost
 * kills whatever else it did at the same time.
 */
function regression(record: GateRecord, measurement: MutationMeasurement): MutationVerdict {
  const lost = record.detected - measurement.detected;
  return {
    kind: "regression",
    ok: false,
    message:
      `${record.gate}: REGRESSION — ${lost} kill(s) lost against an allowance of ` +
      `${record.allowance.mutants}. Recorded ${counts(record.detected, record.total)}, measured ` +
      `${counts(measurement.detected, measurement.total)}; floor ${pct(floorOf(record))}%. ` +
      "A mutant this suite used to kill now survives — find it in the run's report and restore " +
      "the assertion.",
  };
}

/**
 * The kills fell past the allowance, and the population fell with them.
 *
 * A REMOVAL AND A REGRESSION ARE COUNT-IDENTICAL HERE, WHICH IS THE WHOLE REASON THIS IS A READING
 * OF ITS OWN. Remove one mutant this suite killed and the record sees one kill fewer over one
 * mutant fewer. Remove one SURVIVING mutant while a weakened assertion loses a kill, and the record
 * sees exactly the same pair. No arithmetic over two whole numbers separates them, so the
 * reconciler must not pretend it can: asserting the lost kill would be crying wolf at an honest
 * refactor, in a gate whose entire thesis is not doing that.
 *
 * SO IT REDS ANYWAY, AND THAT IS NOT A HEDGE. Passing the shrink would let the weakened assertion
 * hide inside the honest refactor, which is precisely the fault this gate exists for. And removed
 * code genuinely does lower the kills the gate can ever reach, so the record has to come down —
 * deliberately, by hand, with the reason in the commit. That is the same conscious lowering the
 * recorder's refusal already points at (@SCN-RAT-012), and it stays the only way down: no flag
 * lowers a record, so this message must not read as though one did. It names no flag and asks for
 * no banking, because banking is up-only and would be refused.
 *
 * THE HONESTY LIVES IN THE MESSAGE, WHICH IS THE HALF A BARE RED ALWAYS DROPS. Both falls, said out
 * loud; both count pairs; that two unrelated events look identical from here; and then BOTH
 * branches, because picking one would be picking on evidence this module does not have.
 *
 * WHAT WOULD ACTUALLY DECIDE IT, CONSIDERED AND NOT BUILT (3F-2786). A per-mutant identity record —
 * WHICH mutants were killed, compared as sets — separates them safely: a lost kill is a mutant that
 * persisted and flipped, a removal is a mutant that no longer exists. It is a materially heavier
 * record than two whole numbers, and it waits until the friction of hand-lowering proves frequent
 * enough to earn it.
 */
function populationShrank(record: GateRecord, measurement: MutationMeasurement): MutationVerdict {
  const kills = record.detected - measurement.detected;
  const mutants = record.total - measurement.total;
  return {
    kind: "population-shrank",
    ok: false,
    message:
      `${record.gate}: POPULATION SHRANK — ${kills} kill(s) fewer, and ${mutants} mutant(s) ` +
      `fewer with them. Recorded ${counts(record.detected, record.total)}, measured ` +
      `${counts(measurement.detected, measurement.total)}. Two unrelated things look identical ` +
      "from here. If you removed tested code, the record describes a tree that no longer exists: " +
      "lower it by hand, deliberately, with the reason in the commit — nothing lowers a record " +
      "for you. If you removed none, a test weakened and this is a regression: find the survivor " +
      "in the run's own report and restore the assertion. The counts cannot tell those two apart, " +
      "so this reds either way.",
  };
}

/**
 * A kill lost, but not past the record less the allowance it states.
 *
 * THE ALLOWANCE IS SPENT IN PUBLIC OR IT IS NOT SPENT AT ALL. This arm is a PASS, and a pass is
 * where a message stops being written carefully — the run stands, so nobody is being sent anywhere.
 * That is exactly what makes the quiet version dangerous: a gate that absorbs a lost kill because a
 * figure in the record said it could has moved, and the move stays invisible for as long as nobody
 * goes and re-derives it. So this one reports as fully as the red does.
 *
 * AND IT CARRIES THE RECORD'S OWN REASON, WHICH IS THE HALF A BARE PASS ALWAYS DROPS. The reason is
 * the standard the allowance answers to — the gate's own measured non-determinism — and a standard
 * nobody is shown is one nobody can notice has stopped being true. It is printed as the record
 * states it rather than paraphrased here, because a reason this module worded would be this
 * module's opinion about a project's gate, and it has none.
 *
 * IT IS REACHED ON KILLS, LIKE THE ARM ABOVE IT. The question this arm answers is "did a kill go
 * missing, and does the allowance cover it" — the population's movement is not consulted, in either
 * direction, for the same reason it is not consulted in `regression`.
 */
function withinSlack(record: GateRecord, measurement: MutationMeasurement): MutationVerdict {
  const lost = record.detected - measurement.detected;
  return {
    kind: "within-slack",
    ok: true,
    message:
      `${record.gate}: PASSED INSIDE THE ALLOWANCE — ${lost} kill(s) lost against an allowance ` +
      `of ${record.allowance.mutants}, which the run did not exceed. Recorded ` +
      `${counts(record.detected, record.total)}, measured ` +
      `${counts(measurement.detected, measurement.total)}. The record states that allowance ` +
      `because: ${record.allowance.reason}`,
  };
}

/**
 * Whether the run scored below what the record banked — in whole mutants, never in percentages.
 *
 * CROSS-MULTIPLIED RATHER THAN DIVIDED, so the comparison is exact — `record.ts`'s own comparison,
 * read with the arguments the way round that asks whether the RECORD scores above the run. Two
 * scores that are equal as ratios can differ in their last bit once each has been through a
 * division, and a run whose score did not move would then read as one that fell, which is the
 * difference between this verdict and the two below it.
 *
 * AND ITS ANSWER IS WHAT ESTABLISHES THE GROWTH, RATHER THAN THE OTHER WAY ROUND. It is only ever
 * asked of a run whose kills held or rose, and a run that lost no kills cannot score lower unless it
 * measured more mutants — so a `true` here means the population grew, and by strictly more than
 * nothing, which is what lets the message state the difference as a count of new mutants.
 */
function scoreFellFrom(record: GateRecord, measurement: MutationMeasurement): boolean {
  return scoreRoseOver(record.detected, record.total, measurement.detected, measurement.total);
}

/**
 * No kill lost, and a score that fell only because the run measured more mutants.
 *
 * THIS IS THE DROP A BAR SHAPED LIKE A SCORE CANNOT EXPRESS, and the reason the record keeps two
 * counts. New mutable code arrived carrying survivors with it, so the score fell while every mutant
 * this suite used to kill still dies. A score bar reds on that, and the cheapest way back to green
 * is then to widen the bar — which spends the gate's teeth on a run that lost nothing, and spends
 * them for every real regression that follows. So it passes.
 *
 * AND IT PASSES LOUDLY, BECAUSE THE SILENT VERSION IS THE OPPOSITE ERROR. Mutable code arriving with
 * survivors on it is a real event, and the record has stopped describing the tree it was banked
 * from. So the message states how many mutants the run measured that the record never held, that no
 * kill went missing, both count pairs with the score each implies, and the ask.
 *
 * THE ASK IS IN THE CALLER'S OWN WORDS. What to type to bank a measurement is a project's own fact —
 * its script, its runner, its file — so a command worded here would be this module naming one. It
 * arrives as an input and is carried through unchanged.
 */
function populationGrew(
  record: GateRecord,
  measurement: MutationMeasurement,
  bankCommand: string,
): MutationVerdict {
  const grown = measurement.total - record.total;
  return {
    kind: "population-grew",
    ok: true,
    message:
      `${record.gate}: PASSED ON A GROWN POPULATION — ${grown} mutant(s) measured that the ` +
      `record never held, and no kill went missing. Recorded ` +
      `${counts(record.detected, record.total)}, measured ` +
      `${counts(measurement.detected, measurement.total)}: the score fell because the population ` +
      "grew, not because a mutant this suite used to kill now survives. The record no longer " +
      `describes the tree it was banked from — bank it: ${bankCommand}`,
  };
}

/**
 * Whether the run scored ABOVE what the record banked — the mirror of `scoreFellFrom`, and asked
 * the same way for the same reason.
 *
 * THE SAME COMPARISON, THE ARGUMENTS THE OTHER WAY ROUND, and that is now literally true rather
 * than true by diligence: both call `scoreRoseOver`, so above and below are one function's two
 * readings and cannot drift into disagreeing. What that leaves is EQUAL, the one case neither
 * claims, and equal is a verdict of its own (@SCN-RAT-008). Two comparisons reached by different
 * arithmetic could each answer `false` for a run that is genuinely one or the other, and the run
 * would fall out of the reconciler entirely.
 */
function scoreRoseFrom(record: GateRecord, measurement: MutationMeasurement): boolean {
  return scoreRoseOver(measurement.detected, measurement.total, record.detected, record.total);
}

/**
 * A tree that measured better than the record it is being judged against.
 *
 * THIS IS THE CLAUSE THAT TURNS A CEILING INTO A RATCHET, AND IT IS THE ONE A READER'S INSTINCT
 * FIGHTS. The suite got better and the verdict reds, which reads as a gate punishing the very thing
 * it was built to want. It is not that. The gap between a stale record and a better tree is
 * HEAD-ROOM, and head-room is the one thing a bar must never be allowed to accumulate: a survivor
 * arriving inside it costs nothing and reds nothing, so the gate goes quiet exactly where it was
 * meant to be watching, and stays quiet until the whole gain has been given back.
 *
 * THE SAME RULING IS ALREADY MADE ONE LEVEL UP. `complexity-exceptions` (@SCN-CPX-003) reds an
 * exception list that disagrees with the tree in EITHER direction — over the recorded figure is a
 * regression, under it is an improvement nobody recorded — because a recorded figure that has
 * stopped describing the tree has stopped being a bar, whichever side of it the tree moved to.
 *
 * SO THE MESSAGE IS AN ERRAND RATHER THAN A REPRIMAND. It says how far above the record the tree
 * measured, both count pairs so which figure moved is visible, the head-room argument itself — a
 * red nobody understands is a red somebody deletes — and then the two figures banking would write,
 * beside what to type to write them. Clearing it is one command.
 *
 * THE POINTS ARE A REPORTED FIGURE, NOT THE DECISION VARIABLE, exactly as the floor is above. The
 * comparison was made on whole counts; this division happens after it, so no verdict here was ever
 * reached by dividing. It is stated because a reader arriving from the sweep has percentages in
 * front of them and wants to know how much of a gap they are being asked to bank.
 *
 * AND THE FIGURES IN THE ASK ARE THE MEASURED ONES. "Bank the record" is the sentence, so writing
 * the RECORD's own counts into it is the natural slip — and a message that already prints both
 * pairs elsewhere hides that slip completely, because every figure a reader is hunting for is
 * somewhere on the line.
 */
function unrecordedImprovement(
  record: GateRecord,
  measurement: MutationMeasurement,
  bankCommand: string,
): MutationVerdict {
  const better = scoreOf(measurement.detected, measurement.total) - recordedScoreOf(record);
  return {
    kind: "unrecorded-improvement",
    ok: false,
    message:
      `${record.gate}: RATCHET DEBT — the tree measured ${pct(better)} points better than the ` +
      `record holds. Recorded ${counts(record.detected, record.total)}, measured ` +
      `${counts(measurement.detected, measurement.total)}, and the gap between the two is ` +
      "head-room: a survivor arriving inside it would cost nothing and red nothing, so this gate " +
      "is quiet exactly where it was meant to be watching until the whole gain is given back. " +
      `Bank ${measurement.detected}/${measurement.total}: ${bankCommand}`,
  };
}

/**
 * A run that scored exactly what the record banked.
 *
 * THE FALL-THROUGH, AND IT TAKES NO CONDITION OF ITS OWN. Every arm above claims its runs on a
 * question it asks out loud; this one claims what is left over, and what is left over is exactly
 * the case the two score comparisons cannot express: they are `<` and `>` of the same two products,
 * so EQUAL is the one answer neither can give. Writing a condition here — "the same two counts" is
 * the one that suggests itself — would narrow the arm to a subset of the runs that reach it and
 * leave the rest with no verdict at all, which is the failure a fall-through exists to make
 * impossible. It is equality of the RATIO, not of the pair: a run measuring 4350 of 4486 against a
 * record of 2175 of 2243 has moved both of its counts and moved its score not at all.
 *
 * AND IT SAYS ALMOST NOTHING, WHICH IS THE OTHER HALF OF WHAT IT IS FOR. Both count pairs and the
 * score they share, because a reader who wants to know a run held its ground wants the two figures
 * it held against. Nothing else — no kills lost, because none were; no head-room, because there is
 * none; no floor, because nothing came near one; and above all no ASK. The two loud greens either
 * side of this one each end in one, and a reader who sees an ask on all three has lost the
 * distinction between a run that needs something doing and a run that does not.
 */
function atBaseline(record: GateRecord, measurement: MutationMeasurement): MutationVerdict {
  return {
    kind: "at-baseline",
    ok: true,
    message:
      `${record.gate}: ON THE RECORD — recorded ${counts(record.detected, record.total)}, ` +
      `measured ${counts(measurement.detected, measurement.total)}: the run scored exactly what ` +
      "the record banked, and no kill went missing.",
  };
}

/**
 * The refusal, as a verdict (@SCN-RAT-009, 3F-2800).
 *
 * IT SITS OUTSIDE `verdictFor` BECAUSE IT IS REACHED BEFORE THERE ARE COUNTS TO RECONCILE. Every
 * arm of that function compares two pairs of whole numbers; this one is what a caller has instead
 * of a pair, so handing it a fabricated one — a zero, most temptingly — would put a real verdict's
 * name on a run nobody measured.
 *
 * AND IT IS RED. A sweep that did not run produced no evidence about the tree, and a reconciler
 * that shrugs at no evidence reports success for a run that measured nothing: the build green, the
 * report absent, and the two facts never meeting.
 *
 * @param gate the gate that was to have been measured, as the caller names it
 * @param reason why there is no measurement, naming the path it was sought at
 */
export function noMeasurement(gate: string, reason: string): MutationVerdict {
  return {
    kind: "no-measurement",
    ok: false,
    message:
      `${gate}: NO MEASUREMENT — ${reason} A run that produced no score is not a run that ` +
      "passed: a green build over an absent report is how a gate stays broken for nights on end " +
      "with nobody the wiser. It is not a score of zero either — zero is a measurement, and " +
      "reconciling one reaches a regression whose reader goes looking for kills that, here, " +
      "were never made in the first place.",
  };
}

/**
 * Reconcile one gate's run against the bar its record states.
 *
 * INSIDE THAT FIRST COMPARISON, `total` DECIDES WHICH RED IS PRINTED, AND IT IS ASKED THERE RATHER
 * THAN BESIDE IT. The kills must already have fallen past the allowance before the population's
 * direction is consulted at all, so a run that lost no kills is not either red however far its
 * population fell, and a run that lost a kill the allowance covers is the pass below whichever way
 * its population moved. What the direction settles is only which sentence a run that has already
 * failed on kills is told: held still or grew licenses `regression`'s claim that a mutant this
 * suite used to kill now survives, because nothing left the scope; SHRANK does not, and
 * `population-shrank` says the two look identical from here instead (@SCN-RAT-016).
 *
 * THE COUNT COMPARISON IS FIRST, AND IT IS ON `detected` ALONE. Everything below it in this
 * reconciler will be a question about the score, and the score cannot separate a lost kill from a
 * grown population — so the one verdict that must not be reachable through the score is settled
 * before the score is consulted at all. A run that loses kills and grows its population at the same
 * time is named as the regression it is, rather than as the growth that would explain it away.
 *
 * `floorOf` IS DELIBERATELY ABSENT FROM THIS CONDITION. It is the same bar as a percentage, carried
 * in the message for its reader; the enforcement is the comparison above. The two agree exactly
 * while the population holds still, so a reconciler judging on the floor greens every example of
 * this Rule and reds a grown population that lost nothing — which is the confusion the counts model
 * exists to prevent.
 *
 * THE SECOND COMPARISON IS THE SAME BOUNDARY FROM THE OTHER SIDE. A run that lost kills the
 * allowance covers is a pass, and `D == D0 - slack` is the last measurement it covers. The two arms
 * meet at that one mutant and neither pins it alone: every run the arm above judges is a regression
 * under `<` and `<=` alike, and under an allowance consulted or forgotten alike. It is the pass at
 * the boundary that reds a comparison widened by one, and the pass one kill inside it that reds a
 * comparison that dropped the allowance — which is why both examples are asserted and not one.
 *
 * THE THIRD COMPARISON IS THE FIRST ONE THE SCORE IS ALLOWED INTO, AND ONLY BECAUSE THE KILLS ARE
 * ALREADY KNOWN TO HAVE HELD. Below this line nothing that used to die is surviving, so a fallen
 * score has exactly one remaining cause — the run measured more mutants — and naming it is safe in
 * a way it was never safe above. The order is the guarantee: the same growth that explains a drop
 * here would have explained away a regression two comparisons ago, which is why it is not consulted
 * until there is no regression left for it to explain away.
 *
 * A RUN THAT LOST A KILL THE ALLOWANCE COVERS **WHILE** ITS POPULATION GREW IS THE ARM ABOVE, NOT
 * THIS ONE, and that is a ruling rather than an accident of ordering (@SCN-RAT-005 surfaced the
 * shape and asserted neither way; ruled on 2026-08-26 under @SCN-RAT-006). Its score can be far
 * below the floor, so the growth is there to be reached for. But this verdict's load-bearing
 * sentence is that no mutant which used to die now survives, and of that run the sentence is false;
 * answering with the growth would print it anyway. The allowance was also SPENT, and an allowance
 * spends in public or it does not spend at all — so the pass that must fire is the one naming the
 * kills lost and the record's own reason for tolerating them. Nothing is lost by the ruling: the
 * growth stays legible in the count pairs that pass already carries.
 *
 * AND THE LAST ARM TAKES NO CONDITION, WHICH IS WHAT MAKES THIS FUNCTION TOTAL (@SCN-RAT-008). The
 * three comparisons above leave exactly one case: kills that held, and a score that neither fell
 * nor rose. `scoreFellFrom` and `scoreRoseFrom` are the same two cross-multiplied products read the
 * two ways round, so between them they claim every inequality and EQUAL is what is left — and equal
 * is a fact about the ratio rather than about the pair, which is why the fall-through is written
 * with no condition at all. Narrowing it to "the same two counts" would leave a run of 4350/4486
 * against a record of 2175/2243 with no verdict, and a reconciler that can be handed a measurement
 * it does not answer is one whose callers must handle a case nobody named. There is no default
 * green here either: `at-baseline` is a verdict somebody wrote, with its own scenario and its own
 * message, not a shrug at the end of a chain of `if`s.
 *
 * @param record the gate's last-banked counts and the allowance stated against them
 * @param measurement the run being judged, in the same two counts
 * @param bankCommand the caller's own words for banking a measurement, carried into the verdicts
 *   that ask for it — never a script name this module invents (@SCN-RAT-006, 3F-2796)
 */
export function verdictFor(
  record: GateRecord,
  measurement: MutationMeasurement,
  bankCommand: string,
): MutationVerdict {
  if (measurement.detected < record.detected - record.allowance.mutants) {
    return measurement.total < record.total
      ? populationShrank(record, measurement)
      : regression(record, measurement);
  }
  if (measurement.detected < record.detected) {
    return withinSlack(record, measurement);
  }
  if (scoreFellFrom(record, measurement)) {
    return populationGrew(record, measurement, bankCommand);
  }
  if (scoreRoseFrom(record, measurement)) {
    return unrecordedImprovement(record, measurement, bankCommand);
  }
  return atBaseline(record, measurement);
}
