import { describe, it, expect, beforeEach } from "vitest";
import { corpusCountsOfFeatures, countScnOccurrences } from "./scenarios.js";
import { parseScenarios, parseUntaggedScenarios } from "./scenarioReaders.test-utils.js";
import { parsedFeatures } from "./parsedFeatures.test-utils.js";

describe("[SCN-RPT-008] countScnOccurrences counts every @SCN occurrence including non-tag context", () => {
  let source: string;
  beforeEach(() => {
    source = [
      "@RPT @SCN-RPT-001",
      "Scenario: a thing",
      "  Given the rule @SCN-RPT-001 is referenced again in prose",
      "  # see also @SCN-LNT-005 in a comment",
      "",
      "@unit @SCN-LDG-003",
      "Scenario: another",
    ].join("\n");
  });

  it("counts @SCN occurrences across tag lines AND non-tag context (prose, comments)", () => {
    expect(countScnOccurrences(source)).toBe(4);
  });

  it("returns 0 for a source with no @SCN occurrences", () => {
    expect(countScnOccurrences("Feature: nothing\n  Scenario: blank")).toBe(0);
  });
});

describe("[SCN-RPT-008] the excluded figure counts only the @SCN codes not written as tags", () => {
  it.each([
    {
      shape: "a scenario carrying several codes, none in prose",
      source:
        "Feature: two\n\n  @unit @SCN-TWO-001\n  Scenario: one code\n    Given a step\n\n  @unit @SCN-TWO-002 @SCN-TWO-003\n  Scenario: two codes\n    Given a step\n",
      excluded: 0,
    },
    {
      shape: "a code on a Rule over three scenarios carrying none",
      source:
        "Feature: rule\n\n  @SCN-RUL-001\n  Rule: tagged\n\n    Scenario: a\n      Given a step\n\n    Scenario: b\n      Given a step\n\n    Scenario: c\n      Given a step\n",
      excluded: 0,
    },
    {
      shape: "a code on a Feature over two scenarios carrying none",
      source: "@FEA @SCN-FEA-001\nFeature: feature\n\n  Scenario: a\n    Given a step\n\n  Scenario: b\n    Given a step\n",
      excluded: 0,
    },
    {
      shape: "a code on an Examples block under a tagged Scenario Outline",
      source:
        "Feature: examples\n\n  @unit @SCN-EXA-001\n  Scenario Outline: outline\n    Given a <thing>\n\n    @SCN-EXA-002\n    Examples:\n      | thing |\n      | one   |\n",
      excluded: 0,
    },
    {
      shape: "one code in a step and one in a comment",
      source:
        "Feature: prose\n\n  @unit @SCN-PRO-001\n  Scenario: mentions\n    # see @SCN-PRO-008\n    Given the rule @SCN-PRO-009 is cited\n",
      excluded: 2,
    },
  ])("$shape", ({ source, excluded }) => {
    expect(corpusCountsOfFeatures(parsedFeatures([source])).excludedOccurrences).toBe(excluded);
  });
});

describe("[SCN-RPT-014] parseUntaggedScenarios returns the scenarios with no @SCN tag", () => {
  let source: string;
  beforeEach(() => {
    source = [
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
  });

  it("returns the untagged scenario + outline names, excluding the @SCN-tagged ones", () => {
    expect(parseUntaggedScenarios(source)).toEqual([
      "an untagged scenario",
      "an untagged outline",
    ]);
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
      "  Scenario: no-claim-code, straight after the cited step",
      "    Given a step",
    ].join("\n");
    expect(parseUntaggedScenarios(cited)).toEqual(["no-claim-code, straight after the cited step"]);
  });
});

describe("[SCN-GRD-004] a scenario tagged with two scenario codes raises no evidence obligation under either", () => {
  const source = (ids: string): string =>
    `@AAA\nFeature: a\n\n  @unit @SCN-AAA-001\n  Scenario: its own\n    Given a thing\n\n  @unit ${ids}\n  Scenario: carries codes\n    Given a thing\n`;

  it("raises obligations under neither code, and does not count the scenario as untagged", () => {
    const two = source("@SCN-AAA-002 @SCN-AAA-003");
    expect(parseScenarios(two).map((s) => s.claimCode)).toEqual(["SCN-AAA-001"]);
    expect(parseUntaggedScenarios(two)).toEqual([]);
  });

  it("raises its obligation under one code, or the same code repeated, as today", () => {
    expect(parseScenarios(source("@SCN-AAA-002"))).toEqual([
      { claimCode: "SCN-AAA-001", evidenceObligations: [{ qualityCheckKind: "unit" }] },
      { claimCode: "SCN-AAA-002", evidenceObligations: [{ qualityCheckKind: "unit" }] },
    ]);
    expect(parseScenarios(source("@SCN-AAA-002 @SCN-AAA-002")).map((s) => s.claimCode)).toEqual([
      "SCN-AAA-001",
      "SCN-AAA-002",
    ]);
  });
});
