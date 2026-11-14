import { describe, expect, it } from "vitest";
import { featureAsWrittenFrom } from "../inputs/gherkin.js";
import { allocationOf, claimCodeErrorsOf, claimCodeFrom, featureCodeOfFile, isFeatureCode } from "./claimCodes.js";
import claimCodesVariants from "./claimCodes.variants.json" with { type: "json" };

const is = (found: boolean, what: string): string => `${found ? "be" : "not be"} a ${what}`;

// A retired scenario code counts only where allocation reads it: as the highest code seen under its feature code.
const isRetiredScenarioCode = (id: string): boolean =>
  "highestSeen" in allocationOf({ featureCode: id.split("-")[1]!, asNewFeatureCode: true }, [], [{ text: id, path: "notes.txt", line: 1 }]);

describe("an id is a feature code, a claim code or a retired scenario code only in that form", () => {
  it.each(claimCodesVariants["CLM-STG-037"].variants)("[CLM-STG-037] the id %s, checked against the feature code form, will be a feature code", (id) => {
    expect(is(isFeatureCode(id), "feature code")).toBe("be a feature code");
  });

  it.each(claimCodesVariants["CLM-STG-040"].variants)("[CLM-STG-040] the id %s, checked against the feature code form, will not be a feature code", (id) => {
    expect(is(isFeatureCode(id), "feature code")).toBe("not be a feature code");
  });

  it.each(claimCodesVariants["CLM-STG-044"].variants)("[CLM-STG-044] the id %s, checked against the claim code form, will be a claim code", (id) => {
    expect(is(claimCodeFrom(id) !== undefined, "claim code")).toBe("be a claim code");
  });

  it.each(claimCodesVariants["CLM-STG-047"].variants)("[CLM-STG-047] the id %s, checked against the claim code form, will not be a claim code", (id) => {
    expect(is(claimCodeFrom(id) !== undefined, "claim code")).toBe("not be a claim code");
  });

  it.each(claimCodesVariants["CLM-STG-049"].variants)("[CLM-STG-049] the id %s, checked against the retired scenario code form, will be a retired scenario code", (id) => {
    expect(is(isRetiredScenarioCode(id), "retired scenario code")).toBe("be a retired scenario code");
  });

  it.each(claimCodesVariants["CLM-STG-052"].variants)("[CLM-STG-052] the id %s, checked against the retired scenario code form, will not be a retired scenario code", (id) => {
    expect(is(isRetiredScenarioCode(id), "retired scenario code")).toBe("not be a retired scenario code");
  });
});

describe("a tag above Feature: will be the feature code of that file", () => {
  it("[CLM-STG-043] a feature file had the tag @ONE above Feature: ONE will be the feature code of that file", () => {
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
      "CLM-STG-055",
      "one.feature, tagged @ONE, contained a scenario tagged @CLM-ZZZ-001, and no file was tagged @ZZZ",
      "foreign-claim-code",
      [["one.feature", "@ONE", "@CLM-ZZZ-001"]],
      [{ kind: "foreign-claim-code", claimCode: { featureCode: "ZZZ", number: "001" }, file: "one.feature", filesWithItsFeatureCode: [] }],
    ],
    [
      "CLM-STG-056",
      "three.feature had no feature code, and contained a scenario tagged @CLM-ONE-002",
      "no-feature-code",
      [["three.feature", "", "@CLM-ONE-002"]],
      [{ kind: "no-feature-code", file: "three.feature" }],
    ],
    [
      "CLM-STG-057",
      "one.feature and uno.feature were both tagged @ONE",
      "duplicate-feature-code",
      [["one.feature", "@ONE", "@unit"], ["uno.feature", "@ONE", "@unit"]],
      [{ kind: "duplicate-feature-code", featureCode: "ONE", files: ["one.feature", "uno.feature"] }],
    ],
    [
      "CLM-STG-058",
      "one.feature contained a scenario tagged both @CLM-ONE-001 and @CLM-ONE-002",
      "several-claim-codes",
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
  ] as const)("[%s] %s: balance will find the error %s, naming its facts", (_clm, _given, _error, files, errors) => {
    expect(errorsIn(files, ([, , tags]) => scenarioTagged(tags))).toEqual(errors);
  });

  // How each variant writes another feature's claim code in one.feature, tagged @ONE.
  const foreignIn: Readonly<Record<string, () => string>> = {
    "as a scenario's tag": () => `${scenarioTagged("@CLM-ONE-001")}\n${scenarioTagged("@CLM-TWO-001")}`,
    "in a clm cell": () => "  @unit\n  Scenario Outline: that Outline\n    Given <x>\n\n    Examples:\n      | x | clm         |\n      | a | CLM-TWO-001 |\n",
  };

  it.each(claimCodesVariants["CLM-STG-054"].variants)("[CLM-STG-054] one.feature, tagged @ONE, contained CLM-TWO-001 %s, and two.feature was tagged @TWO: balance will find the error foreign-claim-code, naming CLM-TWO-001, one.feature, and two.feature as the file tagged @TWO", (variant) => {
    const writtenIn = foreignIn[variant];
    if (writtenIn === undefined) throw new Error(`no feature file for the variant ${variant}`);
    const written = writtenIn();

    expect(errorsIn([["one.feature", "@ONE", ""], ["two.feature", "@TWO", "@unit"]], ([file, , tags]) => (file === "one.feature" ? written : scenarioTagged(tags)))).toEqual([
      { kind: "foreign-claim-code", claimCode: { featureCode: "TWO", number: "001" }, file: "one.feature", filesWithItsFeatureCode: ["two.feature"] },
    ]);
  });

  // Where each variant tags the claim code: on the Outline, or on its Examples block.
  const taggedOn: Readonly<Record<string, readonly [outlineTags: string, examplesTags: string]>> = {
    "tagged on the Outline": ["@CLM-ONE-009", ""],
    "tagged on its Examples block": ["@unit", "@CLM-ONE-009"],
  };

  it.each(claimCodesVariants["CLM-STG-059"].variants)("[CLM-STG-059] one.feature contained an Outline with a clm column and CLM-ONE-009 %s: balance will find the error claim-code-beside-clm-column, naming one.feature, that Outline, CLM-ONE-009", (variant) => {
    const tags = taggedOn[variant];
    if (tags === undefined) throw new Error(`no tags for the variant ${variant}`);

    expect(errorsIn([["one.feature", "@ONE", ""]], () => outlineWith(...tags))).toEqual([
      { kind: "claim-code-beside-clm-column", file: "one.feature", title: "that Outline", claimCode: ONE_009 },
    ]);
  });

  it("[CLM-STG-094] one.feature contained an Outline tagged @CLM-ONE-009, with a clm column and an Examples block tagged @CLM-ONE-009: balance will find the error claim-code-beside-clm-column, naming one.feature, that Outline, and CLM-ONE-009 once", () => {
    expect(errorsIn([["one.feature", "@ONE", ""]], () => outlineWith("@CLM-ONE-009", "@CLM-ONE-009"))).toEqual([
      { kind: "claim-code-beside-clm-column", file: "one.feature", title: "that Outline", claimCode: ONE_009 },
    ]);
  });
});

const IN_THE_FILE = { path: "features/one.feature", line: 4 };

describe("the answer is one past the highest code in the feature file, a tracked file or history", () => {
  it.each([
    ["CLM-STG-061", "CLM-ONE-001", "a file git tracks, such as a workflow, contained CLM-ONE-005", "# CLM-ONE-005", "006", "CLM-ONE-005"],
    ["CLM-STG-065", "CLM-ONE-001", "a file git tracks contained SCN-ONE-, with no number", "# SCN-ONE-", "002", "CLM-ONE-001"],
    ["CLM-STG-070", "CLM-ONE-7", "nothing else contained a ONE code", "", "008", "CLM-ONE-7"],
    ["CLM-STG-071", "CLM-ONE-999", "nothing else contained a ONE code", "", "1000", "CLM-ONE-999"],
  ] as const)("[%s] a feature file tagged @ONE, with a scenario tagged @%s, and %s: the answer will be CLM-ONE-%s, noting the highest code it saw, %s, and where", (_clm, inTheFile, _elsewhere, written, number, seen) => {
    const occurrences = [{ text: `  @${inTheFile}`, ...IN_THE_FILE }, { text: written, path: ".github/workflows/ci.yml", line: 2 }];
    const allocation = allocationOf({ featureCode: "ONE", asNewFeatureCode: false }, ["ONE"], occurrences);

    expect(allocation).toEqual({
      kind: "allocated",
      claimCode: { featureCode: "ONE", number },
      highestSeen: { ...occurrences.find(({ text }) => text.includes(seen))!, text: seen },
      featureCodeAlreadyOnAFile: false,
    });
  });
});

describe("allocate gives a code only under a feature code a feature file has, unless asked for a new one", () => {
  it("[CLM-STG-077] feature files were tagged @TWO and @ONE, and none @ZZZ: the request for ZZZ will stop as an unknown feature code, give no code, and list ONE and TWO, in alphabetical order", () => {
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
  ] as const)("[%s] a feature file tagged @ONE, with a scenario tagged @CLM-ONE-003, and history that once contained CLM-OLD-007: the next code for %s, as a new feature code, will be its answer, with the note the claim names", (_clm, featureCode, answer) => {
    const occurrences = [{ text: "  @CLM-ONE-003", ...IN_THE_FILE }, { text: "CLM-OLD-007", path: "old.txt", line: 1, commit: "abc1234" }];

    expect(allocationOf({ featureCode, asNewFeatureCode: true }, ["ONE"], occurrences)).toEqual({ kind: "allocated", ...answer });
  });
});
