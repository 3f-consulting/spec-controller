import { describe, expect, it } from "vitest";
import { markdownReportOf } from "./markdown.js";
import { reconciledFromSources } from "./reconciledRun.test-utils.js";

// The lines Errors in the inputs lists.
function errorsListed(...[sources, configurationErrors]: Parameters<typeof reconciledFromSources>): string[] {
  const markdown = markdownReportOf(reconciledFromSources(sources, configurationErrors));
  return markdown.slice(markdown.indexOf("## Errors in the inputs")).split("\n\n## ")[0]!.split("\n").filter((line) => line.startsWith("- "));
}

describe("Errors in the inputs lists each error under its kind, with the files, codes or setting it involves", () => {
  it.each([
    [
      "CLM-RPT-147",
      "one.feature, tagged @ONE, with a scenario tagged @CLM-TWO-001, and two.feature tagged @TWO",
      [["one.feature", "@ONE\nFeature: one\n\n  @CLM-TWO-001\n  Scenario: adds\n"], ["two.feature", "@TWO\nFeature: two\n"]],
      [],
      "- `foreign-claim-code`: `one.feature`, `CLM-TWO-001`, `two.feature`",
    ],
    ["CLM-RPT-149", "three.feature, with no feature code, with a scenario tagged @CLM-ONE-002", [["three.feature", "Feature: three\n\n  @CLM-ONE-002\n  Scenario: adds\n"]], [], "- `no-feature-code`: `three.feature`"],
    [
      "CLM-RPT-150",
      "one.feature and uno.feature, both tagged @ONE",
      [["one.feature", "@ONE\nFeature: one\n"], ["uno.feature", "@ONE\nFeature: uno\n"]],
      [],
      "- `duplicate-feature-code`: `ONE`, `one.feature`, `uno.feature`",
    ],
    [
      "CLM-RPT-151",
      "the scenario adds in one.feature, tagged both @CLM-ONE-001 and @CLM-ONE-002",
      [["one.feature", "@ONE\nFeature: one\n\n  @CLM-ONE-001 @CLM-ONE-002\n  Scenario: adds\n"]],
      [],
      "- `several-claim-codes`: `one.feature`, `adds`, `CLM-ONE-001`, `CLM-ONE-002`",
    ],
    [
      "CLM-RPT-152",
      "the Outline adds in one.feature, tagged @CLM-ONE-009, with a clm column",
      [["one.feature", "@ONE\nFeature: one\n\n  @CLM-ONE-009\n  Scenario Outline: adds\n    Given <n>\n\n    Examples:\n      | clm         | n |\n      | CLM-ONE-010 | 1 |\n"]],
      [],
      "- `claim-code-beside-clm-column`: `one.feature`, `adds`, `CLM-ONE-009`",
    ],
    ["CLM-RPT-153", "a configuration setting runer, which balance does not know", [], [{ kind: "configuration-unknown-key", entry: "runer" }], "- `configuration-unknown-key`: `runer`"],
  ] as const)("[%s] a run with %s lists that error under its kind with what it involves", (_clm, _inputs, sources, configurationErrors, line) => {
    expect(errorsListed(sources, configurationErrors)).toEqual([line]);
  });
});
