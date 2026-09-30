import { describe, it, expect } from "vitest";
import { parseErrorsIn } from "./gherkinValidation.js";

const WELL_FORMED = `@AAA
Feature: alpha

  @unit @SCN-AAA-001
  Scenario: alpha works
    Given a thing

  @unit @SCN-AAA-002
  Scenario: beta works
    Given another thing
`;

describe("[SCN-CLI-016] the Gherkin validator refuses a feature file the parser cannot read", () => {
  it("reports NO errors for well-formed Gherkin, so a healthy corpus reconciles as before", () => {
    expect(parseErrorsIn("features/target.feature", WELL_FORMED)).toEqual([]);
  });

  it("reports a parse error for a CORRUPT TAG LINE — the one-character false-green (3F-1767)", () => {
    const source = WELL_FORMED.replace("@unit @SCN-AAA-002", "@unit @SCN-AAA-002 x");

    const errors = parseErrorsIn("features/target.feature", source);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.file).toBe("features/target.feature");
    expect(errors[0]!.message).toMatch(/tag|whitespace/i);
  });

  it("reports a parse error for a CORRUPT SCENARIO KEYWORD, which the old scan could not see at all", () => {
    const source = WELL_FORMED.replace("Scenario: beta works", "Scenari0: beta works");

    const errors = parseErrorsIn("features/target.feature", source);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.message).toMatch(/expected|Scenari0/i);
  });

  it("reports a parse error for a wholly unparseable file", () => {
    const errors = parseErrorsIn("features/target.feature", "not gherkin at all {{{\n");
    expect(errors).toHaveLength(1);
    expect(errors[0]!.file).toBe("features/target.feature");
    expect(errors[0]!.message).not.toBe("");
  });

  it("reports NO error for a VALID scenario carrying no @SCN tag — that is 3F-1774, not a parse fault", () => {
    const untagged = `@AAA
Feature: alpha

  @unit @SCN-AAA-001
  Scenario: alpha works
    Given a thing

  Scenario: beta works
    Given another thing
`;
    expect(parseErrorsIn("features/target.feature", untagged)).toEqual([]);
  });
});
