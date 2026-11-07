import { describe, it, expect, beforeEach } from "vitest";
import {
  foreignCodeCarriersOf,
  claimCodeErrorsOf,
  claimCodePopulationOf,
  type FeatureFileScenarios,
  type ForeignClaimCodeError,
} from "./scnTags.js";
import { parseScenarioTags } from "../parse/scenarioReaders.test-utils.js";

function file(slug: string, code: string | null, ids: readonly string[]): FeatureFileScenarios {
  const header = code === null ? "" : `@${code}\n`;
  const scenarios = ids.map((id, i) => `  @unit @${id}\n  Scenario: s${i}\n    Given a thing\n`).join("\n");
  return { file: `${slug}.feature`, featureCode: code, scenarios: parseScenarioTags(`${header}Feature: ${slug}\n\n${scenarios}`) };
}

describe("[CLM-STG-011] a scenario whose feature part is another file's header code is listed as foreign-claim-code, naming that file", () => {
  let one: FeatureFileScenarios;
  beforeEach(() => {
    one = file("one", "ONE", ["CLM-ONE-001"]);
  });

  it("lists the foreign id with the file that holds it and the code that file carries", () => {
    const errors = claimCodeErrorsOf([one, file("two", "TWO", ["CLM-TWO-001", "CLM-ONE-002"])]);
    expect(errors).toEqual([
      expect.objectContaining({ kind: "foreign-claim-code", files: ["two.feature"], featureCode: "TWO", claimCode: "CLM-ONE-002" }),
    ]);
  });

  it("names the code the id's feature part names, and the one file carrying it", () => {
    const errors = claimCodeErrorsOf([one, file("two", "TWO", ["CLM-TWO-001", "CLM-ONE-002"])]);
    expect(errors).toEqual([expect.objectContaining({ namedFeatureCode: "ONE", namedFeatureFiles: ["one.feature"] })]);
  });

  it("names every file carrying the named code when two carry it", () => {
    const errors = claimCodeErrorsOf([
      one,
      file("one-b", "ONE", ["CLM-ONE-003"]),
      file("two", "TWO", ["CLM-TWO-001", "CLM-ONE-002"]),
    ]);
    expect(errors.filter((e) => e.kind === "foreign-claim-code")).toEqual([
      expect.objectContaining({
        files: ["two.feature"],
        featureCode: "TWO",
        claimCode: "CLM-ONE-002",
        namedFeatureCode: "ONE",
        namedFeatureFiles: ["one.feature", "one-b.feature"],
      }),
    ]);
  });
});

describe("[CLM-STG-022] a scenario whose feature part no file's header carries offers no move to a file the corpus lacks", () => {
  function foreignOf(files: readonly FeatureFileScenarios[]): ForeignClaimCodeError {
    return claimCodeErrorsOf(files).find((e): e is ForeignClaimCodeError => e.kind === "foreign-claim-code")!;
  }

  it("carries no file for the named code, beside the file holding the scenario, its code and the misfiled code", () => {
    const foreign = foreignOf([
      file("one", "ONE", ["CLM-ONE-001"]),
      file("two", "TWO", ["CLM-TWO-001", "CLM-THR-002"]),
    ]);
    expect(foreign).toMatchObject({
      files: ["two.feature"],
      featureCode: "TWO",
      claimCode: "CLM-THR-002",
      namedFeatureCode: "THR",
      namedFeatureFiles: [],
    });
  });

  it("carries no file for the named code when the only other file using the code carries no header", () => {
    const foreign = foreignOf([
      file("thr", null, ["CLM-THR-001"]),
      file("two", "TWO", ["CLM-THR-002"]),
    ]);
    expect(foreign).toMatchObject({ files: ["two.feature"], namedFeatureCode: "THR", namedFeatureFiles: [] });
  });
});

describe("[CLM-RPT-055] a foreign code's carriers are none, or the files carrying the named code", () => {
  const foreign = (namedFeatureFiles: readonly string[]): ForeignClaimCodeError => ({
    kind: "foreign-claim-code",
    files: ["two.feature"],
    featureCode: "TWO",
    claimCode: "CLM-ONE-002",
    namedFeatureCode: "ONE",
    namedFeatureFiles,
  });

  it.each([
    { carriers: [], expected: { kind: "none" } },
    { carriers: ["one.feature"], expected: { kind: "carried", files: ["one.feature"] } },
    { carriers: ["one.feature", "uno.feature"], expected: { kind: "carried", files: ["one.feature", "uno.feature"] } },
  ])("reads $carriers.length carrying files as $expected.kind", ({ carriers, expected }) => {
    expect(foreignCodeCarriersOf(foreign(carriers))).toStrictEqual(expected);
  });
});

describe("[CLM-STG-010] two feature files carrying one header code are listed as duplicate-feature-code", () => {
  it("lists the code once, naming both files that carry it", () => {
    const errors = claimCodeErrorsOf([
      file("one", "ONE", ["CLM-ONE-001"]),
      file("one-b", "ONE", ["CLM-ONE-002"]),
    ]);
    expect(errors).toEqual([
      expect.objectContaining({ kind: "duplicate-feature-code", featureCode: "ONE", files: ["one.feature", "one-b.feature"] }),
    ]);
  });
});

describe("[CLM-STG-019] a feature file with no header code whose scenarios carry codes is listed as no-feature-code", () => {
  it("lists the no-feature-code file once, however many coded scenarios it holds", () => {
    const errors = claimCodeErrorsOf([
      file("one", "ONE", ["CLM-ONE-001"]),
      file("unc", null, ["CLM-UNC-001", "CLM-UNC-002"]),
    ]);
    expect(errors).toEqual([expect.objectContaining({ kind: "no-feature-code", files: ["unc.feature"] })]);
  });

  it("lists nothing for a file whose header and claim codes are both too long to be codes, and lists the same file once its scenario's feature part is five characters", () => {
    const headedTooLong = (claimCode: string): FeatureFileScenarios => ({
      file: "long.feature",
      featureCode: null,
      scenarios: parseScenarioTags(`@TOOLONGCODE\nFeature: long\n\n  @unit @${claimCode}\n  Scenario: s\n    Given a thing\n`),
    });
    expect(claimCodeErrorsOf([headedTooLong("CLM-TOOLONGCODE-001")])).toEqual([]);
    expect(claimCodeErrorsOf([headedTooLong("CLM-FIVEC-001")]).map((e) => e.kind)).toEqual(["no-feature-code"]);
  });
});

describe("[CLM-STG-029] a scenario tagged with two claim codes is listed as a claim code error naming both", () => {
  const twoCodes = (ids: string): FeatureFileScenarios => ({
    file: "two.feature",
    featureCode: "TWO",
    scenarios: parseScenarioTags(`@TWO\nFeature: two\n\n  @unit @CLM-TWO-001\n  Scenario: its own\n    Given a thing\n\n  @unit ${ids}\n  Scenario: carries codes\n    Given a thing\n`),
  });

  it("lists one several-claim-codes error carrying the file, the scenario and both codes", () => {
    const errors = claimCodeErrorsOf([twoCodes("@CLM-TWO-002 @CLM-TWO-003")]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      kind: "several-claim-codes",
      files: ["two.feature"],
      scenario: "carries codes",
      codes: ["CLM-TWO-002", "CLM-TWO-003"],
    });
  });

  it("lists nothing for one code, or the same code repeated", () => {
    expect(claimCodeErrorsOf([twoCodes("@CLM-TWO-002")])).toEqual([]);
    expect(claimCodeErrorsOf([twoCodes("@CLM-TWO-002 @CLM-TWO-002")])).toEqual([]);
  });
});

describe("[CLM-STG-030] a code a scenario inherits from its Rule or Feature is one of its codes, so a different code of its own makes two, and the same code makes one", () => {
  const sources = {
    Rule: (own: string) =>
      `@AAA\nFeature: alpha\n\n  @CLM-AAA-001\n  Rule: alpha behaves\n\n    @unit ${own}\n    Scenario: carries codes\n      Given a thing\n`,
    Feature: (own: string) => `@AAA @CLM-AAA-001\nFeature: alpha\n\n  @unit ${own}\n  Scenario: carries codes\n    Given a thing\n`,
  } as const;
  const underAncestor = (ancestor: keyof typeof sources, own: string): FeatureFileScenarios => ({
    file: "alpha.feature",
    featureCode: "AAA",
    scenarios: parseScenarioTags(sources[ancestor](own)),
  });

  it.each(["Rule", "Feature"] as const)(
    "a different code of its own under a %s code is one several-claim-codes error naming the file, the scenario and both codes",
    (ancestor) => {
      const errors = claimCodeErrorsOf([underAncestor(ancestor, "@CLM-AAA-002")]);
      expect(errors).toEqual([
        {
          kind: "several-claim-codes",
          files: ["alpha.feature"],
          scenario: "carries codes",
          codes: ["CLM-AAA-002", "CLM-AAA-001"],
        },
      ]);
    },
  );

  it.each(["Rule", "Feature"] as const)("the same code of its own as its %s's lists nothing", (ancestor) => {
    expect(claimCodeErrorsOf([underAncestor(ancestor, "@CLM-AAA-001")])).toEqual([]);
  });
});

describe("[CLM-STG-034] a corpus's feature files are each counted, and a header code is counted once however many files carry it", () => {
  it("counts every feature file, a file with no header code among them", () => {
    const population = claimCodePopulationOf([
      file("one", "ONE", ["CLM-ONE-001"]),
      file("two", "TWO", ["CLM-TWO-001"]),
      file("unc", null, []),
    ]);
    expect(population).toEqual({ featureFiles: 3, featureCodes: 2 });
  });

  it("counts a header code two files carry once, beside a third file's own", () => {
    const population = claimCodePopulationOf([
      file("one", "ONE", ["CLM-ONE-001"]),
      file("one-b", "ONE", ["CLM-ONE-002"]),
      file("two", "TWO", ["CLM-TWO-001"]),
    ]);
    expect(population).toEqual({ featureFiles: 3, featureCodes: 2 });
  });
});
