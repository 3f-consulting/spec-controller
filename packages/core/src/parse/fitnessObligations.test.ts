import { describe, it, expect } from "vitest";
import { parseScenarios } from "./scenarios.js";
import { fitnessChecksOf } from "../domain/fitnessChecks.js";

/**
 * @unit for @SCN-LNT-007 — the retired `@lint=<handle>` form raises NOTHING, and no set of
 * registered check tags is left to re-route it through (3F-3561).
 *
 * Its home is here rather than in `scenarios.test.ts` for that file's own reason: it sits near its
 * `max-lines` ceiling, and a ceiling is not headroom.
 */
describe("[SCN-LNT-007] the retired @lint=<handle> form raises no Evidence Obligation", () => {
  /** The runnable handle the retired tag names. Never a script in this tree since 3F-3313. */
  const HANDLE = "lint:feature-codes";

  /**
   * THE ONE ROUTE LEFT THAT RAISES A FITNESS OBLIGATION, configured for the very scenario the
   * retired tag sits on — the strongest case for the form, because a re-routing reader would find
   * this row and raise its obligation. Read through core's own row reader, as a target's manifest
   * is.
   */
  const CONFIGURED = fitnessChecksOf([{ scn: "SCN-AAA-003" }]);

  const retiredForm = (tags: string, steps = "      Given a thing\n"): string =>
    `@FIT
Feature: fitness

  Rule: the retired form is inert

    ${tags} @SCN-AAA-003
    Scenario: a scenario still spelling the retired form
${steps}`;

  it("raises nothing even when a configured row names the scenario it sits on", () => {
    // The re-routing trap: read the handle, put the scenario on the fitness axis, find the row
    // configured for it, raise THAT obligation. The corpus would go on reconciling and nobody would
    // learn the form was retired.
    expect(parseScenarios(retiredForm(`@lint=${HANDLE}`), [], CONFIGURED)).toEqual([
      { scnId: "SCN-AAA-003", evidenceObligations: [] },
    ]);
  });

  it("raises nothing on a STEPLESS scenario either — the form is dead, not merely mis-shaped", () => {
    // A reader that had merely moved the retired form behind a steplessness gate would raise the
    // obligation here and nowhere else, which reads as retirement on the corpus this repository
    // happens to carry.
    expect(parseScenarios(retiredForm(`@lint=${HANDLE}`, ""), [], CONFIGURED)).toEqual([
      { scnId: "SCN-AAA-003", evidenceObligations: [] },
    ]);
  });

  it("leaves the scenario's OTHER obligations untouched — the form goes, the row does not", () => {
    // The retired tag is inert, not poisonous: a scenario carrying it alongside a runtime tier
    // still owes that tier. A reader that dropped the whole scenario would take real obligations
    // dark, which is the false-green the deferral-tag distinction exists to keep out (3F-2351).
    expect(parseScenarios(retiredForm(`@unit @lint=${HANDLE}`), [], CONFIGURED)).toEqual([
      { scnId: "SCN-AAA-003", evidenceObligations: [{ qualityCheck: "unit" }] },
    ]);
  });

  it("takes no set of registered check tags — the parameter a re-routing reader would read is gone", () => {
    // THE PUBLISHED SIGNATURE IS THE PIN. `parseScenarios` once took the target's bare check tags
    // as its third argument, which is the only place a registered word could have re-entered the
    // obligation rule. The third argument is now the configured rows, so a word list does not type.
    // @ts-expect-error — parseScenarios(source, deferralTags, fitnessChecks) takes no check-tag set.
    const withWords = parseScenarios(retiredForm(`@lint=${HANDLE}`), [], ["feature-codes"]);
    expect(withWords).toEqual([{ scnId: "SCN-AAA-003", evidenceObligations: [] }]);
  });
});
