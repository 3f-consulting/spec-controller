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

  it("leaves the scenario's OTHER obligations untouched — the form goes, the tier does not", () => {
    expect(parseScenarios(retiredForm(`@unit @lint=${HANDLE}`))).toEqual([
      { scnId: "SCN-AAA-003", evidenceObligations: [{ qualityCheck: "unit" }] },
    ]);
  });
});
