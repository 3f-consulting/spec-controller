import { describe, it, expect, beforeEach } from "vitest";
import { scenarioCodeErrorsOf, type CorpusFile } from "./scenarioCodeErrors.js";
import { hasScenarioCodeErrors } from "../domain/scenarioCodeError.js";
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

  it("names the one file carrying the named code, as data and in the message (3F-3666)", () => {
    const errors = scenarioCodeErrorsOf([one, file("two", "TWO", ["SCN-TWO-001", "SCN-ONE-002"])]);
    expect(errors[0]).toMatchObject({ namedFeatureCode: "ONE", namedFeatureFiles: ["one.feature"] });
    expect(errors[0]!.message).toContain("one.feature");
  });

  it("names every file carrying the named code when two carry it (3F-3666)", () => {
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

  it("lists an out-of-class near-miss the same way (S7b): SCN-ONE-1 parses, so ONE is its class", () => {
    const errors = scenarioCodeErrorsOf([one, file("two", "TWO", ["SCN-TWO-001", "SCN-ONE-1"])]);
    expect(errors.map((e) => e.kind)).toEqual(["foreign-scn-code"]);
    expect(errors[0]!.message).toContain("SCN-ONE-1");
  });

  it("lists nothing once the id is re-coded to its own file", () => {
    expect(scenarioCodeErrorsOf([one, file("two", "TWO", ["SCN-TWO-001", "SCN-TWO-002"])])).toEqual([]);
  });

  it("lists a five-character foreign code, and not a six-character one, which is no scenario code at all (3F-3636)", () => {
    const errors = scenarioCodeErrorsOf([one, file("two", "TWO", ["SCN-TWO-001", "SCN-FIVEC-001", "SCN-SIXCHR-001"])]);
    expect(errors.map((e) => e.kind)).toEqual(["foreign-scn-code"]);
    expect(errors[0]!.message).toContain("SCN-FIVEC-001");
    expect(errors.some((e) => e.message.includes("SCN-SIXCHR-001"))).toBe(false);
  });

  it("reds the run: a reconciliation carrying one has scenario code errors, a clean or unjudged one has none", () => {
    const errors = scenarioCodeErrorsOf([one, file("two", "TWO", ["SCN-ONE-002"])]);
    expect(hasScenarioCodeErrors({ scenarioCodeErrors: errors })).toBe(true);
    expect(hasScenarioCodeErrors({ scenarioCodeErrors: [] })).toBe(false);
    expect(hasScenarioCodeErrors({})).toBe(false);
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

  it("lists nothing once one of them carries a code of its own", () => {
    expect(
      scenarioCodeErrorsOf([file("one", "ONE", ["SCN-ONE-001"]), file("two", "TWO", ["SCN-TWO-001"])])
    ).toEqual([]);
  });
});

describe("[SCN-STG-019] a feature file with no header code whose scenarios carry codes is listed as no-feature-code", () => {
  it("lists the uncoded file once, however many coded scenarios it holds", () => {
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

  it("lists nothing for an uncoded file whose scenarios carry no code", () => {
    const untagged: CorpusFile = {
      slug: "plain",
      featureCode: null,
      source: "Feature: plain\n\n  @unit\n  Scenario: s\n    Given a thing\n",
    };
    expect(scenarioCodeErrorsOf([untagged])).toEqual([]);
  });
});
