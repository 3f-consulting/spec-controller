import { describe, it, expect, beforeEach } from "vitest";
import { scenarioCodeErrorsOf, type CorpusFile } from "./scenarioCodeErrors.js";
import { CORE_MESSAGES, CoreMessage } from "../domain/messages.js";

function file(slug: string, code: string | null, ids: readonly string[]): CorpusFile {
  const header = code === null ? "" : `@${code}\n`;
  const scenarios = ids.map((id, i) => `  @unit @${id}\n  Scenario: s${i}\n    Given a thing\n`).join("\n");
  return { slug, featureCode: code, source: `${header}Feature: ${slug}\n\n${scenarios}` };
}

describe("[SCN-STG-011] a scenario whose feature part is another file's header code is listed as foreign-scn-code, naming that file", () => {
  let one: CorpusFile;
  beforeEach(() => {
    one = file("one", "ONE", ["SCN-ONE-001"]);
  });

  it("lists the foreign id, naming the file, the id and the code the file carries", () => {
    const errors = scenarioCodeErrorsOf([one, file("two", "TWO", ["SCN-TWO-001", "SCN-ONE-002"])]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ kind: "foreign-scn-code", files: ["two.feature"] });
    expect(errors[0]!.message).toContain("SCN-ONE-002");
    expect(errors[0]!.message).toContain("@TWO");
    expect(errors[0]!.message).not.toContain("SCN-TWO-001");
  });

  it("names the one file carrying the named code, as data and in the message", () => {
    const errors = scenarioCodeErrorsOf([one, file("two", "TWO", ["SCN-TWO-001", "SCN-ONE-002"])]);
    expect(errors[0]).toMatchObject({ namedFeatureCode: "ONE", namedFeatureFiles: ["one.feature"] });
    expect(errors[0]!.message).toContain("one.feature");
  });

  it("names every file carrying the named code when two carry it", () => {
    const errors = scenarioCodeErrorsOf([
      one,
      file("one-b", "ONE", ["SCN-ONE-003"]),
      file("two", "TWO", ["SCN-TWO-001", "SCN-ONE-002"]),
    ]);
    const foreign = errors.find((e) => e.kind === "foreign-scn-code");
    expect(foreign?.namedFeatureFiles).toEqual(["one.feature", "one-b.feature"]);
    expect(foreign?.message).toContain("one.feature");
    expect(foreign?.message).toContain("one-b.feature");
    expect(foreign?.message).toBe(
      CORE_MESSAGES[CoreMessage.ForeignScnCodeManyCarriers](
        "two.feature",
        "TWO",
        "SCN-ONE-002",
        "ONE",
        2,
        "one.feature, one-b.feature"
      )
    );
  });
});

describe("[SCN-STG-022] a scenario whose feature part no file's header carries offers no move to a file the corpus lacks", () => {
  function foreignOf(files: readonly CorpusFile[]) {
    const foreign = scenarioCodeErrorsOf(files).find((e) => e.kind === "foreign-scn-code")!;
    return { foreign, namedFiles: [...new Set(foreign.message.match(/[\w-]+\.feature/g))] };
  }

  it("carries no file for the named code, and names no header tag or file the corpus lacks", () => {
    const { foreign, namedFiles } = foreignOf([
      file("one", "ONE", ["SCN-ONE-001"]),
      file("two", "TWO", ["SCN-TWO-001", "SCN-THR-002"]),
    ]);
    expect(foreign).toMatchObject({ namedFeatureCode: "THR", namedFeatureFiles: [] });
    expect(foreign.message).toContain("SCN-THR-002");
    expect(foreign.message).toContain("@TWO");
    expect(foreign.message).not.toMatch(/@THR\b/);
    expect(namedFiles).toEqual(["two.feature"]);
    expect(foreign.message).toBe(
      CORE_MESSAGES[CoreMessage.ForeignScnCodeNoCarrier]("two.feature", "TWO", "SCN-THR-002", "THR")
    );
  });

  it("says the same when the only other file using the code carries no header", () => {
    const { foreign, namedFiles } = foreignOf([
      file("thr", null, ["SCN-THR-001"]),
      file("two", "TWO", ["SCN-THR-002"]),
    ]);
    expect(foreign.namedFeatureFiles).toEqual([]);
    expect(foreign.message).not.toMatch(/@THR\b/);
    expect(namedFiles).toEqual(["two.feature"]);
    expect(foreign.message).toBe(
      CORE_MESSAGES[CoreMessage.ForeignScnCodeNoCarrier]("two.feature", "TWO", "SCN-THR-002", "THR")
    );
  });
});

describe("[SCN-STG-010] two feature files carrying one header code are listed as duplicate-feature-code", () => {
  it("lists the code once, naming both files that carry it", () => {
    const errors = scenarioCodeErrorsOf([
      file("one", "ONE", ["SCN-ONE-001"]),
      file("one-b", "ONE", ["SCN-ONE-002"]),
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ kind: "duplicate-feature-code", files: ["one.feature", "one-b.feature"] });
    expect(errors[0]!.message).toContain("@ONE");
    expect(errors[0]!.message).toContain("one.feature, one-b.feature");
  });
});

describe("[SCN-STG-019] a feature file with no header code whose scenarios carry codes is listed as no-feature-code", () => {
  it("lists the no-feature-code file once, however many coded scenarios it holds", () => {
    const errors = scenarioCodeErrorsOf([
      file("one", "ONE", ["SCN-ONE-001"]),
      file("unc", null, ["SCN-UNC-001", "SCN-UNC-002"]),
    ]);
    expect(errors).toEqual([expect.objectContaining({ kind: "no-feature-code", files: ["unc.feature"] })]);
    expect(errors[0]!.message).toBe(CORE_MESSAGES[CoreMessage.NoFeatureCode]("unc.feature"));
  });

  it("lists nothing for a file whose header and scenario codes are both too long to be codes, and lists the same file once its scenario's feature part is five characters", () => {
    const headedTooLong = (scnId: string): CorpusFile => ({
      slug: "long",
      featureCode: null,
      source: `@TOOLONGCODE\nFeature: long\n\n  @unit @${scnId}\n  Scenario: s\n    Given a thing\n`,
    });
    expect(scenarioCodeErrorsOf([headedTooLong("SCN-TOOLONGCODE-001")])).toEqual([]);
    expect(scenarioCodeErrorsOf([headedTooLong("SCN-FIVEC-001")]).map((e) => e.kind)).toEqual(["no-feature-code"]);
  });
});

describe("[SCN-STG-029] a scenario tagged with two scenario codes is listed as a scenario code error naming both", () => {
  const twoCodes = (ids: string): CorpusFile => ({
    slug: "two",
    featureCode: "TWO",
    source: `@TWO\nFeature: two\n\n  @unit @SCN-TWO-001\n  Scenario: its own\n    Given a thing\n\n  @unit ${ids}\n  Scenario: carries codes\n    Given a thing\n`,
  });

  it("lists one several-scn-codes error naming the file, the scenario and both codes", () => {
    const errors = scenarioCodeErrorsOf([twoCodes("@SCN-TWO-002 @SCN-TWO-003")]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ kind: "several-scn-codes", files: ["two.feature"] });
    expect(errors[0]!.message).toContain("two.feature");
    expect(errors[0]!.message).toContain("carries codes");
    expect(errors[0]!.message).toContain("SCN-TWO-002");
    expect(errors[0]!.message).toContain("SCN-TWO-003");
    expect(errors[0]!.message).not.toContain("SCN-TWO-001");
  });

  it("lists nothing for one code, or the same code repeated", () => {
    expect(scenarioCodeErrorsOf([twoCodes("@SCN-TWO-002")])).toEqual([]);
    expect(scenarioCodeErrorsOf([twoCodes("@SCN-TWO-002 @SCN-TWO-002")])).toEqual([]);
  });
});

describe("[SCN-STG-030] a code a scenario inherits from its Rule or Feature is one of its codes, so a different code of its own makes two, and the same code makes one", () => {
  const underAncestor = {
    Rule: (own: string): CorpusFile => ({
      slug: "alpha",
      featureCode: "AAA",
      source: `@AAA\nFeature: alpha\n\n  @SCN-AAA-001\n  Rule: alpha behaves\n\n    @unit ${own}\n    Scenario: carries codes\n      Given a thing\n`,
    }),
    Feature: (own: string): CorpusFile => ({
      slug: "alpha",
      featureCode: "AAA",
      source: `@AAA @SCN-AAA-001\nFeature: alpha\n\n  @unit ${own}\n  Scenario: carries codes\n    Given a thing\n`,
    }),
  } as const;

  it.each(["Rule", "Feature"] as const)(
    "a different code of its own under a %s code is one several-scn-codes error naming the file, the scenario and both codes",
    (ancestor) => {
      const errors = scenarioCodeErrorsOf([underAncestor[ancestor]("@SCN-AAA-002")]);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({ kind: "several-scn-codes", files: ["alpha.feature"] });
      expect(errors[0]!.message).toContain("alpha.feature");
      expect(errors[0]!.message).toContain("carries codes");
      expect(errors[0]!.message).toContain("SCN-AAA-001");
      expect(errors[0]!.message).toContain("SCN-AAA-002");
    },
  );

  it.each(["Rule", "Feature"] as const)("the same code of its own as its %s's lists nothing", (ancestor) => {
    expect(scenarioCodeErrorsOf([underAncestor[ancestor]("@SCN-AAA-001")])).toEqual([]);
  });
});
