/**
 * THE COMPOSITION — one gate's run reconciled against its record, with every term a project owns
 * arriving from that project (@SCN-RAT-014, 3F-2804).
 *
 * FIVE TERMS, AND FOUR OF THEM ARE WHY THIS MODULE EXISTS RATHER THAN A CALLER WIRING THE PIECES
 * TOGETHER ITSELF. The reader, the report and the verdict below were each built generic, and the
 * reference implementation this library was lifted from was generic in all of them too — right up
 * to the point where something had to say WHICH tree, WHICH file, WHICH report and WHAT to type
 * next. Those four answers were written into the code there, and they are the four that arrive
 * here as a request instead.
 *
 * THE ROOT IS THE CONSUMER'S WORKSPACE, NEVER THIS MODULE'S OWN LOCATION, and that is the term
 * that fails silently rather than loudly. A module finding the tree from where it is installed
 * agrees with its caller for exactly as long as it sits beside that caller's code — which it does
 * in the repository it was written in, and stops doing the day it is installed as a dependency,
 * when it resolves into its own directory inside a package folder and finds nothing there. There
 * is no way to notice from inside: the paths are well-formed, the reads fail as absent files, and
 * a gate that measured perfectly reads as a gate that never ran. So the root arrives, and every
 * path below is joined onto it.
 *
 * THE RECORD FILE IS DEFAULTED AND THE REPORT PATH IS NOT, and the asymmetry is a ruling rather
 * than an oversight. Where a mutation sweep drops its output is a RUNNER'S convention, so a
 * default there would be this module naming a runner — the exact leak the Rule above it forbids.
 * The record's name is owned by whoever owns the record, so a conventional default costs its
 * owner nothing and a caller who wants another writes one.
 *
 * AND THE BANK-IT INSTRUCTION IS CARRIED WHOLE, because the two verdicts that ask for a record to
 * be banked have to say what to type, and what to type is a sentence only the calling project can
 * write. Left to this module it would be somebody's script name, sitting inside a message, reached
 * only on the runs nobody reads twice.
 *
 * NOTHING HERE NAMES A PROJECT, A CHECK, A RUNNER, A WORKFLOW OR A REPOSITORY, and @SCN-RAT-014
 * asserts that over this module's own bytes rather than trusting it.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { gateRecordFor, parseGateRecords } from "./record.js";
import { readMutationReport } from "./report.js";
import { noMeasurement, verdictFor, type MutationVerdict } from "./verdict.js";

/**
 * The name a record is filed under when its caller does not choose one.
 *
 * A DEFAULT, NEVER A CONSTANT THE READER GOES LOOKING FOR. Which file holds a project's bars is
 * that project's own fact, and a caller naming its own is answered by that name — this is only
 * what stands in when none is given, and it is exported so a caller happy with the convention does
 * not have to respell it and get one character of it wrong.
 */
export const RECORD_FILE = "quality-thresholds.yml";

/**
 * One reconciliation, as the calling project states it.
 *
 * EVERY FIELD IS A TERM THE PROJECT OWNS. There is nothing else here — no setting, no mode, no
 * threshold of this module's own. The bar is in the project's record and the run is in the
 * project's report; what this asks for is where those two are and what to call things.
 */
export interface RatchetRequest {
  /** The gate to reconcile, as the project's own record names it. */
  readonly gate: string;
  /**
   * The CONSUMER'S workspace — the tree the record and the report both sit in.
   *
   * Never this module's own installed location, which is the same tree only by coincidence and
   * only until the day this ships as something another repository installs.
   */
  readonly root: string;
  /**
   * Where the gate's run left its report, relative to that root.
   *
   * REQUIRED, AND THAT IS THE RULING. A default here would be a runner's output convention wearing
   * this module's name.
   */
  readonly reportPath: string;
  /** What the project's own people type to bank a measurement, carried into the verdicts that ask. */
  readonly bankCommand: string;
  /** Where the project's record sits, relative to that root. Defaults to {@link RECORD_FILE}. */
  readonly recordFile?: string;
}

/**
 * Reconcile one gate's run against the bar its project's record states.
 *
 * @param request the five terms the calling project owns
 * @returns the verdict, red or green, carrying the line its reader gets
 * @throws MalformedRecordError when the record cannot be read as a bar, or holds no such gate
 */
export function reconcileGate(request: RatchetRequest): MutationVerdict {
  const recordFile = request.recordFile ?? RECORD_FILE;
  const records = parseGateRecords(readFileSync(join(request.root, recordFile), "utf8"), recordFile);
  const record = gateRecordFor(request.gate, records, recordFile);
  const read = readMutationReport(request.gate, join(request.root, request.reportPath));

  // A refusal is carried through as the verdict it implies rather than as an absence: a report that
  // is not there is a gate that produced no score, which is not a gate that passed.
  return read.ok
    ? verdictFor(record, read.measurement, request.bankCommand)
    : noMeasurement(request.gate, read.reason);
}
