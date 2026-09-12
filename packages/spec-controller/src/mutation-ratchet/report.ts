/**
 * THE MEASUREMENT — a gate's run, counted out of its mutation report's own mutants
 * (@SCN-MUT-007, 3F-2799, 3F-3337).
 *
 * THE RATCHET THAT RECONCILED THIS IS GONE; THE READER IS NOT (3F-3337). Its one remaining caller
 * is `tests/checks/mutationScoreCli.ts` — `pnpm mutation:score`, the producer that posts
 * SCN-FIT-002's number — which takes the two counts out of this and divides them. @SCN-MUT-007 and
 * @SCN-MUT-008 are what specify it now, and they state the same two things this file states: the
 * valid population is the killed and the timed-out over those plus the survived and the
 * never-covered, and a run with no readable report posts nothing rather than a count of zero.
 *
 * STATED, NEVER INFERRED, AND THAT IS THE WHOLE MODULE. A mutation report groups its mutants by
 * the file they were made in and gives each one a status. The metric scores two of those statuses
 * over four: the kills are the killed and the timed-out, and the population is those plus the
 * survived and the never-covered. Both sets are written down below, member by member, and the four
 * statuses left over — a mutant that would not compile, one that faulted at run time, one the run
 * was told to ignore, and one that never got as far as being tried — are in neither.
 *
 * THE LENIENT READING IS ONE SENTENCE LONG, AND IT IS WRONG. "Everything not detected is
 * undetected" reaches a population without anybody having to write a second set down, and it folds
 * all four of those statuses into the denominator. A mutant that would not compile is not a
 * survivor: nobody's assertion failed to catch it, because there was never anything there to catch.
 * So that reading answers with a score which disagrees with the one the run itself printed —
 * quietly, and in the direction of looking worse — and a reconciler holding a second opinion about
 * the very number it is reconciling has stopped being one. Naming the two sets is what makes that
 * disagreement impossible rather than merely unlikely.
 *
 * AND THE REPORT'S OWN THRESHOLDS ARE NOT READ, WHICH IS THE SAME RULING ONE ARTEFACT FURTHER OUT.
 * A report carries the thresholds its own run was configured against, and reading them would be
 * taking the runner's verdict on its own homework as the measurement. The bar lives in the record
 * (SCN-FIT-002's own row, which `stryker.config.mjs` reads back), and the report is only ever
 * asked what happened. Every figure produced here is
 * counted from the mutants; every other number in the document is left where it lies, however
 * conveniently it is shaped.
 *
 * THE COUNTS ARE TAKEN ACROSS THE WHOLE REPORT RATHER THAN A FILE OF IT. The grouping is
 * presentation and nothing more — a gate's population is every mutant under it, wherever the report
 * chose to file it. A counter that stopped at the first file would be green against every report
 * holding exactly one, which is the shape a small fixture takes by default.
 *
 * AND A REPORT THAT CANNOT BE READ, OR THAT HOLDS NO SCORED MUTANT AT ALL, IS REFUSED RATHER THAN
 * SCORED ZERO (@SCN-MUT-008). Zero is a measurement — a run that mutated the scope and killed none
 * of it — and the two must not be spelled the same, because reconciling a zero reaches a regression
 * whose message sends its reader hunting kills that in this case never happened. The refusal comes
 * back as a value rather than a throw, so a caller cannot drop it by forgetting to catch.
 *
 * NOTHING HERE NAMES A PROJECT, A CHECK, A RUNNER, A WORKFLOW OR A REPOSITORY. The shape read below
 * is the report FORMAT's, which is nobody's installation, and the gate's name arrives from the
 * caller rather than out of the document.
 */

import { existsSync, readFileSync } from "node:fs";

/**
 * One gate's measured run, in the two counts the metric is defined over.
 *
 * IT MOVED HERE FROM `verdict.ts` WHEN THE RATCHET LEFT (3F-3337), unchanged. It sat beside the
 * comparison while there was one; what produces it now is this module alone, so it sits where it
 * is made.
 *
 * TWO COUNTS AND NOT A SCORE. A measurement that arrived as a score would already have folded the
 * two events a reader has to tell apart — a kill lost, and a population that grew — into one
 * number, before any caller could look at either.
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
 * A report read: the measurement, or the reason there is not one (@SCN-MUT-008, 3F-2800).
 *
 * A REFUSAL IS A RESULT, NEVER AN EXCEPTION THE CALLER MAY FORGET TO CATCH. Reading a report is the
 * one step of this library that reaches for something outside its own arguments, so it is the one
 * step that can fail for reasons nothing in the record explains. A throw would be a fault every
 * caller has to remember to catch, and the caller who forgets reports whatever their surroundings
 * do with an uncaught one — on a good day a red nobody can read, on a bad one a step never reached.
 * Handed back as a value, the refusal is impossible to drop by omission: there is no measurement to
 * read out of it until its `ok` has been asked about.
 */
export type MutationReportRead =
  | { readonly ok: true; readonly measurement: MutationMeasurement }
  | { readonly ok: false; readonly reason: string };

/**
 * The statuses that are a kill.
 *
 * A TIMEOUT IS A KILL AND NOT A NEAR-MISS. The mutant changed the code enough that the suite never
 * finished, which is the suite noticing — the same event as an assertion firing, reached by a
 * slower road.
 */
const DETECTED: readonly string[] = ["Killed", "Timeout"];

/**
 * The statuses that are in the population and are not a kill.
 *
 * NEVER-COVERED IS COUNTED, AND THAT IS THE HALF A LENIENT READER LOSES BY LEAVING IT OUT. A mutant
 * no test reached is one this suite would not have noticed, which is precisely what the metric
 * measures; dropping it from the denominator would score untested code as though it were not there.
 */
const UNDETECTED: readonly string[] = ["Survived", "NoCoverage"];

/** One mutant, as the report files it — only its status is ever asked about here. */
interface ReportMutant {
  readonly status: string;
}

/** A refusal, as the value it is. */
function refused(reason: string): MutationReportRead {
  return { ok: false, reason };
}

/** Whatever an error carries by way of a sentence, whatever kind of thing was thrown. */
function raisedBy(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/** A JSON object — not a list, and not the null a bare `typeof` reads as one. */
function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Every mutant in the report, flattened out of the per-file grouping it arrived in — or `null`
 * where the document holds no grouping to flatten.
 *
 * THE TWO EMPTINESSES ARE NOT THE SAME AND ARE NOT ANSWERED THE SAME. `null` is a document that
 * never had a files section; an empty list is a section that holds no mutant. Told apart, one
 * reader is sent to the shape of the artefact and the other to the sweep that filled it; folded
 * together, whichever sentence was chosen sends half of them somewhere useless.
 */
function mutantsIn(document: Record<string, unknown>): readonly ReportMutant[] | null {
  const files = document["files"];
  if (!isMapping(files)) return null;
  return Object.values(files).flatMap((file) => {
    const mutants = isMapping(file) ? file["mutants"] : undefined;
    return Array.isArray(mutants) ? (mutants as readonly ReportMutant[]) : [];
  });
}

/** How many of these mutants carry a status the given set names. */
function countOf(mutants: readonly ReportMutant[], statuses: readonly string[]): number {
  return mutants.filter((mutant) => statuses.includes(mutant.status)).length;
}

/**
 * Count a gate's measurement out of its report's text, or say why there is not one.
 *
 * THE GATE IS THE CALLER'S WORD FOR IT. A report says which files were mutated and nothing about
 * which gate was being run, so a name taken from the document would be a name this module invented.
 *
 * AND SO IS THE PATH, WHICH IS CARRIED PURELY SO A REFUSAL CAN NAME IT — the same reason
 * `parseGateRecords` carries the record file's name. Text has no path of its own, and "no
 * measurement" over a path nothing writes to and "no measurement" over a sweep that never ran are
 * the same sentence with entirely different fixes.
 */
export function measurementFromReport(
  gate: string,
  text: string,
  reportPath: string,
): MutationReportRead {
  let document: unknown;
  try {
    document = JSON.parse(text);
  } catch (cause) {
    return refused(`the report at ${reportPath} is not readable JSON: ${raisedBy(cause)}`);
  }
  if (!isMapping(document)) {
    return refused(`the report at ${reportPath} is not a mutation-report document.`);
  }
  const mutants = mutantsIn(document);
  if (mutants === null) {
    return refused(`the report at ${reportPath} holds no files section.`);
  }
  const detected = countOf(mutants, DETECTED);
  const undetected = countOf(mutants, UNDETECTED);
  if (detected + undetected === 0) {
    return refused(`the report at ${reportPath} holds no scored mutant — the gate measured nothing.`);
  }
  return { ok: true, measurement: { gate, detected, total: detected + undetected } };
}

/**
 * Read a gate's measurement off the tree, refusing an absent report by the path it was sought at.
 *
 * THE PATH ARRIVES RESOLVED, AND THAT IS THE WHOLE OF THIS MODULE'S OPINION ABOUT WHERE A TREE IS.
 * A reader that joined a root of its own — its own installed location, or wherever the process
 * happened to start — is correct only while those coincide with the caller's, which they stop
 * doing the moment this ships as something another repository installs.
 */
export function readMutationReport(gate: string, reportPath: string): MutationReportRead {
  if (!existsSync(reportPath)) {
    return refused(`no report at ${reportPath} — the gate produced no score, or never ran.`);
  }
  let text: string;
  try {
    text = readFileSync(reportPath, "utf8");
  } catch (cause) {
    return refused(`the report at ${reportPath} could not be read: ${raisedBy(cause)}`);
  }
  return measurementFromReport(gate, text, reportPath);
}
