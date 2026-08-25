/**
 * Unit pin for the freshness window (@SCN-MUT-009, 3F-2763; @SCN-MUT-010, 3F-2764).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe/it strings carry the @SCN id
 * matching features/mutation-score.feature, so a grep of either returns both halves of its pair —
 * an arm here and a step block in tests/steps/measurementRestore.steps.ts.
 *
 * THE CLOCK IS THE FIXTURE, WHICH IS THE WHOLE REASON THIS ARM EXISTS. `now` is an argument, so
 * an age can be placed exactly where a real run can never be staged — on the window's boundary,
 * a second either side of it — and the reading asserted without waiting for a day to pass.
 *
 * WHAT THE @integration ARM ADDS INSTEAD. It runs the real restore over a planted tree, which is
 * the half no argument to a pure function reaches: the command line, the file found where the
 * scheduled run left it, the posting BESIDE what this run already measured, and the restored row
 * read back through the reader that reconciles it.
 */

import { describe, it, expect } from "vitest";

import { freshMeasurementsOf } from "./freshness.js";
import type { Measurement } from "./artefact.js";

/** The window this repository's own restore is wired with — 36 hours against a nightly sweep. */
const WINDOW_SECONDS = 36 * 60 * 60;

/**
 * A SECOND CONSUMER'S WINDOW — roughly 26 hours, which is what 3F-2748 gives an adopter's repository's nightly at
 * 03:41 UTC against the 03:17 this repository's own sweep runs at.
 *
 * It is here because one window cannot state this rule. A reader holding 36 hours instead of
 * reading the argument it was handed satisfies every assertion written against 36 hours, and the
 * two readers are indistinguishable until somebody with a different cadence lifts the file. So the
 * arm below hands it a window this repository does not use, at an age this repository's own window
 * would have called fresh.
 */
const NARROWER_WINDOW_SECONDS = 26 * 60 * 60;

/** This run's clock, fixed so every age below is stated rather than measured. */
const NOW = new Date("2026-08-25T12:00:00Z");

/** The rows a scheduled run left, whose content the window has no opinion about. */
const PERSISTED_ROWS: readonly Measurement[] = [
  { scnId: "SCN-MSD-001", checkTag: "mutation", measured: 92.52 },
  { scnId: "SCN-MSD-002", checkTag: "coverage", measured: 88 },
];

/** The artefact a scheduled run persisted, dated the given number of seconds before NOW. */
function persistedSecondsAgo(seconds: number): string {
  return JSON.stringify({
    measuredAt: new Date(NOW.getTime() - seconds * 1000).toISOString(),
    measurements: PERSISTED_ROWS,
  });
}

describe("[SCN-MUT-009] freshMeasurementsOf", () => {
  it("hands back every row of an artefact measured inside the window", () => {
    expect(freshMeasurementsOf(persistedSecondsAgo(12 * 60 * 60), NOW, WINDOW_SECONDS)).toEqual(
      PERSISTED_ROWS,
    );
  });

  it("counts an artefact measured exactly on the window as still inside it", () => {
    // AT THE BAR IS NOT PAST IT, the reading @SCN-CIP-004 and @SCN-MUT-004 already take of a
    // threshold. The off-by-one here is silent in both directions: a run that measured on the
    // boundary is either reported or dropped, and nothing else in the pipeline can tell which.
    expect(freshMeasurementsOf(persistedSecondsAgo(WINDOW_SECONDS), NOW, WINDOW_SECONDS)).toEqual(
      PERSISTED_ROWS,
    );
  });

  it("drops the rows of an artefact measured a second past the window", () => {
    expect(
      freshMeasurementsOf(persistedSecondsAgo(WINDOW_SECONDS + 1), NOW, WINDOW_SECONDS),
    ).toEqual([]);
  });

  it("reads an undated artefact as one nothing can vouch for", () => {
    // THE LOUD DEFAULT IS THE ONE THAT REDS. A measurement with no date is not a fresh one — it
    // is one whose age nobody can state, and treating an absent date as "recent enough" would
    // reconcile this push against a tree that may never have been measured at all.
    const undated = JSON.stringify({ measurements: PERSISTED_ROWS });
    expect(freshMeasurementsOf(undated, NOW, WINDOW_SECONDS)).toEqual([]);
  });

  it("reads a date it cannot parse the same way it reads no date at all", () => {
    const misdated = JSON.stringify({ measuredAt: "last night", measurements: PERSISTED_ROWS });
    expect(freshMeasurementsOf(misdated, NOW, WINDOW_SECONDS)).toEqual([]);
  });

  it("hands back nothing where there is no artefact to read", () => {
    // Absent, empty and unparseable are three faults arriving as one question, and all three are
    // the same answer here: this run has no measurement to post. What that is worth is the
    // ledger's — the row reads missing, exactly as a sweep that never ran.
    expect(freshMeasurementsOf(undefined, NOW, WINDOW_SECONDS)).toEqual([]);
    expect(freshMeasurementsOf("", NOW, WINDOW_SECONDS)).toEqual([]);
    expect(freshMeasurementsOf("{ not json", NOW, WINDOW_SECONDS)).toEqual([]);
  });

  it("drops a row of a fresh artefact that is missing half its address", () => {
    // A fresh artefact is not a well-formed one. Both terms of the address are load-bearing
    // (@SCN-LNT-012), and a row missing either would be dropped by the reader downstream anyway —
    // so it is dropped here, where the run can still say what it posted.
    const damaged = JSON.stringify({
      measuredAt: NOW.toISOString(),
      measurements: [{ checkTag: "mutation", measured: 92.52 }, PERSISTED_ROWS[0]],
    });
    expect(freshMeasurementsOf(damaged, NOW, WINDOW_SECONDS)).toEqual([PERSISTED_ROWS[0]]);
  });
});

describe("[SCN-MUT-010] freshMeasurementsOf", () => {
  it("hands back nothing at all from an artefact older than the window it was given", () => {
    // NOT A DIMINISHED ROW, and not a zero. There is one honest report of a measurement that has
    // aged out, and it is the absence of one: the bar it would have settled then reconciles
    // `missing` — no measurement arrived — which is the ledger's existing word for it and is why
    // this axis costs no eleventh Outcome.
    expect(freshMeasurementsOf(persistedSecondsAgo(37 * 60 * 60), NOW, WINDOW_SECONDS)).toEqual([]);
  });

  it("drops rows against a narrower window that a wider one would have kept", () => {
    // THE WHOLE OF WHAT THIS ARM ADDS. Thirty hours is inside 36 and outside 26, so this reading
    // exists only if the window that was passed in is the window that was read. A reader holding
    // this repository's own 36 hours hands back both rows here and the assertion reds — which is
    // the failure a single-window pin cannot see.
    expect(
      freshMeasurementsOf(persistedSecondsAgo(30 * 60 * 60), NOW, NARROWER_WINDOW_SECONDS),
    ).toEqual([]);
  });

  it("reads a window of no seconds at all as the window it was given", () => {
    // A window of zero is a caller saying "only a measurement taken by this run counts", which is
    // a coherent thing to ask for and is also the value every falsy-defaulting read turns back
    // into whatever constant it was written beside. Pinned so that reading cannot be introduced.
    expect(freshMeasurementsOf(persistedSecondsAgo(1), NOW, 0)).toEqual([]);
  });
});
