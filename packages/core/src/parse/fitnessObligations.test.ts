import { describe, it, expect } from "vitest";
import { parseScenarios } from "./scenarios.js";

/**
 * @unit for @SCN-LNT-007 — the retired `@lint=<handle>` form raises NOTHING.
 *
 * Its home is here rather than in `scenarios.test.ts` for that file's own reason: it sits at a
 * `max-lines` exception, and an exception excuses existing debt, never headroom
 * (complexity-threshold.feature). The claim also belongs beside @SCN-LNT-006's, since the two are
 * the same question asked of the two tag forms — one raises, the other no longer can.
 */
describe("[SCN-LNT-007] the retired @lint=<handle> form raises no Evidence Obligation", () => {
  /** A runnable handle the fixture registry below registers — the strongest case for the form,
   *  because a re-routing reader would find the check and raise its obligation. Registered HERE,
   *  never in the tree: since 3F-3313 no script in this repository carries this name, and the arm
   *  never depended on one (`parseScenarios`' third argument is the whole registry it reads). */
  const REGISTERED_HANDLE = "lint:feature-codes";

  const retiredForm = (tags: string, steps = "      Given a thing\n"): string =>
    `@FIT
Feature: fitness

  Rule: the retired form is inert

    ${tags} @SCN-AAA-003
    Scenario: a scenario still spelling the retired form
${steps}`;

  it("raises nothing even when the handle it names IS a registered check's script", () => {
    // The re-routing trap: read the handle, look up its check in the registry, raise THAT
    // obligation. The corpus would go on reconciling and nobody would learn the form was retired.
    // `feature-codes` is registered here and the tag names its runnable handle, so a re-routing
    // reader passes a fixture the empty expectation refuses.
    expect(parseScenarios(retiredForm(`@lint=${REGISTERED_HANDLE}`), [], ["feature-codes"])).toEqual([
      { scnId: "SCN-AAA-003", evidenceObligations: [] },
    ]);
  });

  it("raises nothing on a STEPLESS scenario either — the form is dead, not merely mis-shaped", () => {
    // A BARE tag raises its obligation from the row that carries it, steps or none (@SCN-LNT-006),
    // and the retired form raises nothing on either shape. A reader that had merely moved the
    // retired form behind a steplessness gate would raise the obligation here and nowhere else, which reads
    // as retirement on the corpus this repository happens to carry.
    expect(parseScenarios(retiredForm(`@lint=${REGISTERED_HANDLE}`, ""), [], ["feature-codes"])).toEqual([
      { scnId: "SCN-AAA-003", evidenceObligations: [] },
    ]);
  });

  it("leaves the scenario's OTHER obligations untouched — the form goes, the row does not", () => {
    // The retired tag is inert, not poisonous: a scenario carrying it alongside a runtime tier
    // still owes that tier. A reader that dropped the whole scenario would take real obligations
    // dark, which is the false-green the deferral-tag distinction exists to keep out (3F-2351).
    expect(parseScenarios(retiredForm(`@unit @lint=${REGISTERED_HANDLE}`), [], ["feature-codes"])).toEqual([
      { scnId: "SCN-AAA-003", evidenceObligations: [{ qualityCheck: "unit" }] },
    ]);
  });

  it("raises nothing for a handle nothing registers — no residual by-name reading survives", () => {
    // The other direction: under name-match the handle needed no registry at all, so an
    // unregistered one is exactly what the retired reader would still have raised.
    expect(parseScenarios(retiredForm("@lint=lint:nobody-registers-this"), [], ["feature-codes"])).toEqual([
      { scnId: "SCN-AAA-003", evidenceObligations: [] },
    ]);
  });
});
