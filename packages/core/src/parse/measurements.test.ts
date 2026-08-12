/**
 * @unit for @SCN-CIP-003 — the CREDIT half of the measured fitness check: the timing wrapper's
 * artefact read into Evidence Observations that CITE.
 *
 * Bidirectional evidence: the describe carries @SCN-CIP-003, matching features/ci-run-time.feature
 * and the @integration steps in tests/steps/ciRunTime.steps.ts.
 *
 * WHAT THIS READER DOES NOT DO. It does not resolve a citation — the measurement arrives already
 * carrying one, because the thing that measures a suite is the wrapper around the step and canon
 * puts the check-to-scenario mapping there. So there is no registry hop here and no corpus hop; the
 * two-hop seam the static axis needs is simply not on this path.
 */

import { describe, it, expect } from "vitest";

import { parseMeasuredEvidenceObservations } from "./measurements.js";

describe("[SCN-CIP-003] the timing artefact reads into citing Evidence Observations", () => {
  it("reads a measurement into one observation carrying its citation, its check and its number", () => {
    expect(
      parseMeasuredEvidenceObservations({
        measurements: [{ scnId: "SCN-MSD-001", checkTag: "ci-run-time", measured: 42.1 }],
      })
    ).toEqual([
      { qualityCheck: "lint", scnId: "SCN-MSD-001", checkTag: "ci-run-time", measured: 42.1 },
    ]);
  });

  it("carries BOTH terms of the address, not the @SCN alone", () => {
    // The @SCN-LNT-012 lesson on the new axis. A stepless scenario may carry more than one measured
    // check, so two measurements can honestly cite the same @SCN; an observation that carried only
    // the citation would be handed to whichever obligation was reached first, and the second would
    // answer nothing. Both rows below cite one scenario and must stay told apart.
    const observations = parseMeasuredEvidenceObservations({
      measurements: [
        { scnId: "SCN-MSD-001", checkTag: "ci-run-time", measured: 42.1 },
        { scnId: "SCN-MSD-001", checkTag: "coverage", measured: 91 },
      ],
    });
    expect(observations.map((o) => o.checkTag)).toEqual(["ci-run-time", "coverage"]);
    expect(observations.map((o) => o.measured)).toEqual([42.1, 91]);
  });

  it("strips a leading @ from the citation and from the check tag", () => {
    // The wrapper writes what a feature file spells. Both keys are matched bare downstream, so the
    // normalisation happens once here rather than at the reconciler, where a miss would be silent.
    expect(
      parseMeasuredEvidenceObservations({
        measurements: [{ scnId: "@SCN-MSD-001", checkTag: "@ci-run-time", measured: 42.1 }],
      })
    ).toEqual([
      { qualityCheck: "lint", scnId: "SCN-MSD-001", checkTag: "ci-run-time", measured: 42.1 },
    ]);
  });

  it("drops a row missing either term of its address", () => {
    // A measurement that cites nothing is not a suspense credit here — it is an unreadable ROW. The
    // wrapper's whole job is to stamp the citation, so a row without one is a broken artefact, and
    // inventing a suspense posting for it would report a check that ran when what actually happened
    // is that the artefact is malformed.
    expect(
      parseMeasuredEvidenceObservations({
        measurements: [
          { checkTag: "ci-run-time", measured: 42.1 },
          { scnId: "SCN-MSD-001", measured: 42.1 },
          { scnId: "", checkTag: "ci-run-time", measured: 42.1 },
          { scnId: "SCN-MSD-002", checkTag: "ci-run-time", measured: 42.1 },
        ],
      })
    ).toEqual([
      { qualityCheck: "lint", scnId: "SCN-MSD-002", checkTag: "ci-run-time", measured: 42.1 },
    ]);
  });

  it("drops a row whose measurement is not a finite, non-negative number", () => {
    // The dangerous one is NaN: every comparison against it is false, so a NaN measurement would
    // read `failing` against any ceiling and blame the suite for the artefact's fault. A negative
    // wall-clock is nonsense of the same family.
    expect(
      parseMeasuredEvidenceObservations({
        measurements: [
          { scnId: "SCN-MSD-001", checkTag: "ci-run-time", measured: Number.NaN },
          { scnId: "SCN-MSD-002", checkTag: "ci-run-time", measured: Number.POSITIVE_INFINITY },
          { scnId: "SCN-MSD-003", checkTag: "ci-run-time", measured: -1 },
          { scnId: "SCN-MSD-004", checkTag: "ci-run-time", measured: "42.1" },
          { scnId: "SCN-MSD-005", checkTag: "ci-run-time", measured: 0 },
        ],
      })
      // Zero IS a legal measurement — a step that took no measurable time still ran.
    ).toEqual([
      { qualityCheck: "lint", scnId: "SCN-MSD-005", checkTag: "ci-run-time", measured: 0 },
    ]);
  });

  it("reads an artefact with no measurements, and one with no measurements key, as nothing", () => {
    // A missing artefact contributes nothing, exactly as a missing vitest report does. What that
    // costs is not silence: every measured obligation it would have answered reads `missing`
    // (@SCN-CIP-006), which is the loud half of the same fact.
    expect(parseMeasuredEvidenceObservations({ measurements: [] })).toEqual([]);
    expect(parseMeasuredEvidenceObservations({})).toEqual([]);
    expect(parseMeasuredEvidenceObservations({ measurements: "not a list" })).toEqual([]);
  });
});
