/**
 * The scenario code errors a corpus carries (3F-3635) — each rule over real feature-file text,
 * read the way the ingest edge hands it over: slug, header code and source.
 */

import { describe, it, expect } from "vitest";
import { scenarioCodeErrorsOf, type CorpusFile } from "./scenarioCodeErrors.js";
import { hasScenarioCodeErrors } from "../domain/scenarioCodeError.js";

/** A feature file headed `@<code>` (or uncoded when `code` is null) holding one scenario per id. */
function file(slug: string, code: string | null, ids: readonly string[]): CorpusFile {
  const header = code === null ? "" : `@${code}\n`;
  const scenarios = ids.map((id, i) => `  @unit @${id}\n  Scenario: s${i}\n    Given a thing\n`).join("\n");
  return { slug, featureCode: code, source: `${header}Feature: ${slug}\n\n${scenarios}` };
}

describe("[SCN-STG-011] a scenario whose feature part is not its file's header code is listed as foreign-scn-code", () => {
  const one = file("one", "ONE", ["SCN-ONE-001"]);

  it("lists the foreign id, naming the file, the id and the code the file carries", () => {
    const errors = scenarioCodeErrorsOf([one, file("two", "TWO", ["SCN-TWO-001", "SCN-ONE-002"])]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ kind: "foreign-scn-code", files: ["two.feature"] });
    expect(errors[0]!.message).toContain("SCN-ONE-002");
    expect(errors[0]!.message).toContain("@TWO");
    // The scenario that agrees with its file is not convicted with it.
    expect(errors[0]!.message).not.toContain("SCN-TWO-001");
  });

  it("lists an out-of-class near-miss the same way (S7b): SCN-ONE-1 parses, so ONE is its class", () => {
    const errors = scenarioCodeErrorsOf([one, file("two", "TWO", ["SCN-TWO-001", "SCN-ONE-1"])]);
    expect(errors.map((e) => e.kind)).toEqual(["foreign-scn-code"]);
    expect(errors[0]!.message).toContain("SCN-ONE-1");
  });

  it("lists nothing once the id is re-coded to its own file", () => {
    expect(scenarioCodeErrorsOf([one, file("two", "TWO", ["SCN-TWO-001", "SCN-TWO-002"])])).toEqual([]);
  });

  it("does not see an id whose feature code it cannot parse — a Named limit, 3F-3636", () => {
    expect(scenarioCodeErrorsOf([file("one", "ONE", ["SCN-ONE-001", "SCN-TOOLONGCODE-001"])])).toEqual([]);
  });

  it("reds the run: a reconciliation carrying one has scenario code errors, a clean or unjudged one has none", () => {
    const errors = scenarioCodeErrorsOf([one, file("two", "TWO", ["SCN-ONE-002"])]);
    expect(hasScenarioCodeErrors({ scenarioCodeErrors: errors })).toBe(true);
    expect(hasScenarioCodeErrors({ scenarioCodeErrors: [] })).toBe(false);
    expect(hasScenarioCodeErrors({})).toBe(false);
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
  });

  it("lists a file whose header code is too long to be one, by the reader that mints the account", () => {
    const long: CorpusFile = {
      slug: "long",
      featureCode: null,
      source: "@TOOLONGCODE\nFeature: long\n\n  @unit @SCN-TOOLONGCODE-001\n  Scenario: s\n    Given a thing\n",
    };
    expect(scenarioCodeErrorsOf([long]).map((e) => e.kind)).toEqual(["no-feature-code"]);
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
