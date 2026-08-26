/**
 * Unit pin for the dating a scheduled run leaves on what it persists (@SCN-MUT-012, 3F-2774), and
 * for what it leaves when there is nothing worth dating (@SCN-MUT-013, 3F-2775).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe/it strings carry the @SCN id
 * matching features/mutation-score.feature, so a grep of either returns both halves of its pair —
 * an arm here and a step block in tests/steps/measurementPersist.steps.ts.
 *
 * THE CLOCK IS AN ARGUMENT, WHICH IS THE WHOLE REASON THIS ARM EXISTS. A run's real clock cannot
 * be placed on the far side of a window without waiting a day for it, so the moment is handed in
 * and both ages below are stated.
 *
 * AND THE MOMENT IS ASSERTED THROUGH THE READER, NEVER AGAINST A LITERAL OF THIS FILE'S OWN.
 * `artefact.ts` states the stance: a producer and a reader that agree by inspection agree until
 * the day one of them is edited, so their agreement is pinned by reading the artefact back through
 * the real reader. `freshMeasurementsOf` is the reader the restore already uses, and it is the
 * only thing in this repository that has an opinion about `measuredAt`. A date written in a
 * spelling it cannot parse reds here — where the fault is named — instead of downstream, where it
 * would be indistinguishable from a schedule that lapsed.
 *
 * WHAT THE @integration ARM ADDS INSTEAD. It runs the real persist over a planted tree: the
 * command line, the run artefact found at the path a producer left it, the parent directory of a
 * `--to` nobody has created yet, and the encoding.
 */

import { describe, it, expect } from "vitest";

import { datedArtefactOf } from "./dating.js";
import { freshMeasurementsOf } from "./freshness.js";
import type { Measurement } from "./artefact.js";

/** The window the scenario reads this artefact against — 36 hours, this repository's own. */
const WINDOW_SECONDS = 36 * 60 * 60;

/** How many milliseconds an hour is, so the ages below read in hours. */
const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

/** The moment the run measured, fixed so every age below is stated rather than waited for. */
const MEASURED_AT = new Date("2026-08-25T03:17:00Z");

/**
 * The rows a run made — TWO of them, on two different checks.
 *
 * A run has as many measurements as it has measured checks, and "persists what it measured" must
 * not come to mean "persists the last one it measured". One row cannot state that.
 */
const RUN_ROWS: readonly Measurement[] = [
  { scnId: "SCN-MSD-001", checkTag: "mutation", measured: 92.52 },
  { scnId: "SCN-MSD-002", checkTag: "coverage", measured: 88 },
];

/** The artefact a run's own producers left, in the shape `measurementArtefactWithAll` writes. */
const RUN_ARTEFACT = JSON.stringify({ measurements: RUN_ROWS });

/**
 * An artefact half-written when whatever was writing it stopped — there, and unparseable.
 *
 * A cancelled job, a killed runner, a disk that filled: the shapes differ and what a reader can do
 * with any of them is the same.
 */
const UNPARSEABLE_ARTEFACT = '{ "measurements": [ { "scnId": "SCN-MSD-001",';

/**
 * An artefact that parses, holds an array, and holds no row any reader will accept — the row is
 * missing half its address.
 *
 * THE SHAPE THAT DISCRIMINATES, and the reason this row is not the one above again. A persist that
 * copied the file across blind would carry this happily; one that reads its rows through the same
 * reader the run's own artefact is read with has nothing to carry. What the blind copy leaves is
 * an artefact that looks like a measurement and settles nothing.
 */
const NO_WELL_FORMED_ROW = JSON.stringify({
  measurements: [{ checkTag: "mutation", measured: 92.52 }],
});

/** What the run persisted, as the source a later run would read. */
function persisted(): string {
  return JSON.stringify(datedArtefactOf(RUN_ARTEFACT, MEASURED_AT));
}

/** A later run's clock, the given number of hours after the moment above. */
function hoursLater(hours: number): Date {
  return new Date(MEASURED_AT.getTime() + hours * MILLISECONDS_PER_HOUR);
}

describe("[SCN-MUT-012] datedArtefactOf", () => {
  it("persists every measurement the run made, in the order the run posted them", () => {
    expect(datedArtefactOf(RUN_ARTEFACT, MEASURED_AT)?.measurements).toEqual(RUN_ROWS);
  });

  it("dates it so a run reading it 12 hours later against a 36-hour window finds both fresh", () => {
    expect(freshMeasurementsOf(persisted(), hoursLater(12), WINDOW_SECONDS)).toEqual(RUN_ROWS);
  });

  it("dates it so a run reading it one second past that same window finds neither", () => {
    // THE OTHER SIDE IS WHAT MAKES THE FIRST ONE AN ASSERTION. Any date in the past satisfies a
    // single age, so a `measuredAt` of the epoch — or of whenever this file happened to run —
    // passes the reading above and fails here. The pair pins the moment; neither alone does.
    const oneSecondPast = new Date(hoursLater(36).getTime() + 1000);
    expect(freshMeasurementsOf(persisted(), oneSecondPast, WINDOW_SECONDS)).toEqual([]);
  });

  it("reads the run's rows through the reader that validates them, not straight off the source", () => {
    // A row missing half its address is dropped by every reader downstream, so persisting it
    // would leave a later run's ledger reconciling `missing` on a bar this artefact appeared to
    // settle — the one reading this axis exists to keep unreachable.
    const damaged = JSON.stringify({
      measurements: [{ checkTag: "mutation", measured: 92.52 }, ...RUN_ROWS],
    });
    expect(datedArtefactOf(damaged, MEASURED_AT)?.measurements).toEqual(RUN_ROWS);
  });
});

describe("[SCN-MUT-013] datedArtefactOf", () => {
  // NOTHING, RATHER THAN A DATED EMPTY ARTEFACT. Both reconcile `missing` downstream, so the
  // ledger reads the same either way and what differs is where it is said: `null` here becomes no
  // file at all on the edge above, which lets the upload stay quiet and lets the source say out
  // loud that this run measured nothing — instead of a well-formed artefact a later run silently
  // reads to zero rows.
  //
  // A DAMAGED ROW BESIDE GOOD ONES IS NOT THIS SCENARIO; it is @SCN-MUT-012's, above, where the
  // run still has something worth persisting. This is the all-or-nothing edge.

  it("has nothing to date where nothing posted a measurement at all", () => {
    expect(datedArtefactOf(undefined, MEASURED_AT)).toBeNull();
  });

  it("has nothing to date where the run's own artefact is there and unparseable", () => {
    expect(datedArtefactOf(UNPARSEABLE_ARTEFACT, MEASURED_AT)).toBeNull();
  });

  it("has nothing to date where the artefact holds no row a reader will accept", () => {
    expect(datedArtefactOf(NO_WELL_FORMED_ROW, MEASURED_AT)).toBeNull();
  });
});
