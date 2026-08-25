/**
 * THE MEASUREMENT READER — the measurement artefact read into citing Evidence Observations
 * (@SCN-CIP-003).
 *
 * The third evidence stream, and it belongs to neither of the other two. A runtime credit is read
 * from a runner's result JSON; a static credit is read from a target's CI config and manifest. A
 * measurement is neither a test result nor a fact about the tree: it is what the wrapper around a
 * timed step measured while the step ran, and nothing else in the pipeline is in a position to
 * know it.
 *
 * THE ARTEFACT:
 *
 *     { "measurements": [ { "scnId": "SCN-CIP-001", "checkTag": "ci-run-time", "measured": 42.1 } ] }
 *
 * NO CITATION IS RESOLVED HERE, and that is the shape of the axis rather than an omission. The
 * static axis needs two hops — script handle to bare tag through the registry, bare tag to scenario
 * through the corpus — because a run of a script does not know what it is FOR. A measurement does:
 * canon puts the check-to-scenario mapping in the runner that measures (`double-entry-manifesto.md`
 * → Fitness Scenario), so the credit arrives already carrying both terms and this reader only has
 * to read them.
 *
 * TOLERANT ROW BY ROW, like every reader at this edge. A malformed row is dropped rather than
 * thrown on: the run's job is to produce a verdict, and one bad row costing the whole verdict is
 * loud nowhere, while a dropped measurement is loud on the ledger as the obligation it leaves
 * unanswered (@SCN-CIP-006).
 */

import type { MeasuredEvidenceObservation } from "../model.js";

/** The measurement artefact, as the reader takes it — validated row by row below. */
export interface MeasurementReport {
  measurements?: unknown;
}

/** Strip a leading `@`, so an artefact may spell either term the way a feature file does. */
function bare(value: unknown): string {
  return typeof value === "string" ? value.replace(/^@/, "").trim() : "";
}

/** A measurement is a finite, non-negative number. Zero is legal — a step can take no time. */
function isMeasurement(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/**
 * Read the artefact into one `MeasuredEvidenceObservation` per well-formed row, in artefact order.
 *
 * A ROW MISSING EITHER TERM OF ITS ADDRESS IS DROPPED, NOT SENT TO SUSPENSE. An uncited STATIC
 * credit is a real and meaningful fact — a check ran that no scenario names — and suspense is where
 * it belongs. A measurement without a citation is a different thing: stamping the citation is the
 * wrapper's whole job, so a row without one says the artefact is broken, not that a check went
 * unattributed. Posting it to suspense would report a check as having run uncited when what
 * actually happened is that its row could not be read.
 *
 * A NaN MEASUREMENT IS DROPPED FOR A SHARPER REASON. Every comparison against NaN is false, so
 * `measured <= threshold` is false and the row would read `failing` — blaming an honestly-fast
 * suite for a fault in the artefact that measured it.
 */
export function parseMeasuredEvidenceObservations(
  report: MeasurementReport
): MeasuredEvidenceObservation[] {
  const rows = Array.isArray(report.measurements) ? report.measurements : [];
  const observations: MeasuredEvidenceObservation[] = [];
  for (const row of rows) {
    if (typeof row !== "object" || row === null) continue;
    const { scnId: rawScn, checkTag: rawTag, measured } = row as Record<string, unknown>;
    const scnId = bare(rawScn);
    const checkTag = bare(rawTag);
    if (scnId === "" || checkTag === "" || !isMeasurement(measured)) continue;
    observations.push({ qualityCheck: "lint", scnId, checkTag, measured });
  }
  return observations;
}
