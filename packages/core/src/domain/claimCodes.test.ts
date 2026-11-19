import { describe, expect, it } from "vitest";
import { featureAsWrittenFrom } from "../inputs/gherkin.js";
import { allocationOf, claimCodeErrorsOf, claimCodeFrom, featureCodeOfFile, isFeatureCode } from "./claimCodes.js";

const is = (found: boolean, what: string): string => `${found ? "be" : "not be"} a ${what}`;

describe("an id is a feature code or a claim code only in that form", () => {
  it.each([
    ["CLM-STG-037", "AB", "be a feature code"],
    ["CLM-STG-038", "ABCDE", "be a feature code"],
    ["CLM-STG-039", "A1", "be a feature code"],
    ["CLM-STG-040", "A", "not be a feature code"],
    ["CLM-STG-041", "ABCDEF", "not be a feature code"],
    ["CLM-STG-042", "abc", "not be a feature code"],
  ])("[%s] the id %s, checked against the feature code form, will %s", (_clm, code, result) => {
    expect(is(isFeatureCode(code), "feature code")).toBe(result);
  });

  it.each([
    ["CLM-STG-044", "CLM-ONE-001", "be a claim code"],
    ["CLM-STG-045", "CLM-ONE-7", "be a claim code"],
    ["CLM-STG-046", "CLM-ONE-1000", "be a claim code"],
    ["CLM-STG-047", "CLM-A-001", "not be a claim code"],
    ["CLM-STG-048", "CLM-ONE-", "not be a claim code"],
  ])("[%s] the id %s, checked against the claim code form, will %s", (_clm, id, result) => {
    expect(is(claimCodeFrom(id) !== undefined, "claim code")).toBe(result);
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

describe("balance finds no claim code error in feature files with no feature code and no claim code", () => {
  it("[CLM-STG-091] three.feature and four.feature, each with no feature code and a scenario with no claim code, have no claim code error", () => {
    expect(
      errorsIn(
        [
          ["three.feature", "", "@unit"],
          ["four.feature", "", "@unit"],
        ],
        ([, , tags]) => scenarioTagged(tags),
      ),
    ).toEqual([]);
  });
});

describe("a claim code in an Examples cell of an Outline with no clm column is no claim code error", () => {
  it("[CLM-STG-096] one.feature, tagged @ONE, with an Outline with no clm column and an Examples cell CLM-TWO-001, has no claim code error", () => {
    const outline = "  @unit\n  Scenario Outline: that Outline\n    Given <code>\n\n    Examples:\n      | code        |\n      | CLM-TWO-001 |\n";

    expect(errorsIn([["one.feature", "@ONE", ""]], () => outline)).toEqual([]);
  });
});

describe("a misplaced or clashing claim code will be a claim code error", () => {
  it.each([
    [
      "CLM-STG-054",
      [["one.feature", "@ONE", "@CLM-ONE-001;@CLM-TWO-001"], ["two.feature", "@TWO", "@unit"]],
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
    expect(errorsIn(files, ([, , tags]) => tags.split(";").map(scenarioTagged).join("\n"))).toEqual(errors);
  });

  it("[CLM-STG-095] one.feature, tagged @ONE, with CLM-TWO-001 in its Outline's clm column, and two.feature tagged @TWO, has a foreign claim code error", () => {
    const outlineCiting = "  @unit\n  Scenario Outline: that Outline\n    Given <x>\n\n    Examples:\n      | x | clm         |\n      | a | CLM-TWO-001 |\n";

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

const IN_THE_FILE = { path: "features/one.feature", line: 4 };

describe("the answer is one past the highest code in the feature file, a tracked file or history", () => {
  it.each([
    ["CLM-STG-061", "@CLM-ONE-001", "# CLM-ONE-005", "006", "CLM-ONE-005"],
    ["CLM-STG-063", "@CLM-ONE-001", "# SCN-ONE-005", "006", "SCN-ONE-005"],
    ["CLM-STG-065", "@CLM-ONE-001", "# SCN-ONE-", "002", "CLM-ONE-001"],
    ["CLM-STG-070", "@CLM-ONE-7", "", "008", "CLM-ONE-7"],
    ["CLM-STG-071", "@CLM-ONE-999", "", "1000", "CLM-ONE-999"],
  ] as const)("[%s] a feature file tagged @ONE with a scenario tagged %s, and a tracked file holding %j, gives CLM-ONE-%s, noting %s", (_clm, inTheFile, elsewhere, number, seen) => {
    const occurrences = [{ text: `  ${inTheFile}`, ...IN_THE_FILE }, { text: elsewhere, path: ".github/workflows/ci.yml", line: 2 }];
    const allocation = allocationOf({ featureCode: "ONE", asNewFeatureCode: false }, ["ONE"], occurrences);

    expect(allocation).toEqual({
      kind: "allocated",
      claimCode: { featureCode: "ONE", number },
      highestSeen: { ...occurrences.find(({ text }) => text.includes(seen))!, text: seen },
      featureCodeAlreadyOnAFile: false,
    });
  });
});

describe("allocate refuses a feature code no feature file has, and lists those that have one", () => {
  it("[CLM-STG-077] feature files tagged @TWO and @ONE, and no file mentioning ZZZ, stop the request for ZZZ as an unknown feature code listing ONE and TWO, in alphabetical order", () => {
    expect(allocationOf({ featureCode: "ZZZ", asNewFeatureCode: false }, ["TWO", "ONE"], [{ text: "  @CLM-ONE-001", ...IN_THE_FILE }])).toEqual({
      kind: "unknown-feature-code",
      featureCode: "ZZZ",
      featureCodes: ["ONE", "TWO"],
    });
  });
});

describe("a request for a new feature code gives the next code for any well-formed one", () => {
  it.each([
    ["CLM-STG-080", "ZZ", { claimCode: { featureCode: "ZZ", number: "001" }, featureCodeAlreadyOnAFile: false }],
    ["CLM-STG-081", "ONE", { claimCode: { featureCode: "ONE", number: "004" }, highestSeen: { text: "CLM-ONE-003", ...IN_THE_FILE }, featureCodeAlreadyOnAFile: true }],
    ["CLM-STG-082", "OLD", { claimCode: { featureCode: "OLD", number: "008" }, highestSeen: { text: "CLM-OLD-007", path: "old.txt", line: 1, commit: "abc1234" }, featureCodeAlreadyOnAFile: false }],
  ] as const)("[%s] a feature file tagged @ONE with @CLM-ONE-003, and history once holding CLM-OLD-007, give %s as a new feature code its answer", (_clm, featureCode, answer) => {
    const occurrences = [{ text: "  @CLM-ONE-003", ...IN_THE_FILE }, { text: "CLM-OLD-007", path: "old.txt", line: 1, commit: "abc1234" }];

    expect(allocationOf({ featureCode, asNewFeatureCode: true }, ["ONE"], occurrences)).toEqual({ kind: "allocated", ...answer });
  });
});
