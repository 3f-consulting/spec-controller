import { describe, it, expect } from "vitest";
import { parseScenarios } from "./scenarios.js";

describe("[SCN-LNT-018] a @fitness scenario raises one fitness obligation, from its tag, keyed by its own @SCN", () => {

  it("leaves the tier obligations of a @fitness scenario untouched", () => {
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
