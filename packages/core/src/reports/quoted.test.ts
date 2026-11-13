import { describe, expect, it } from "vitest";
import { markdownReportOf } from "./markdown.js";
import { reconciledFrom } from "./reconciledRun.test-utils.js";

// A code span's text as a Markdown reader takes it: the span closes at the first run of backticks as long as its opening
// one, its padding comes off, and an escaped pipe is a pipe.
function rendered(span: string): string {
  const unescaped = span.replaceAll("\\|", "|");
  const fence = /^`+/.exec(unescaped)?.[0] ?? "";
  const closing = [...unescaped.slice(fence.length).matchAll(/`+/g)].find(([run]) => run.length === fence.length);
  const content = closing === undefined ? unescaped : unescaped.slice(fence.length, fence.length + closing.index);
  return content.startsWith(" ") && content.endsWith(" ") && content.trim() !== "" ? content.slice(1, -1) : content;
}

// A table row's cells as a Markdown reader splits them: at every pipe not escaped.
const cellsOf = (line: string): string[] => line.slice(1, -1).split(/(?<!\\)\|/).map((cell) => cell.trim());

describe("a name will read as it was given, in a table that stays a table", () => {
  it.each([
    ["CLM-RPT-084", "a pipe", "a|b", "a|b"],
    ["CLM-RPT-106", "a backslash", "a\\b", "a\\b"],
    ["CLM-RPT-107", "a line break", "a\nb", '"a\\nb"'],
    ["CLM-RPT-088", "a backtick", "`a`", "`a`"],
    ["CLM-RPT-108", "a formatting character", "*a*", "*a*"],
  ] as const)("[%s] a failing test's name with %s reads as it was given, in a table that stays a table", (_clm, _character, name, reads) => {
    const markdown = markdownReportOf(reconciledFrom([["one.feature", "ONE", [["@unit @CLM-ONE-001", "adds one"]]]], [["unit", "failed", "ONE-001", "one.test.ts", name]]));
    const table = markdown.slice(markdown.indexOf("\n## Claim Reconciliations\n")).split("\n").filter((line) => line.startsWith("| "));
    const items = cellsOf(table[2]!).at(-1)!;
    const quotedName = items.slice(items.indexOf("one.test.ts`: ") + "one.test.ts`: ".length, -1);

    expect({ cells: cellsOf(table[2]!).length, name: rendered(quotedName) }).toEqual({ cells: cellsOf(table[0]!).length, name: reads });
  });
});
