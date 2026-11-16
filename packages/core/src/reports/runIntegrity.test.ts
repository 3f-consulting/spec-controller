import { describe, expect, it } from "vitest";
import { markdownReportOf } from "./markdown.js";
import { reconciledFrom } from "./reconciledRun.test-utils.js";

describe("run integrity lists a never-ran Evidence Observation by its kind, where it is and any name it has", () => {
  it.each([
    ["CLM-RPT-160", "the unit test adds in one.test.ts", ["unit", "never-ran", "ONE-001", "one.test.ts", "adds"], "- unit: `one.test.ts`, `adds`"],
    ["CLM-RPT-161", "the step ci.yml:build:Lint", ["fitness", "never-ran", "ONE-001", "ci.yml:build:Lint"], "- fitness: `ci.yml:build:Lint`"],
  ] as const)("[%s] a run with %s, which never ran, with no message, has run integrity list it", (_clm, _evidence, evidence, line) => {
    const markdown = markdownReportOf(reconciledFrom([["one.feature", "ONE", [["@unit @fitness @CLM-ONE-001", "adds one"]]]], [evidence]));

    expect(markdown.slice(markdown.indexOf("## Run integrity")).split("\n\n## ")[0]!.split("\n").filter((each) => each.startsWith("- "))).toEqual([line]);
  });
});
