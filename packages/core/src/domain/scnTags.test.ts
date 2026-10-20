import { describe, it, expect, beforeEach } from "vitest";
import {
  scenarioCodeErrorsOf,
  scenarioCodePopulationOf,
  type FeatureFileScenarios,
  type ForeignScnCodeError,
} from "./scnTags.js";
import { parseScenarioTags } from "../parse/scenarioReaders.test-utils.js";

function file(slug: string, code: string | null, ids: readonly string[]): FeatureFileScenarios {
  const header = code === null ? "" : `@${code}\n`;
  const scenarios = ids.map((id, i) => `  @unit @${id}\n  Scenario: s${i}\n    Given a thing\n`).join("\n");
  return { slug, featureCode: code, scenarios: parseScenarioTags(`${header}Feature: ${slug}\n\n${scenarios}`) };
}

describe("[SCN-STG-011] a scenario whose feature part is another file's header code is listed as foreign-scn-code, naming that file", () => {
  let one: FeatureFileScenarios;
  beforeEach(() => {
    one = file("one", "ONE", ["SCN-ONE-001"]);
  });

  it("lists the foreign id with the file that holds it and the code that file carries", () => {
    const errors = scenarioCodeErrorsOf([one, file("two", "TWO", ["SCN-TWO-001", "SCN-ONE-002"])]);
    expect(errors).toEqual([
      expect.objectContaining({ kind: "foreign-scn-code", files: ["two.feature"], featureCode: "TWO", scnId: "SCN-ONE-002" }),
    ]);
  });

  it("names the code the id's feature part names, and the one file carrying it", () => {
    const errors = scenarioCodeErrorsOf([one, file("two", "TWO", ["SCN-TWO-001", "SCN-ONE-002"])]);
    expect(errors).toEqual([expect.objectContaining({ namedFeatureCode: "ONE", namedFeatureFiles: ["one.feature"] })]);
  });

  it("names every file carrying the named code when two carry it", () => {
    const errors = scenarioCodeErrorsOf([
      one,
      file("one-b", "ONE", ["SCN-ONE-003"]),
      file("two", "TWO", ["SCN-TWO-001", "SCN-ONE-002"]),
    ]);
    expect(errors.filter((e) => e.kind === "foreign-scn-code")).toEqual([
      expect.objectContaining({
        files: ["two.feature"],
        featureCode: "TWO",
        scnId: "SCN-ONE-002",
        namedFeatureCode: "ONE",
        namedFeatureFiles: ["one.feature", "one-b.feature"],
      }),
    ]);
  });
});

describe("[SCN-STG-022] a scenario whose feature part no file's header carries offers no move to a file the corpus lacks", () => {
  function foreignOf(files: readonly FeatureFileScenarios[]): ForeignScnCodeError {
    return scenarioCodeErrorsOf(files).find((e): e is ForeignScnCodeError => e.kind === "foreign-scn-code")!;
  }

  it("carries no file for the named code, beside the file holding the scenario, its code and the misfiled code", () => {
    const foreign = foreignOf([
      file("one", "ONE", ["SCN-ONE-001"]),
      file("two", "TWO", ["SCN-TWO-001", "SCN-THR-002"]),
    ]);
    expect(foreign).toMatchObject({
      files: ["two.feature"],
      featureCode: "TWO",
      scnId: "SCN-THR-002",
      namedFeatureCode: "THR",
      namedFeatureFiles: [],
    });
  });

  it("carries no file for the named code when the only other file using the code carries no header", () => {
    const foreign = foreignOf([
      file("thr", null, ["SCN-THR-001"]),
      file("two", "TWO", ["SCN-THR-002"]),
    ]);
    expect(foreign).toMatchObject({ files: ["two.feature"], namedFeatureCode: "THR", namedFeatureFiles: [] });
  });
});

describe("[SCN-STG-010] two feature files carrying one header code are listed as duplicate-feature-code", () => {
  it("lists the code once, naming both files that carry it", () => {
    const errors = scenarioCodeErrorsOf([
      file("one", "ONE", ["SCN-ONE-001"]),
      file("one-b", "ONE", ["SCN-ONE-002"]),
    ]);
    expect(errors).toEqual([
      expect.objectContaining({ kind: "duplicate-feature-code", featureCode: "ONE", files: ["one.feature", "one-b.feature"] }),
    ]);
  });
});

describe("[SCN-STG-019] a feature file with no header code whose scenarios carry codes is listed as no-feature-code", () => {
  it("lists the no-feature-code file once, however many coded scenarios it holds", () => {
    const errors = scenarioCodeErrorsOf([
      file("one", "ONE", ["SCN-ONE-001"]),
      file("unc", null, ["SCN-UNC-001", "SCN-UNC-002"]),
    ]);
    expect(errors).toEqual([expect.objectContaining({ kind: "no-feature-code", files: ["unc.feature"] })]);
  });

  it("lists nothing for a file whose header and scenario codes are both too long to be codes, and lists the same file once its scenario's feature part is five characters", () => {
    const headedTooLong = (scnId: string): FeatureFileScenarios => ({
      slug: "long",
      featureCode: null,
      scenarios: parseScenarioTags(`@TOOLONGCODE\nFeature: long\n\n  @unit @${scnId}\n  Scenario: s\n    Given a thing\n`),
    });
    expect(scenarioCodeErrorsOf([headedTooLong("SCN-TOOLONGCODE-001")])).toEqual([]);
    expect(scenarioCodeErrorsOf([headedTooLong("SCN-FIVEC-001")]).map((e) => e.kind)).toEqual(["no-feature-code"]);
  });
});

describe("[SCN-STG-029] a scenario tagged with two scenario codes is listed as a scenario code error naming both", () => {
  const twoCodes = (ids: string): FeatureFileScenarios => ({
    slug: "two",
    featureCode: "TWO",
    scenarios: parseScenarioTags(`@TWO\nFeature: two\n\n  @unit @SCN-TWO-001\n  Scenario: its own\n    Given a thing\n\n  @unit ${ids}\n  Scenario: carries codes\n    Given a thing\n`),
  });

  it("lists one several-scn-codes error carrying the file, the scenario and both codes", () => {
    const errors = scenarioCodeErrorsOf([twoCodes("@SCN-TWO-002 @SCN-TWO-003")]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      kind: "several-scn-codes",
      files: ["two.feature"],
      scenario: "carries codes",
      codes: ["SCN-TWO-002", "SCN-TWO-003"],
    });
  });

  it("lists nothing for one code, or the same code repeated", () => {
    expect(scenarioCodeErrorsOf([twoCodes("@SCN-TWO-002")])).toEqual([]);
    expect(scenarioCodeErrorsOf([twoCodes("@SCN-TWO-002 @SCN-TWO-002")])).toEqual([]);
  });
});

describe("[SCN-STG-030] a code a scenario inherits from its Rule or Feature is one of its codes, so a different code of its own makes two, and the same code makes one", () => {
  const sources = {
    Rule: (own: string) =>
      `@AAA\nFeature: alpha\n\n  @SCN-AAA-001\n  Rule: alpha behaves\n\n    @unit ${own}\n    Scenario: carries codes\n      Given a thing\n`,
    Feature: (own: string) => `@AAA @SCN-AAA-001\nFeature: alpha\n\n  @unit ${own}\n  Scenario: carries codes\n    Given a thing\n`,
  } as const;
  const underAncestor = (ancestor: keyof typeof sources, own: string): FeatureFileScenarios => ({
    slug: "alpha",
    featureCode: "AAA",
    scenarios: parseScenarioTags(sources[ancestor](own)),
  });

  it.each(["Rule", "Feature"] as const)(
    "a different code of its own under a %s code is one several-scn-codes error naming the file, the scenario and both codes",
    (ancestor) => {
      const errors = scenarioCodeErrorsOf([underAncestor(ancestor, "@SCN-AAA-002")]);
      expect(errors).toEqual([
        {
          kind: "several-scn-codes",
          files: ["alpha.feature"],
          scenario: "carries codes",
          codes: ["SCN-AAA-002", "SCN-AAA-001"],
        },
      ]);
    },
  );

  it.each(["Rule", "Feature"] as const)("the same code of its own as its %s's lists nothing", (ancestor) => {
    expect(scenarioCodeErrorsOf([underAncestor(ancestor, "@SCN-AAA-001")])).toEqual([]);
  });
});

describe("[SCN-STG-034] a corpus's feature files are each counted, and a header code is counted once however many files carry it", () => {
  it("counts every feature file, a file with no header code among them", () => {
    const population = scenarioCodePopulationOf([
      file("one", "ONE", ["SCN-ONE-001"]),
      file("two", "TWO", ["SCN-TWO-001"]),
      file("unc", null, []),
    ]);
    expect(population).toEqual({ featureFiles: 3, featureCodes: 2 });
  });

  it("counts a header code two files carry once, beside a third file's own", () => {
    const population = scenarioCodePopulationOf([
      file("one", "ONE", ["SCN-ONE-001"]),
      file("one-b", "ONE", ["SCN-ONE-002"]),
      file("two", "TWO", ["SCN-TWO-001"]),
    ]);
    expect(population).toEqual({ featureFiles: 3, featureCodes: 2 });
  });
});
