import { describe, it, expect } from "vitest";
import {
  parseScenarios,
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

  it("does NOT invent a phantom scenario from a tag block above a Rule — the over-read (operator: give it teeth)", () => {
    const source = `@AAA
Feature: alpha

  @unit @SCN-AAA-001
  Rule: alpha behaves

    @SCN-AAA-002
    Scenario: alpha works
      Given a thing
`;
    const scenarios = parseScenarios(source);

    expect(scenarios).toHaveLength(1);
    expect(scenarios[0]!.scnId).toBe("SCN-AAA-002");
    expect(scenarios[0]!.evidenceObligations).toEqual([{ qualityCheck: "unit" }]);
  });

  it("inherits a FITNESS obligation and a community deferral tag, like any other tag", () => {
    const fitnessSource = `@AAA @fitness
Feature: alpha

  @SCN-AAA-001
  Scenario: alpha stays inside its threshold
`;
    expect(parseScenarios(
      fitnessSource)[0]!.evidenceObligations).toEqual([
      { qualityCheck: "fitness" },
    ]);

    const deferredSource = `@AAA @wip
Feature: alpha

  @unit @SCN-AAA-001
  Scenario: alpha works
    Given a thing
`;
    expect(parseScenarios(deferredSource, ["wip"])[0]!.evidenceObligations).toEqual([
      { qualityCheck: "unit", pending: true },
    ]);
  });

  it.each([
    [
      "inherits an @SCN from the Rule — parity with cucumber, which inherits EVERY tag",
      `@AAA
Feature: alpha

  @unit @SCN-AAA-001
  Rule: alpha behaves

    Scenario: alpha works
      Given a thing

    Scenario: alpha also works
      Given another thing
`,
    ],
    [
      "makes a duplicate scnId VISIBLE — two scenarios sharing an inherited @SCN are TWO scenarios, never deduped",
      `@AAA
Feature: alpha

  @unit @SCN-AAA-001
  Rule: alpha behaves

    Scenario: alpha works
      Given a thing

    Scenario: alpha also works, and NOTHING proves it
      Given another thing
`,
    ],
  ] as const)("%s", (_title, source) => {
    const scenarios = parseScenarios(source);

    expect(scenarios).toHaveLength(2);
    expect(scenarios.map((s) => s.scnId)).toEqual(["SCN-AAA-001", "SCN-AAA-001"]);
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
