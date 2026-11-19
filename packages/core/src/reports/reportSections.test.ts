import { describe, expect, it } from "vitest";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { QUALITY_CHECK_KINDS } from "../domain/postEvidenceObligation.js";
import { coreText } from "../messages/catalogue.js";
import catalogue from "../messages/messages.en.json" with { type: "json" };
import { jsonReportOf } from "./json.js";
import { markdownReportOf } from "./markdown.js";
import { reconciled } from "./reconciledRun.test-utils.js";

const headingsOf = (markdown: string): string[] => markdown.split("\n").filter((line) => line.startsWith("## ")).map((line) => line.slice(3));

describe("the Markdown report's sections will come in a fixed order", () => {
  it("[CLM-RPT-009] a run with something for every section opens with its title, and has the provenance, the errors in the inputs, run integrity, the summary and the Claim Reconciliations, in that order", () => {
    const markdown = markdownReportOf(
      reconciled({
        scenarios: ["@unit @CLM-ONE-001", "@unit @CLM-TWO-001"],
        unitTests: [["never-ran", "ONE-001"]],
        configurationErrors: [{ kind: "configuration-wrong-kind", entry: "vitest:vitest" }],
        stepsRead: true,
      }),
    );
    const sections = ["Run provenance", "Errors in the inputs", "Run integrity", "Summary", "Claim Reconciliations"];

    expect({ title: markdown.split("\n")[0], sections: headingsOf(markdown).filter((heading) => sections.includes(heading)) }).toEqual({
      title: `# ${coreText("report-title")}`,
      sections,
    });
  });
});

// Each table in the Markdown: the heading above it, its columns, the names its key gives a meaning below the key's own line, and its rows' cells.
function tablesOf(markdown: string): { readonly heading: string; readonly columns: string[]; readonly keyed: string[]; readonly rows: string[][] }[] {
  const lines = markdown.split("\n");
  const cells = (line: string): string[] => line.slice(2, -2).split(/ (?<!\\)\| /);
  return lines.flatMap((line, at) => {
    if (!line.startsWith("| ") || lines[at - 1]?.startsWith("| ")) return [];
    const heading = at - 1 - lines.slice(0, at).reverse().findIndex((before) => before.startsWith("#"));
    const rows = lines.slice(at + 2).filter((_row, after, all) => all.slice(0, after + 1).every((each) => each.startsWith("| ")));
    const above = lines.slice(heading + 1, at);
    const keyAt = above.indexOf(`${coreText("key")}:`);
    const keyed = (keyAt < 0 ? [] : above.slice(keyAt + 1)).flatMap((line) => (line.startsWith("- ") ? [line.slice(2, line.indexOf(": "))] : []));
    return [{ heading: lines[heading]!, columns: cells(line), keyed, rows: rows.map(cells) }];
  });
}

const isWords = (text: string): boolean => (Object.values(catalogue) as string[]).includes(text);
const inWords = (text: string): boolean => isWords(text) || (QUALITY_CHECK_KINDS as readonly string[]).includes(text) || /^`.*`$/.test(text);

// Each line below the title that is not blank, a heading, a key or a table, a labelled value, or a label over the values
// under it: a heading, label or key not in the catalogue's words, a label with no value, or a line with no label.
function unlabelledOf(markdown: string): string[] {
  const lines = markdown.split("\n").slice(2);
  return lines.filter((line, at) => {
    if (line === "" || line.startsWith("| ") || line === `${coreText("key")}:`) return false;
    const heading = /^#{2,3} (.+)$/.exec(line);
    if (heading) return !isWords(heading[1]!);
    const item = /^(\s*)- (.+?):(?: (.+))?$/.exec(line);
    if (!item) return true;
    const [, indent, label, value] = item;
    const inKey = lines.slice(0, at).reverse().find((before) => !before.startsWith("- ")) === `${coreText("key")}:`;
    if (inKey) return !isWords(label!) || !isWords(value!);
    return !inWords(label!) || (value === undefined && !(lines[at + 1] ?? "").startsWith(`${indent!}  - `));
  });
}

describe("each section will have its heading, each value its label, and each table a key", () => {
  it("[CLM-RPT-109] a run with something for every section has each section's heading, a label on each value, and a key above each table naming its every column", () => {
    const markdown = markdownReportOf(
      reconciled({
        scenarios: ["@unit @CLM-ONE-001", "@unit @CLM-TWO-001", "@unit", "@e2e @CLM-ONE-003"],
        unitTests: [["never-ran", "ONE-001"], ["passed", "ONE-009"], ["failed"]],
        configurationErrors: [{ kind: "configuration-wrong-kind", entry: "vitest:vitest" }],
        stepsRead: true,
        provenance: { toolSha: "9f8e7d6", inputs: [{ name: "vitest", path: "vitest.json" }] },
      }),
    );
    const tables = tablesOf(markdown);

    expect({
      headings: headingsOf(markdown),
      unlabelled: unlabelledOf(markdown),
      unkeyed: tables.flatMap(({ columns, keyed }) => columns.filter((column) => !keyed.includes(column))),
      byFeature: markdown.includes(`\n### ${coreText("summary-by-feature")}\n`),
      summaryRowLabels: tables
        .filter(({ heading }) => heading.startsWith("### ") && heading !== `### ${coreText("summary-claim-reconciliations")}`)
        .flatMap(({ rows }) => rows.map(([label]) => label!).filter((label) => !inWords(label))),
    }).toEqual({
      headings: ["Run provenance", "Errors in the inputs", "Run integrity", "Summary", "Step account", "Claim Reconciliations"],
      unlabelled: [],
      unkeyed: [],
      byFeature: true,
      summaryRowLabels: [],
    });
  });
});

describe("the Markdown report leaves out any part the run had nothing for", () => {
  it.each([
    ["CLM-RPT-077", "errors in the inputs", "Errors in the inputs"],
    ["CLM-RPT-021", "run integrity", "Run integrity"],
    ["CLM-RPT-052", "step account", "Step account"],
    ["CLM-RPT-006", "out of balance by feature", "Out of balance by feature"],
  ] as const)("[%s] a run with no %s has no such part in its Markdown report", (_clm, _part, heading) => {
    const markdown = markdownReportOf(reconciled({ scenarios: ["@unit @CLM-ONE-001"], unitTests: [["passed", "ONE-001"]] }));

    expect(markdown.includes(`## ${heading}`) || markdown.includes(`### ${heading}`)).toBe(false);
  });
});

describe("a report will show its Claim Reconciliations when the run had none", () => {
  it("[CLM-RPT-105] a run with nothing to reconcile has its Claim Reconciliations in each report, showing none", () => {
    const run = reconciled({ scenarios: [], unitTests: [] });
    const markdown = markdownReportOf(run);
    const section = markdown.slice(markdown.indexOf("\n## Claim Reconciliations\n") + 1);

    expect({ markdown: section.startsWith("## Claim Reconciliations") && section.includes("None."), json: (JSON.parse(jsonReportOf(run)) as EvidenceReconciliation).claimReconciliations }).toEqual({
      markdown: true,
      json: [],
    });
  });
});
