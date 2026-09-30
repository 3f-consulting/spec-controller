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

  it("inherits an @SCN from the Rule — parity with cucumber, which inherits EVERY tag", () => {
    const source = `@AAA
Feature: alpha

  @unit @SCN-AAA-001
  Rule: alpha behaves

    Scenario: alpha works
      Given a thing

    Scenario: alpha also works
      Given another thing
`;
    const scenarios = parseScenarios(source);

    expect(scenarios).toHaveLength(2);
    expect(scenarios.map((s) => s.scnId)).toEqual(["SCN-AAA-001", "SCN-AAA-001"]);
  });

  it("is BYTE-IDENTICAL on a file that uses no inheritance — the regression bar", () => {
    const source = `@AAA
Feature: alpha

  @unit @integration @SCN-AAA-001
  Scenario: alpha works
    Given a thing

  @fitness @SCN-AAA-002
  Scenario: beta stays inside its threshold
`;
    expect(parseScenarios(
      source)).toEqual([
      {
        scnId: "SCN-AAA-001",
        evidenceObligations: [{ qualityCheck: "unit" }, { qualityCheck: "integration" }],
      },
      {
        scnId: "SCN-AAA-002",
        evidenceObligations: [{ qualityCheck: "fitness" }],
      },
    ]);
  });
  it("makes a duplicate scnId VISIBLE — two scenarios sharing an inherited @SCN are TWO scenarios, never deduped", () => {
    const source = `@AAA
Feature: alpha

  @unit @SCN-AAA-001
  Rule: alpha behaves

    Scenario: alpha works
      Given a thing

    Scenario: alpha also works, and NOTHING proves it
      Given another thing
`;
    const scenarios = parseScenarios(source);

    expect(scenarios).toHaveLength(2);
    expect(scenarios.map((s) => s.scnId)).toEqual(["SCN-AAA-001", "SCN-AAA-001"]);
  });

  it("THROWS on unparseable source — an empty corpus balances against anything, so it never returns one", () => {
    expect(() => parseScenarios("not gherkin at all {{{")).toThrow(/not valid Gherkin/);
  });
});
