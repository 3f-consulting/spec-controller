/**
 * @unit for the Gherkin validator (@SCN-CLI-016) — the declared corpus's integrity checkpoint.
 *
 * Bidirectional evidence: the describe carries the @SCN-CLI-016 id matching
 * features/cli-balance.feature and the @e2e steps in tests/steps/cliBalance.steps.ts.
 *
 * Parent: 3F-1767 (the declared-side false-green).
 */

import { describe, it, expect } from "vitest";
import { parseErrorsIn } from "./gherkinValidation.js";

/** A well-formed feature — two scenarios, both properly tagged. */
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
    // THE HEADLINE PROOF. `@unit @SCN-AAA-002 x` is not valid Gherkin — cucumber rejects it
    // ("A tag may not contain whitespace"). Under the old tag-line SCAN it was simply "not a
    // tag line", so SCN-AAA-002 vanished from the declared corpus and its failing row was
    // DELETED — an out-of-balance run read BALANCED, exit 0.
    const source = WELL_FORMED.replace("@unit @SCN-AAA-002", "@unit @SCN-AAA-002 x");

    const errors = parseErrorsIn("features/target.feature", source);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.file).toBe("features/target.feature");
    // The operator must be told WHAT broke, in the parser's own words.
    expect(errors[0]!.message).toMatch(/tag|whitespace/i);
  });

  it("reports a parse error for a CORRUPT SCENARIO KEYWORD, which the old scan could not see at all", () => {
    // `Scenari0:` is not a scenario header. The old scan had no notion of headers, so this
    // scenario was invisible: no row, no warning, exit 0. The AST refuses the file.
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
    // THE BOUNDARY that keeps this slice honest. An untagged scenario is valid Gherkin: the
    // parser accepts it, so this validator MUST NOT red it. Whether undeclarable work should
    // fail a run is a POLICY question (3F-1774), deliberately not smuggled into this bug fix.
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
