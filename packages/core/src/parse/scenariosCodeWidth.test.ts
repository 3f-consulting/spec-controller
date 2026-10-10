import { describe, it, expect, beforeEach } from "vitest";
import { countScnOccurrences, parseTaggedScenarios, parseUntaggedScenarios } from "./scenarios.js";

describe("[SCN-STG-024] a scenario tagged with a feature part outside two to five characters carries no @SCN code", () => {
  let source: string;
  beforeEach(() => {
    source = [
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
  });

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
  let source: string;
  beforeEach(() => {
    source = [
      "Feature: prose",
      "  @unit @SCN-OWN-001",
      "  Scenario: own",
      "    Given the prose mentions @SCN-A-001 and @SCN-AB-001",
      "    # and a comment mentions @SCN-FIVEC-001 and @SCN-SIXCHR-001",
    ].join("\n");
  });

  it("counts the tag and the two- and five-character mentions, and not the one- or six-character ones", () => {
    expect(countScnOccurrences(source)).toBe(3);
  });
});
