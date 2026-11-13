import { describe, expect, it } from "vitest";
import { featureAsWrittenFrom } from "../inputs/gherkin.js";
import { claimCodeErrorsOf, claimCodeFrom, featureCodeOfFile, isFeatureCode, retiredScenarioCodeFrom } from "./claimCodes.js";

const is = (found: boolean, what: string): string => `${found ? "be" : "not be"} a ${what}`;

describe("a feature code is two to five uppercase letters or digits", () => {
  it.each([
    ["CLM-STG-037", "AB", "be a feature code"],
    ["CLM-STG-038", "ABCDE", "be a feature code"],
    ["CLM-STG-039", "A1", "be a feature code"],
    ["CLM-STG-040", "A", "not be a feature code"],
    ["CLM-STG-041", "ABCDEF", "not be a feature code"],
    ["CLM-STG-042", "abc", "not be a feature code"],
  ])("[%s] the id %s will %s", (_clm, code, result) => {
    expect(is(isFeatureCode(code), "feature code")).toBe(result);
  });
});

describe("a claim code is CLM, a feature code and a number", () => {
  it.each([
    ["CLM-STG-044", "CLM-ONE-001", "be a claim code"],
    ["CLM-STG-045", "CLM-ONE-7", "be a claim code"],
    ["CLM-STG-046", "CLM-ONE-1000", "be a claim code"],
    ["CLM-STG-047", "CLM-A-001", "not be a claim code"],
    ["CLM-STG-048", "CLM-ONE-", "not be a claim code"],
  ])("[%s] the id %s will %s", (_clm, id, result) => {
    expect(is(claimCodeFrom(id) !== undefined, "claim code")).toBe(result);
  });
});

describe("a retired scenario code is SCN, a feature code and a number", () => {
  it.each([
    ["CLM-STG-049", "SCN-ONE-001", "be a retired scenario code"],
    ["CLM-STG-050", "SCN-ONE-7", "be a retired scenario code"],
    ["CLM-STG-051", "SCN-ONE-1000", "be a retired scenario code"],
    ["CLM-STG-052", "SCN-A-001", "not be a retired scenario code"],
    ["CLM-STG-053", "SCN-ONE-", "not be a retired scenario code"],
  ])("[%s] the id %s will %s", (_clm, id, result) => {
    expect(is(retiredScenarioCodeFrom(id) !== undefined, "retired scenario code")).toBe(result);
  });
});

describe("a tag above Feature: will be the feature code of that file", () => {
  it("[CLM-STG-043] the tag @ONE above Feature: makes ONE that file's feature code", () => {
    expect(featureCodeOfFile(featureAsWrittenFrom("one.feature", "@ONE\nFeature: one\n"))).toBe("ONE");
  });
});

const ONE_009 = { featureCode: "ONE", number: "009" };

// One file per entry: its name, the tags above Feature:, and its scenario's tags or its Outline's.
type FileWritten = readonly [name: string, fileTags: string, scenario: string];

const featureText = ([, fileTags, scenario]: FileWritten): string => `${fileTags}\nFeature: a feature\n\n${scenario}`;

const scenarioTagged = (tags: string): string => `  ${tags}\n  Scenario: that scenario\n    Given a step\n`;

const outlineWith = (outlineTags: string, examplesTags: string): string =>
  `  ${outlineTags}\n  Scenario Outline: that Outline\n    Given <x>\n\n    ${examplesTags}\n    Examples:\n      | clm         | x |\n      | CLM-ONE-001 | a |\n`;

const errorsIn = (files: readonly FileWritten[], scenarioOf: (file: FileWritten) => string): unknown[] =>
  claimCodeErrorsOf(files.map((file) => featureAsWrittenFrom(file[0], featureText([file[0], file[1], scenarioOf(file)]))));

describe("balance finds no claim code error in a feature file with no feature code and no claim code", () => {
  it("[CLM-STG-091] three.feature, with no feature code and a scenario with no claim code, has no claim code error", () => {
    expect(errorsIn([["three.feature", "", "@unit"]], ([, , tags]) => scenarioTagged(tags))).toEqual([]);
  });
});

describe("a misplaced or clashing claim code will be a claim code error", () => {
  it.each([
    [
      "CLM-STG-054",
      [["one.feature", "@ONE", "@CLM-TWO-001"], ["two.feature", "@TWO", "@unit"]],
      [{ kind: "foreign-claim-code", claimCode: { featureCode: "TWO", number: "001" }, file: "one.feature", filesWithItsFeatureCode: ["two.feature"] }],
    ],
    [
      "CLM-STG-055",
      [["one.feature", "@ONE", "@CLM-ZZZ-001"]],
      [{ kind: "foreign-claim-code", claimCode: { featureCode: "ZZZ", number: "001" }, file: "one.feature", filesWithItsFeatureCode: [] }],
    ],
    ["CLM-STG-056", [["three.feature", "", "@CLM-ONE-002"]], [{ kind: "no-feature-code", file: "three.feature" }]],
    [
      "CLM-STG-057",
      [["one.feature", "@ONE", "@unit"], ["uno.feature", "@ONE", "@unit"]],
      [{ kind: "duplicate-feature-code", featureCode: "ONE", files: ["one.feature", "uno.feature"] }],
    ],
    [
      "CLM-STG-058",
      [["one.feature", "@ONE", "@CLM-ONE-001 @CLM-ONE-002"]],
      [
        {
          kind: "several-claim-codes",
          file: "one.feature",
          title: "that scenario",
          claimCodes: [{ featureCode: "ONE", number: "001" }, { featureCode: "ONE", number: "002" }],
        },
      ],
    ],
  ] as const)("[%s] the scenarios' files have their claim code error", (_clm, files, errors) => {
    expect(errorsIn(files, ([, , tags]) => scenarioTagged(tags))).toEqual(errors);
  });

  it("[CLM-STG-054] one.feature, tagged @ONE, with CLM-TWO-001 in a clm cell, and two.feature tagged @TWO, has a foreign claim code error", () => {
    const outlineCiting = "  @unit\n  Scenario Outline: that Outline\n    Given <x>\n\n    Examples:\n      | clm         | x |\n      | CLM-TWO-001 | a |\n";

    expect(errorsIn([["one.feature", "@ONE", ""], ["two.feature", "@TWO", "@unit"]], ([file, , tags]) => (file === "one.feature" ? outlineCiting : scenarioTagged(tags)))).toEqual([
      { kind: "foreign-claim-code", claimCode: { featureCode: "TWO", number: "001" }, file: "one.feature", filesWithItsFeatureCode: ["two.feature"] },
    ]);
  });

  it.each([
    ["CLM-STG-059", "the Outline", "@CLM-ONE-009", ""],
    ["CLM-STG-060", "its Examples block", "@unit", "@CLM-ONE-009"],
    ["CLM-STG-094", "both the Outline and its Examples block", "@CLM-ONE-009", "@CLM-ONE-009"],
  ])("[%s] CLM-ONE-009 tagged on %s, beside a clm column, is a claim code error naming it once", (_clm, _where, outlineTags, examplesTags) => {
    expect(errorsIn([["one.feature", "@ONE", ""]], () => outlineWith(outlineTags, examplesTags))).toEqual([
      { kind: "claim-code-beside-clm-column", file: "one.feature", title: "that Outline", claimCode: ONE_009 },
    ]);
  });
});
