import { describe, it, expect } from "vitest";
import { parseTaggedScenarios, type TaggedScenario } from "./scenarios.js";

const tagReading = (scenarios: readonly TaggedScenario[]) =>
  scenarios.map(({ scnId, tags }) => ({ scnId, tags }));

describe("[SCN-LDG-020] parseTaggedScenarios exposes the effective tag set the obligation rule reads", () => {
  it("puts the scenario's OWN tags first, then the inherited ones, outermost first", () => {
    const source = `@AAA @integration
Feature: alpha

  @complexity
  Rule: alpha behaves

    @unit @SCN-AAA-001
    Scenario: alpha works
      Given a thing
`;

    expect(tagReading(parseTaggedScenarios(source))).toEqual([
      {
        scnId: "SCN-AAA-001",
        tags: ["unit", "SCN-AAA-001", "AAA", "integration", "complexity"],
      },
    ]);
  });

  it("keeps a scenario carrying no @SCN out of the corpus, and reports the tags bare", () => {
    const source = `@AAA
Feature: alpha

  @unit
  Scenario: alpha works
    Given a thing

  @unit @SCN-AAA-001
  Scenario: beta works
    Given another thing
`;

    expect(tagReading(parseTaggedScenarios(source))).toEqual([
      { scnId: "SCN-AAA-001", tags: ["unit", "SCN-AAA-001", "AAA"] },
    ]);
  });
});
