import { describe, it, expect } from "vitest";
import {
  parseScenarios,
  parseUntaggedScenarios,
} from "./scenarios.js";

describe("[SCN-LDG-020] a scenario's named tags include the ones it inherits from its Feature and Rule", () => {
  it("inherits an evidence tier from the FEATURE — the false-green that reads BALANCED today", () => {
    const source = `@AAA @integration
Feature: alpha

  @unit @SCN-AAA-001
  Scenario: alpha works
    Given a thing
`;
    const [scenario] = parseScenarios(source);

    expect(scenario!.scnId).toBe("SCN-AAA-001");
    expect(scenario!.evidenceObligations).toEqual([
      { qualityCheck: "unit" },
      { qualityCheck: "integration" },
    ]);
  });

  it("inherits an evidence tier from an enclosing RULE", () => {
    const source = `@AAA
Feature: alpha

  @integration
  Rule: alpha behaves

    @unit @SCN-AAA-001
    Scenario: alpha works
      Given a thing
`;
    const [scenario] = parseScenarios(source);

    expect(scenario!.evidenceObligations).toEqual([
      { qualityCheck: "unit" },
      { qualityCheck: "integration" },
    ]);
  });

  it.each([
    [
      "is BYTE-IDENTICAL on a file that uses no inheritance — the regression bar",
      `@AAA
Feature: alpha

  @unit @integration @SCN-AAA-001
  Scenario: alpha works
    Given a thing

  @fitness @SCN-AAA-002
  Scenario: beta stays inside its threshold
`,
      "fitness",
    ],
    [
      "passes a Feature's tier through its Background to every scenario, and the Background is no scenario",
      `@integration
Feature: alpha

  Background:
    Given a shared precondition

  @unit @SCN-AAA-001
  Scenario: alpha works
    Given a thing

  @SCN-AAA-002
  Scenario: alpha also works
    Given another thing
`,
      "integration",
    ],
  ] as const)("%s", (_title, source, qualityCheck) => {
    expect(parseScenarios(source)).toEqual([
      {
        scnId: "SCN-AAA-001",
        evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration" }],
      },
      {
        scnId: "SCN-AAA-002",
        evidenceObligations: [{ qualityCheck }],
      },
    ]);
  });

  it.each([
    ["an empty file", ""],
    ["a file of comments only", "# alpha is not written yet\n\n# nor is beta\n"],
  ])("holds no scenario in %s, and reads it without throwing", (_label, source) => {
    expect(parseScenarios(source)).toEqual([]);
  });

  it("THROWS on unparseable source — an empty corpus balances against anything, so it never returns one", () => {
    expect(() => parseScenarios("not gherkin at all {{{")).toThrow(/not valid Gherkin/);
  });
});

describe("[SCN-LDG-039] a scenario whose @SCN it inherits from its Feature or Rule is not listed as untagged", () => {
  it.each([
    [
      "Feature",
      `@AAA @unit @SCN-AAA-001
Feature: alpha

  Scenario: the one scenario beneath it
    Given a thing
`,
      [],
    ],
    [
      "Rule",
      `@AAA
Feature: alpha

  @unit @SCN-AAA-001
  Rule: alpha behaves

    Scenario: the one scenario beneath it
      Given a thing

  Rule: beta has no code

    Scenario: a scenario no code reaches
      Given a thing
`,
      ["a scenario no code reaches"],
    ],
  ] as const)("inherited from its %s", (_ancestor, source, untagged) => {
    expect(parseScenarios(source).map(({ scnId }) => scnId)).toEqual(["SCN-AAA-001"]);
    expect(parseUntaggedScenarios(source)).toEqual(untagged);
  });
});
