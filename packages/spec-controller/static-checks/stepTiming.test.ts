/**
 * Unit pin for the timing wrapper's pure half (@SCN-CIP-009, 3F-2738; @SCN-CIP-010, 3F-2739;
 * @SCN-CIP-011, 3F-2740; @SCN-CIP-012, 3F-2741).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe/it strings carry the @SCN ids
 * matching features/ci-run-time.feature, so a grep of either returns both halves of its pair —
 * an arm here and a step block in tests/steps/stepTiming.steps.ts.
 *
 * THE ASSERTION GOES THROUGH THE REAL READER, never against a literal of this file's own.
 * `{ measurements: [{ scnId, checkTag, measured }] }` written out here and read by eye over
 * there is two copies of one shape, and the failure they hide is silent: a mis-keyed row is
 * dropped by the reader and its obligation reconciles `missing`, so a producer that had
 * drifted would look exactly like a step that never ran. Reading the artefact back through
 * `parseMeasuredEvidenceObservations` is the only form of this pin that cannot pass while the
 * two halves disagree.
 *
 * WHAT THIS ARM ADDS OVER THE @integration ONE. That arm spawns the wrapper and so proves the
 * whole seam — argument parse, spawn, clock, write — over one measurement it cannot choose.
 * This one chooses the numbers, which is what lets the seconds conversion be pinned at the
 * edges a real run never reaches: a step too fast to register and one long enough to round
 * up a whole second. The band boundaries are the same case sharpened — a run over its trigger
 * and under its gate is a suite crossing 60 seconds, which no scenario can afford to stage.
 */

import { describe, it, expect } from "vitest";

import {
  parseMeasuredEvidenceObservations,
  type MeasuredEvidenceObservation,
} from "@3f-consulting/spec-controller-core/internal";

import {
  exitCodeOf,
  measuredSecondsOf,
  timingArtefactWith,
  timingBandOf,
  timingReport,
  triggerFor,
  type StepMeasurement,
  type TimingArtefact,
} from "./stepTiming.js";

describe("[SCN-CIP-009] a timed step's measurement carries the @SCN and check tag it was given", () => {
  it("[SCN-CIP-009] the artefact it posts reads back as one Evidence Observation, citing and naming", () => {
    const artefact = timingArtefactWith(
      {
        scnId: "SCN-MSD-001",
        checkTag: "ci-run-time",
        measured: 21.4,
      },
      undefined,
    );

    // Through JSON, because that is the only form the artefact ever reaches the reader in — an
    // in-memory object would pass over a `readonly` array or a key the serialiser drops.
    const observations = parseMeasuredEvidenceObservations(
      JSON.parse(JSON.stringify(artefact)) as { measurements?: unknown },
    );

    expect(observations).toHaveLength(1);
    // BOTH terms, because neither is an address on its own (@SCN-LNT-012): the @SCN says which
    // row the credit posts to, the check tag says which of that row's obligations it answers.
    expect(observations[0]).toEqual({
      qualityCheck: "lint",
      scnId: "SCN-MSD-001",
      checkTag: "ci-run-time",
      measured: 21.4,
    });
  });

  it("[SCN-CIP-009] a wall-clock span becomes the seconds the ceiling above it is authored in", () => {
    // Milliseconds reaching the artefact unconverted is the failure worth naming: 21437 against
    // a ceiling of 75 reds a suite that came in at a third of its bar, and the report would be
    // right about the number and wrong about the run.
    expect(measuredSecondsOf(21_437)).toBe(21.4);
    expect(measuredSecondsOf(150_960)).toBe(151);
    expect(measuredSecondsOf(0)).toBe(0);
  });
});

describe("[SCN-CIP-010] the wrapped command's exit code is the wrapper's", () => {
  it("[SCN-CIP-010] a command that exited hands its own code out, whichever code it was", () => {
    // Seven, and not the 1 a "did it red?" assertion would be satisfied by. A wrapper that
    // flattened every failure onto one code would pass that assertion while losing the reading
    // CI takes back — 2 is this wrapper's own usage fault, so a suite genuinely exiting 2 and a
    // wrapper called wrongly would become the same log line.
    expect(exitCodeOf({ status: 7, signal: null })).toBe(7);
    expect(exitCodeOf({ status: 0, signal: null })).toBe(0);
  });

  it("[SCN-CIP-010] a command that never exited is never answered for with a zero", () => {
    // 128 + 9, the shell's own arithmetic for SIGKILL — a suite the runner cut off mid-run is a
    // failed suite, and the wrapper says so in the spelling every CI log reader already knows.
    expect(exitCodeOf({ status: null, signal: "SIGKILL" })).toBe(137);
    // Neither field: the command could not be started at all. Its cause is the caller's to find;
    // the one reading that must be unreachable is the one that greens the build.
    expect(exitCodeOf({ status: null, signal: null })).not.toBe(0);
  });
});

describe("[SCN-CIP-011] a second timed step's measurement lands beside the first", () => {
  it("[SCN-CIP-011] a step answering a different scenario posts beside the row already there", () => {
    const posted = timingArtefactWith(
      { scnId: "SCN-MSD-002", checkTag: "ci-run-time", measured: 68.2 },
      serialised(timingArtefactWith(unitSuite(21.4), undefined)),
    );

    expect(observationsIn(posted).map((row) => [row.scnId, row.measured])).toEqual([
      ["SCN-MSD-001", 21.4],
      ["SCN-MSD-002", 68.2],
    ]);
  });

  it("[SCN-CIP-011] a step running twice replaces its own row and posts no second one", () => {
    const posted = timingArtefactWith(
      unitSuite(24.9),
      serialised(timingArtefactWith(unitSuite(21.4), undefined)),
    );

    // TWO ROWS ANSWERING ONE DEBIT is the reading the key exists to keep unreachable: the
    // reconciler is handed two credits for a row owed once and has to choose between them.
    expect(observationsIn(posted)).toHaveLength(1);
    expect(observationsIn(posted)[0]!.measured).toBe(24.9);
  });

  it("[SCN-CIP-011] a row spelled with a leading @ is the same row, not a second one", () => {
    // The reader strips the @ before it reads either term, so two spellings of one address would
    // reconcile as two credits — the split this key exists to prevent, arriving through the
    // spelling rather than through the re-run.
    const posted = timingArtefactWith(
      unitSuite(24.9),
      serialised({
        measurements: [{ scnId: "@SCN-MSD-001", checkTag: "@ci-run-time", measured: 21.4 }],
      }),
    );

    expect(observationsIn(posted)).toHaveLength(1);
    expect(observationsIn(posted)[0]!.measured).toBe(24.9);
  });

  it("[SCN-CIP-011] an artefact that is absent, empty or malformed is read as no rows at all", () => {
    // THROWING HERE WOULD COST THE STEP ITS MEASUREMENT, and a step whose row never arrives
    // reconciles as a step that never ran (@SCN-CIP-006) — the wrapper would turn a damaged
    // artefact into a false verdict about a suite that plainly ran. Every reader at this edge
    // drops what it cannot read instead; the producer takes the same stance.
    for (const damaged of ["", "   ", "not json at all", "null", '{"measurements":"nonsense"}']) {
      expect(observationsIn(timingArtefactWith(unitSuite(21.4), damaged))).toEqual(
        observationsIn(timingArtefactWith(unitSuite(21.4), undefined)),
      );
    }
  });
});

describe("[SCN-CIP-012] a run reads its measurement against its trigger and its gate", () => {
  it("[SCN-CIP-012] the trigger is the authored ceiling divided by the portfolio's variance margin", () => {
    // The two ceilings this repository will author, and the two anchors canon states for them
    // (fitness-functions.md → The CI run-time thresholds). Written into the manifest beside the
    // ceilings these could drift apart; derived, a wrong trigger is a wrong gate and says so.
    expect(triggerFor(75)).toBe(60);
    expect(triggerFor(150)).toBe(120);
  });

  it("[SCN-CIP-012] a measurement at or under the trigger is inside it, and one just over is not", () => {
    // AT the trigger is inside it, the same at-or-below the ledger reads its ceiling with. Two
    // comparisons disagreeing on their boundary would put a run in one band on the report and
    // the other on the ledger, and the report is the thing a person acts on.
    expect(timingBandOf(60, 75)).toBe("inside-trigger");
    expect(timingBandOf(60.1, 75)).toBe("inside-variance");
  });

  it("[SCN-CIP-012] a measurement at the gate is in the variance band, and one over it is over", () => {
    // The gate is a ceiling, so a run sitting exactly on it has not exceeded it (@SCN-CIP-004).
    expect(timingBandOf(75, 75)).toBe("inside-variance");
    expect(timingBandOf(75.1, 75)).toBe("over-gate");
  });

  it("[SCN-CIP-012] a pair with no configured ceiling is given none here either", () => {
    // `thresholdFor`'s null, carried rather than improved on. A default invented here would put
    // a band on the line nobody chose — and Infinity would print every un-ceilinged run as
    // inside its trigger, which is the reading @SCN-CIP-002 exists to keep loud.
    expect(timingBandOf(96.4, null)).toBe("no-threshold");
  });

  it("[SCN-CIP-012] the report carries the measurement, both numbers, and the band it landed in", () => {
    const inside = timingReport(unitSuite(21.4), 75);
    expect(inside).toContain("21.4");
    expect(inside).toContain("60");
    expect(inside).toContain("75");
    // Both terms of the address, because a job with two timed steps prints two of these lines.
    expect(inside).toContain("SCN-MSD-001");
    expect(inside).toContain("ci-run-time");
    expect(inside).toContain("inside the trigger");
  });

  it("[SCN-CIP-012] over the trigger and under the gate says out loud that it is still green", () => {
    // THE LINE THE WHOLE TWO-LEVEL MODEL EXISTS FOR. This run reds nothing and the ledger will
    // reconcile it satisfied, so the report is the only place the crossed anchor can be read —
    // and a report that named the band without saying the build is fine would be read as a
    // failure nobody could find.
    const variance = timingReport(unitSuite(64.2), 75);
    expect(variance).toContain("over the trigger");
    expect(variance).toContain("still green");
  });

  it("[SCN-CIP-012] over the gate is named as such, and the verdict is left to the ledger", () => {
    const over = timingReport(unitSuite(96.4), 75);
    expect(over).toContain("over the gate");
    expect(over).toContain("96.4");
    // A wrapper holding both the number and the bar it is judged against would be grading its
    // own homework, so the line says where the verdict is settled rather than settling it.
    expect(over).toContain("ledger");
  });

  it("[SCN-CIP-012] an un-ceilinged pair still has its measurement printed, and the absence named", () => {
    const unceilinged = timingReport(unitSuite(21.4), null);
    expect(unceilinged).toContain("21.4");
    expect(unceilinged).toContain("no threshold is configured");
  });
});

/** One suite's row, at whatever it measured — the address is what these arms hold constant. */
function unitSuite(measured: number): StepMeasurement {
  return { scnId: "SCN-MSD-001", checkTag: "ci-run-time", measured };
}

/** An artefact as a later step finds it: the text the wrapper left on disk, not an object. */
function serialised(artefact: TimingArtefact): string {
  return `${JSON.stringify(artefact, null, 2)}\n`;
}

/** What the artefact is worth to the ledger, read back through the reader `--timings` uses. */
function observationsIn(artefact: TimingArtefact): MeasuredEvidenceObservation[] {
  return parseMeasuredEvidenceObservations(
    JSON.parse(JSON.stringify(artefact)) as { measurements?: unknown },
  );
}
