import { describe, it, expect } from "vitest";
import {
  countScnOccurrences,
  parseScenarios,
  parseUntaggedScenarios,
} from "./scenarios.js";

const asFeature = (source: string): string => `Feature: a fixture feature\n\n${source}`;

describe("[SCN-RPT-008] countScnOccurrences counts every @SCN occurrence including non-tag context", () => {
  const source = [
    "@RPT @SCN-RPT-001",
    "Scenario: a thing",
    "  Given the rule @SCN-RPT-001 is referenced again in prose",
    "  # see also @SCN-LNT-005 in a comment",
    "",
    "@unit @SCN-LDG-003",
    "Scenario: another",
  ].join("\n");

  it("counts @SCN occurrences across tag lines AND non-tag context (prose, comments)", () => {
    expect(countScnOccurrences(source)).toBe(4);
  });

  it("the delta over parseScenarios length is exactly the non-tag occurrences", () => {
    const scenarios = parseScenarios(asFeature(source)).length;
    expect(scenarios).toBe(2);
    expect(countScnOccurrences(source) - scenarios).toBe(2);
  });

  it("returns 0 for a source with no @SCN occurrences", () => {
    expect(countScnOccurrences("Feature: nothing\n  Scenario: blank")).toBe(0);
  });
});

describe("[SCN-RPT-014] parseUntaggedScenarios returns the scenarios with no @SCN tag", () => {
  const source = [
    "@UNT",
    "Feature: a fixture",
    "",
    "  Rule: a mix of tagged and untagged scenarios",
    "",
    "    @unit @SCN-UNT-001",
    "    Scenario: a tagged scenario with an anchor",
    "      Given a step",
    "",
    "    Scenario: an untagged scenario",
    "      Given a step",
    "",
    "    Scenario Outline: an untagged outline",
    "      Given <x>",
    "      Examples:",
    "        | x |",
    "        | 1 |",
    "",
    "    @SCN-UNT-002",
    "    Scenario Outline: a tagged outline",
    "      Given <y>",
    "      Examples:",
    "        | y |",
    "        | 2 |",
  ].join("\n");

  it("returns the untagged scenario + outline names, excluding the @SCN-tagged ones", () => {
    expect(parseUntaggedScenarios(asFeature(source))).toEqual([
      "an untagged scenario",
      "an untagged outline",
    ]);
  });

  it("counts Example: as a scenario but never the Examples: data table", () => {
    const ex = [
      "Feature: examples",
      "  Example: a bare example with no anchor",
      "    Given a step",
      "  @SCN-EX-001",
      "  Example: a tagged example",
      "    Given a step",
      "    Examples:",
      "      | a |",
      "      | 1 |",
    ].join("\n");
    expect(parseUntaggedScenarios(ex)).toEqual(["a bare example with no anchor"]);
  });

  it("returns nothing when every scenario carries an @SCN tag", () => {
    const allTagged = [
      "@SCN-AA-001",
      "Scenario: one",
      "  Given a step",
      "@SCN-AA-002",
      "Scenario: two",
      "  Given a step",
    ].join("\n");
    expect(parseUntaggedScenarios(allTagged)).toEqual([]);
  });

  it("reads a tag line with more than one space between its tags as tags", () => {
    const spaced = [
      "Feature: spaced tags",
      "  @unit  @SCN-AB-001",
      "  Scenario: coded on a double-spaced tag line",
      "    Given a step",
    ].join("\n");
    expect(parseUntaggedScenarios(spaced)).toEqual([]);
  });

  it("lists an untagged scenario under every header keyword, the colon followed by a space or not", () => {
    const headers = [
      "Feature: header keywords",
      "  Scenario Outline: an untagged outline",
      "    Given <x>",
      "    Examples:",
      "      | x |",
      "      | 1 |",
      "  Scenario Template: an untagged template",
      "    Given <y>",
      "    Examples:",
      "      | y |",
      "      | 2 |",
      "  Example: an untagged example",
      "    Given a step",
      "  Scenario:written hard against its colon",
      "    Given a step",
    ].join("\n");
    expect(parseUntaggedScenarios(headers)).toEqual([
      "an untagged outline",
      "an untagged template",
      "an untagged example",
      "written hard against its colon",
    ]);
  });

  it("never reads a header keyword in the middle of a step as a scenario", () => {
    const midLine = [
      "Feature: mid-line keyword",
      "  @unit @SCN-AB-001",
      "  Scenario: coded",
      "    Given the Scenario: wording appears mid-line",
    ].join("\n");
    expect(parseUntaggedScenarios(midLine)).toEqual([]);
  });

  it("lists an untagged scenario whose header follows a step citing a code", () => {
    const cited = [
      "Feature: a cited code above a header",
      "  @unit @SCN-AB-001",
      "  Scenario: coded",
      "    Given the rule @SCN-AB-001 is cited",
      "  Scenario: uncoded, straight after the cited step",
      "    Given a step",
    ].join("\n");
    expect(parseUntaggedScenarios(cited)).toEqual(["uncoded, straight after the cited step"]);
  });

  it("lists the second of two scenarios when only the first carries a code", () => {
    const pair = [
      "Feature: a coded scenario then an uncoded one",
      "  @unit @SCN-AB-001",
      "  Scenario: coded",
      "  Scenario: uncoded",
      "    Given a step",
    ].join("\n");
    expect(parseUntaggedScenarios(pair)).toEqual(["uncoded"]);
  });
});
