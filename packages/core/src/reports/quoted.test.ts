import { describe, expect, it } from "vitest";
import { markdownReportOf } from "./markdown.js";
import variants from "./quoted.variants.json" with { type: "json" };
import { reconciledFrom } from "./reconciledRun.test-utils.js";

// A code span's text as a Markdown reader takes it, or undefined where it is no whole code span: the span closes at the
// first run of backticks as long as its opening one, its padding comes off, and an escaped pipe is a pipe.
function rendered(span: string): string | undefined {
  const unescaped = span.replaceAll("\\|", "|");
  const fence = /^`+/.exec(unescaped)?.[0];
  if (fence === undefined) return undefined;
  const closing = [...unescaped.slice(fence.length).matchAll(/`+/g)].find(([run]) => run.length === fence.length);
  if (closing === undefined || fence.length + closing.index + fence.length !== unescaped.length) return undefined;
  const content = unescaped.slice(fence.length, fence.length + closing.index);
  return content.startsWith(" ") && content.endsWith(" ") && content.trim() !== "" ? content.slice(1, -1) : content;
}

// A table row's cells as a Markdown reader splits them: at every pipe not escaped.
const cellsOf = (line: string): string[] => line.slice(1, -1).split(/(?<!\\)\|/).map((cell) => cell.trim());

// A failing test's name, as its row in the Claim Reconciliations shows it, and whether every row has the header's columns.
function shown(name: string): { readonly name: string | undefined; readonly sameColumns: boolean } {
  const markdown = markdownReportOf(reconciledFrom([["one.feature", "ONE", [["@unit @CLM-ONE-001", "adds one"]]]], [["unit", "failed", "ONE-001", "one.test.ts", name]]));
  const table = markdown.slice(markdown.indexOf("\n## Claim Reconciliations\n")).split("\n").filter((line) => line.startsWith("| "));
  const items = cellsOf(table[2]!).at(-1)!;
  return {
    name: rendered(items.slice(items.indexOf("one.test.ts`: ") + "one.test.ts`: ".length, -1)),
    sameColumns: table.every((line) => cellsOf(line).length === cellsOf(table[0]!).length),
  };
}

describe("a name with a character Markdown reads as formatting shows in code unchanged", () => {
  it.for(variants["CLM-RPT-084"].variants)("[CLM-RPT-084] a failing test named %j shows in code unchanged, and every row has the same columns", (name) => {
    expect(shown(name)).toEqual({ name, sameColumns: true });
  });
});

describe("a name with a line break shows in code as one quoted line", () => {
  it.for(variants["CLM-RPT-107"].variants)("[CLM-RPT-107] a failing test named %j shows in code as one quoted line, and every row has the same columns", (name) => {
    expect(shown(name)).toEqual({ name: JSON.stringify(name), sameColumns: true });
  });
});
