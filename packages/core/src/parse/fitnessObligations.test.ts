import { describe, it, expect } from "vitest";
import { parseScenarios } from "./scenarios.js";

/**
 * @unit for @SCN-LNT-007 — the retired `@lint=<handle>` form raises NOTHING, and no set of
 * registered check tags is left to re-route it through (3F-3561).
 *
 * Its home is here rather than in `scenarios.test.ts` for that file's own reason: it was near the
 * file-length ceiling then in force (retired portfolio-wide on 2026-09-18, 3F-2320).
 */
describe("[SCN-LNT-007] the retired @lint=<handle> form raises no Evidence Obligation", () => {
  /** The runnable handle the retired tag names. Never a script in this tree since 3F-3313. */
  const HANDLE = "lint:feature-codes";

  const retiredForm = (tags: string, steps = "      Given a thing\n"): string =>
    `@FIT
Feature: fitness

  Rule: the retired form is inert

    ${tags} @SCN-AAA-003
    Scenario: a scenario still spelling the retired form
${steps}`;

  it("raises nothing — the form does not put a scenario on the fitness axis", () => {
    // The re-routing trap: read the handle, put the scenario on the fitness axis, raise the
    // obligation the @fitness tag would have raised. The corpus would go on reconciling and nobody
    // would learn the form was retired.
    expect(parseScenarios(retiredForm(`@lint=${HANDLE}`))).toEqual([
      { scnId: "SCN-AAA-003", evidenceObligations: [] },
    ]);
  });

  it("raises nothing on a STEPLESS scenario either — the form is dead, not merely mis-shaped", () => {
    // A reader that had merely moved the retired form behind a steplessness gate would raise the
    // obligation here and nowhere else, which reads as retirement on the corpus this repository
    // happens to carry.
    expect(parseScenarios(retiredForm(`@lint=${HANDLE}`, ""))).toEqual([
      { scnId: "SCN-AAA-003", evidenceObligations: [] },
    ]);
  });

  it("leaves the scenario's OTHER obligations untouched — the form goes, the tier does not", () => {
    // The retired tag is inert, not poisonous: a scenario carrying it alongside a runtime tier
    // still owes that tier. A reader that dropped the whole scenario would take real obligations
    // dark, which is the false-green the deferral-tag distinction exists to keep out (3F-2351).
    expect(parseScenarios(retiredForm(`@unit @lint=${HANDLE}`))).toEqual([
      { scnId: "SCN-AAA-003", evidenceObligations: [{ qualityCheck: "unit" }] },
    ]);
  });

  it("takes no third argument at all — the parameter a re-routing reader would read is gone", () => {
    // THE PUBLISHED SIGNATURE IS THE PIN. `parseScenarios` once took the target's bare check tags
    // as its third argument, and then the target's configured fitness rows — the only places a
    // word or an entry could have re-entered the obligation rule. Neither exists: the signature is
    // `(source, deferralTags?)`, so there is nothing left to hand it.
    // @ts-expect-error — parseScenarios(source, deferralTags?) takes no third argument.
    const withWords = parseScenarios(retiredForm(`@lint=${HANDLE}`), [], new Set(["lint"]));
    expect(withWords).toEqual([{ scnId: "SCN-AAA-003", evidenceObligations: [] }]);
  });
});
