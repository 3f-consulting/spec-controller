/**
 * The CHECK-AGNOSTIC measurement artefact — what a measurement IS, where a run posts one, and
 * what posting BESIDE an earlier one means (@SCN-CIP-009, @SCN-CIP-011).
 *
 * IN PRODUCT, BECAUSE THE RESTORE HAS TO BE LIFTABLE (3F-2763; the operator's shaping note of
 * 2026-08-25). This vocabulary was extracted out of `stepTiming.ts` into `static-checks/`
 * (3F-2754), which was the right split and the wrong side of the package boundary:
 * `static-checks/` is this repository's cobbler's-shoes directory and is not in the package's
 * published `files`, nor under the build's `rootDir`, so anything reaching into it from another
 * repository is unreachable BY CONSTRUCTION. The restore that reads a scheduled run's artefact
 * is ruled generic and liftable, so the terms it is written in moved to where a dependency can
 * reach them. `static-checks/measurementArtefact.ts` is now this module's door for the wrappers
 * that were built against it — one definition, reached from two sides.
 *
 * NOTHING HERE NAMES A CHECK, AND THAT IS THE WHOLE POINT. `checkTag` is a string this module
 * never reads for meaning; the artefact is keyed by (`@SCN`, check) and carries a number.
 * A wall-clock in seconds and a score as a percentage are the same shape to it, which lets one
 * artefact hold a run's every measured row and one reader read them all.
 *
 * THE CITATION IS HANDED IN, NOT RESOLVED. A static check's run is a script handle, so its
 * `@SCN` is found over two hops — handle to bare tag through the registry, bare tag to
 * scenario through the corpus. A measurement has no handle: canon puts the check-to-scenario
 * mapping in the runner (`double-entry-manifesto.md` → Fitness Scenario), so the producer is
 * TOLD which scenario it is measuring and the measurement arrives already citing.
 *
 * NOTHING HERE IMPORTS THE READER, AND THAT IS THE POINT OF THE TESTS AROUND IT. The artefact's
 * keys are the keys `parseMeasuredEvidenceObservations` reads, and a producer that agreed with
 * that reader by inspection would agree until the day one of them was edited. A mis-keyed row
 * is not loud — the reader drops it and the obligation reconciles `missing`, which is the one
 * reading this axis exists to keep unreachable — so the agreement is pinned by reading the
 * artefact back through the real reader, in both evidence arms.
 */

/** One row of the artefact — a measured check's number, already naming the row it posts to. */
export interface Measurement {
  /** The `@SCN` of the stepless fitness scenario this measurement answers. */
  readonly scnId: string;
  /** The bare check tag the measurement IS, naming which obligation it settles. */
  readonly checkTag: string;
  /** The number, in the units the bar above it is authored in. */
  readonly measured: number;
}

/** The artefact a run posts its measurements into, in the shape `balance --measurements` reads. */
export interface MeasurementArtefact {
  readonly measurements: readonly Measurement[];
}

/**
 * Where a run posts its measurements, relative to a repository root.
 *
 * Beneath `runs/`, which `.gitignore` excludes with no re-includes and
 * `lint:no-committed-reports` holds to it, so the artefact lives for the length of the job and
 * cannot be committed by accident.
 */
export const MEASUREMENT_ARTEFACT_PATH = "runs/self-balance/measurements.json";

/** Whether two rows answer the same thing — the @SCN naming the row and the check tag on it. */
function isTheSameRowAs(row: Measurement, measurement: Measurement): boolean {
  // Both terms, because neither is an address on its own (@SCN-LNT-012) — and each read the way
  // `parseMeasuredEvidenceObservations` reads it, since a row this rejected as different and the
  // reader accepted as the same would reach the ledger as two credits for one debit.
  const bare = (term: string): string => term.replace(/^@/, "").trim();
  return (
    bare(row.scnId) === bare(measurement.scnId) &&
    bare(row.checkTag) === bare(measurement.checkTag)
  );
}

/** Whether a row read back out of an artefact is one a producer can post beside. */
function isMeasurement(row: unknown): row is Measurement {
  if (typeof row !== "object" || row === null) return false;
  const { scnId, checkTag, measured } = row as Record<string, unknown>;
  return typeof scnId === "string" && typeof checkTag === "string" && typeof measured === "number";
}

/**
 * The well-formed rows in whatever an artefact's `measurements` key held, in artefact order.
 *
 * ROW BY ROW, like every reader at this edge. A damaged row costs itself and nothing else: the
 * obligation it would have settled reconciles `missing`, which is loud on the ledger, where one
 * bad row costing a whole artefact would be loud nowhere.
 */
export function measurementsOf(rows: unknown): Measurement[] {
  return Array.isArray(rows) ? rows.filter(isMeasurement) : [];
}

/**
 * The rows an earlier step of this run left, or none where there is nothing readable to find.
 *
 * ABSENT, EMPTY AND MALFORMED ALL READ AS NO ROWS, which is the stance every reader at this edge
 * takes rather than a shrug. Throwing would cost the step that is running now its own
 * measurement, and a row that never arrives reconciles as a step that never ran (@SCN-CIP-006) —
 * so a damaged artefact would be turned into a false verdict about a suite that plainly ran.
 */
function alreadyPostedIn(source: string | undefined): Measurement[] {
  if (source === undefined) return [];
  let posted: unknown;
  try {
    posted = JSON.parse(source);
  } catch {
    return [];
  }
  return measurementsOf((posted as { measurements?: unknown } | null)?.measurements);
}

/**
 * The artefact a run posts, carrying this measurement beside every other one the run made
 * (@SCN-CIP-011).
 *
 * ONE ARTEFACT, AS MANY CONTRIBUTING PRODUCERS AS THE RUN HAS MEASURED CHECKS, so a producer is
 * told what is already there and posts INTO it. Writing over it would leave only the last row and
 * every earlier bar reconciling missing — the reading this axis exists to keep unreachable.
 *
 * AND THE ROW IS KEYED, NOT APPENDED. A step that runs twice — a re-run, a retried job — owes its
 * bar one measurement, so it replaces its own row and nobody else's. Appending would hand the
 * reconciler two credits for a debit owed once and leave it choosing between them.
 */
export function measurementArtefactWith(
  measurement: Measurement,
  alreadyPosted: string | undefined,
): MeasurementArtefact {
  return measurementArtefactWithAll([measurement], alreadyPosted);
}

/**
 * The same posting, for a contributor that arrives with MORE THAN ONE row (3F-2763).
 *
 * A PRODUCER MEASURES ONE THING; A RESTORE CARRIES WHATEVER THE RUN IT RESTORES MEASURED. The
 * keying rule is identical and is written once here, because a second posting path deciding
 * separately which rows it replaces would replace a different set the day either was edited —
 * and the failure that produces is a duplicate credit for a debit owed once, which the ledger
 * cannot choose between.
 *
 * The incoming rows are taken as keyed already: they are one artefact's `measurements`, built by
 * whichever run posted them through this same function.
 */
export function measurementArtefactWithAll(
  measurements: readonly Measurement[],
  alreadyPosted: string | undefined,
): MeasurementArtefact {
  const others = alreadyPostedIn(alreadyPosted).filter(
    (row) => !measurements.some((measurement) => isTheSameRowAs(row, measurement)),
  );
  return { measurements: [...others, ...measurements] };
}
