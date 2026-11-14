import { describe, expect, it } from "vitest";
import { markdownReportOf } from "./markdown.js";
import { reconciledFromSources } from "./reconciledRun.test-utils.js";

// The lines Errors in the inputs lists.
function errorsListed(...[sources, configurationErrors]: Parameters<typeof reconciledFromSources>): string[] {
  const markdown = markdownReportOf(reconciledFromSources(sources, configurationErrors));
  return markdown.slice(markdown.indexOf("## Errors in the inputs")).split("\n\n## ")[0]!.split("\n").filter((line) => line.startsWith("- "));
}

describe("an error in the inputs is listed under its kind with the files, codes or setting it involves", () => {
  it.each([
    [
      "CLM-RPT-147",
      "one.feature, tagged @ONE, with a scenario tagged @CLM-TWO-001, and two.feature tagged @TWO",
      [["one.feature", "@ONE\nFeature: one\n\n  @CLM-TWO-001\n  Scenario: adds\n"], ["two.feature", "@TWO\nFeature: two\n"]],
      [],
      "- `foreign-claim-code`: `one.feature`, `CLM-TWO-001`, `two.feature`",
    ],
    ["CLM-RPT-153", "a configuration setting runer, which balance does not know", [], [{ kind: "configuration-unknown-key", entry: "runer" }], "- `configuration-unknown-key`: `runer`"],
  ] as const)("[%s] a run with %s lists that error under its kind with what it involves", (_clm, _inputs, sources, configurationErrors, line) => {
    expect(errorsListed(sources, configurationErrors)).toEqual([line]);
  });
});
