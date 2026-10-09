import { describe, it, expect } from "vitest";
import { parseScenarios } from "./scenarios.js";

const fitnessScenario = `@FIT
Feature: fitness

  Rule: the tree stays inside its thresholds

    @fitness @SCN-AAA-001
    Scenario: the codebase stays under the complexity threshold
`;

describe("[SCN-LNT-018] a @fitness scenario owes one fitness obligation, from its tag, keyed by its own @SCN", () => {
  it.each([
    ["raises one obligation, at the quality check fitness, carrying nothing else"],
    ["raises it for a scenario no manifest entry names, which is the whole of 3F-3582"],
  ] as const)("%s", () => {
    expect(parseScenarios(fitnessScenario)).toEqual([
      {
        scnId: "SCN-AAA-001",
        evidenceObligations: [{ qualityCheck: "fitness" }],
      },
    ]);
  });

  it("raises it ONCE when the axis tag reaches the scenario twice", () => {
    const source = `@FIT
Feature: fitness

  @fitness
  Rule: the tree stays inside its thresholds

    @fitness @SCN-AAA-001
    Scenario: the codebase stays under the complexity threshold
`;

    expect(parseScenarios(source)).toEqual([
      {
        scnId: "SCN-AAA-001",
        evidenceObligations: [{ qualityCheck: "fitness" }],
      },
    ]);
  });

  it("raises two obligations for two @fitness scenarios, keyed apart by their own @SCNs", () => {
    const source = `@FIT
Feature: fitness

  Rule: the suites stay inside their limits

    @fitness @SCN-AAA-012
    Scenario: the unit suite finishes inside its limit

    @fitness @SCN-AAA-013
    Scenario: the behavioural suite finishes inside its limit
`;
    expect(parseScenarios(source)).toEqual([
      { scnId: "SCN-AAA-012", evidenceObligations: [{ qualityCheck: "fitness" }] },
      { scnId: "SCN-AAA-013", evidenceObligations: [{ qualityCheck: "fitness" }] },
    ]);
  });

  it("leaves the tier obligations of a fitness scenario untouched", () => {
    const source = `@FIT
Feature: fitness

  Rule: the tree stays inside its thresholds

    @unit @fitness @SCN-AAA-001
    Scenario: a check carrying a runnable example too
      Given a step
`;

    expect(parseScenarios(source)).toEqual([
      {
        scnId: "SCN-AAA-001",
        evidenceObligations: [
          { qualityCheck: "unit" },
          { qualityCheck: "fitness" },
        ],
      },
    ]);
  });
});
