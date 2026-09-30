import { describe, it, expect } from "vitest";
import { parseScenarios } from "./scenarios.js";

describe("[SCN-LNT-007] the retired @lint=<handle> form raises no Evidence Obligation", () => {
  const HANDLE = "lint:feature-codes";

  const retiredForm = (tags: string, steps = "      Given a thing\n"): string =>
    `@FIT
Feature: fitness

  Rule: the retired form is inert

    ${tags} @SCN-AAA-003
    Scenario: a scenario still spelling the retired form
${steps}`;

  it("raises nothing — the form does not put a scenario on the fitness axis", () => {
    expect(parseScenarios(retiredForm(`@lint=${HANDLE}`))).toEqual([
      { scnId: "SCN-AAA-003", evidenceObligations: [] },
    ]);
  });

  it("raises nothing on a STEPLESS scenario either — the form is dead, not merely mis-shaped", () => {
    expect(parseScenarios(retiredForm(`@lint=${HANDLE}`, ""))).toEqual([
      { scnId: "SCN-AAA-003", evidenceObligations: [] },
    ]);
  });

  it("leaves the scenario's OTHER obligations untouched — the form goes, the tier does not", () => {
    expect(parseScenarios(retiredForm(`@unit @lint=${HANDLE}`))).toEqual([
      { scnId: "SCN-AAA-003", evidenceObligations: [{ qualityCheck: "unit" }] },
    ]);
  });

  it("takes no third argument at all — the parameter a re-routing reader would read is gone", () => {
    // @ts-expect-error — parseScenarios(source, deferralTags?) takes no third argument.
    const withWords = parseScenarios(retiredForm(`@lint=${HANDLE}`), [], new Set(["lint"]));
    expect(withWords).toEqual([{ scnId: "SCN-AAA-003", evidenceObligations: [] }]);
  });
});
