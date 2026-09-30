import { describe, it, expect } from "vitest";
import {
  countScnOccurrences,
  parseScenarios,
  parseTaggedScenarios,
  parseUntaggedScenarios,
  proseOnlyCodes,
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
});

describe("[SCN-RPT-015] proseOnlyCodes returns the @SCN codes mentioned in prose but never tagged anywhere", () => {
  const sourceA = [
    "@RPT @SCN-AAA-001",
    "Scenario: a tagged scenario",
    "  Given @SCN-AAA-001 is referenced again in prose (legitimate — it IS tagged)",
    "  # see also @SCN-DNG-001 — a dangling reference, never tagged",
  ].join("\n");
  const sourceB = [
    "@RPT @SCN-BBB-002",
    "Scenario: another tagged scenario",
    "  Given the rule mentions @SCN-AAA-001 (tagged in file A — not dangling)",
    "  # and @SCN-DNG-002 — dangling, never tagged anywhere",
  ].join("\n");

  it("returns only the codes that are prosed AND never tagged across the whole corpus", () => {
    expect(proseOnlyCodes([sourceA, sourceB])).toEqual([
      "SCN-DNG-001",
      "SCN-DNG-002",
    ]);
  });

  it("excludes a code tagged in ANY file even when prosed in another (cross-file union)", () => {
    expect(proseOnlyCodes([sourceA, sourceB])).not.toContain("SCN-AAA-001");
    expect(proseOnlyCodes([sourceA, sourceB])).not.toContain("SCN-BBB-002");
  });

  it("excludes a code tagged and prosed in the SAME file (not dangling)", () => {
    const single = [
      "@SCN-SAME-001",
      "Scenario: tagged and mentioned",
      "  Given @SCN-SAME-001 is also in prose here",
    ].join("\n");
    expect(proseOnlyCodes([single])).toEqual([]);
  });
});

describe("[SCN-STG-024] a scenario tagged with a feature part outside two to five characters carries no @SCN code", () => {
  const source = [
    "Feature: bounds",
    "  @unit @SCN-A-001",
    "  Scenario: one character",
    "    Given a step",
    "  @unit @SCN-AB-001",
    "  Scenario: two characters",
    "    Given a step",
    "  @unit @SCN-FIVEC-001",
    "  Scenario: five characters",
    "    Given a step",
    "  @unit @SCN-SIXCHR-001",
    "  Scenario: six characters",
    "    Given a step",
  ].join("\n");

  it("reads the two- and five-character codes as the scenarios' codes, and no other", () => {
    expect(parseTaggedScenarios(source).map((s) => s.scnId)).toEqual(["SCN-AB-001", "SCN-FIVEC-001"]);
  });

  it("leaves the one- and six-character scenarios uncoded", () => {
    expect(parseUntaggedScenarios(source)).toEqual(["one character", "six characters"]);
  });

  it("still reads a number of any width, which canon allows", () => {
    const wide = "Feature: wide\n  @unit @SCN-AB-1\n  Scenario: one digit\n    Given a step\n";
    expect(parseTaggedScenarios(wide).map((s) => s.scnId)).toEqual(["SCN-AB-1"]);
  });
});

describe("[SCN-STG-028] a prose mention of a feature part outside two to five characters is not an @SCN seen in non-tag context", () => {
  const source = [
    "Feature: prose",
    "  @unit @SCN-OWN-001",
    "  Scenario: own",
    "    Given the prose mentions @SCN-A-001 and @SCN-AB-001",
    "    # and a comment mentions @SCN-FIVEC-001 and @SCN-SIXCHR-001",
  ].join("\n");

  it("counts the tag and the two- and five-character mentions, and not the one- or six-character ones", () => {
    expect(countScnOccurrences(source)).toBe(3);
  });

  it("lists only the two- and five-character mentions as prose-only codes", () => {
    expect(proseOnlyCodes([source])).toEqual(["SCN-AB-001", "SCN-FIVEC-001"]);
  });
});
