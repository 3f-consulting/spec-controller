import { describe, expect, it } from "vitest";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import { jsonReportOf } from "./json.js";
import { markdownReportOf } from "./markdown.js";
import { reconciled } from "./reconciledRun.test-utils.js";

const headingsOf = (markdown: string): string[] => markdown.split("\n").filter((line) => line.startsWith("## ")).map((line) => line.slice(3));

describe("the Markdown report's sections will come in a fixed order", () => {
  it("[CLM-RPT-009] a run with something for every section has its opening under the title, then the provenance, the errors in the inputs, run integrity, the summary and the Claim Reconciliations", () => {
    const markdown = markdownReportOf(
      reconciled({
        scenarios: ["@unit @CLM-ONE-001", "@unit @CLM-TWO-001"],
        unitTests: [["never-ran", "ONE-001"]],
        configurationErrors: [{ kind: "configuration-unknown-key", entry: "runer" }],
        stepsRead: true,
      }),
    );
    const sections = ["Run provenance", "Errors in the inputs", "Run integrity", "Summary", "Claim Reconciliations"];
    const [title, , opening] = markdown.split("\n");

    expect({ title, opening, sections: headingsOf(markdown).filter((heading) => sections.includes(heading)) }).toEqual({
      title: "# Evidence Reconciliation",
      opening: "Some evidence never ran, so the run cannot be relied on and is not reconciled: Run integrity names it.",
      sections,
    });
  });
});

// Each table in the Markdown, with its columns and the lines between it and the heading above it.
function tablesOf(markdown: string): { readonly columns: string[]; readonly above: string[] }[] {
  const lines = markdown.split("\n");
  return lines.flatMap((line, at) => {
    if (!line.startsWith("| ") || lines[at - 1]?.startsWith("| ")) return [];
    const heading = at - 1 - lines.slice(0, at).reverse().findIndex((before) => before.startsWith("#"));
    return [{ columns: line.slice(2, -2).split(" | "), above: lines.slice(heading + 1, at) }];
  });
}

describe("each section will have its heading, each value its label, and each table a key", () => {
  it("[CLM-RPT-109] a run with something for every section has each section's heading, a label on each value, and a key above each table naming its every column", () => {
    const markdown = markdownReportOf(
      reconciled({
        scenarios: ["@unit @CLM-ONE-001", "@unit @CLM-TWO-001", "@unit", "@e2e @CLM-ONE-003"],
        unitTests: [["never-ran", "ONE-001"], ["passed", "ONE-009"], ["failed"]],
        configurationErrors: [{ kind: "configuration-unknown-key", entry: "runer" }],
        stepsRead: true,
      }),
    );
    const tables = tablesOf(markdown);

    expect({
      headings: headingsOf(markdown),
      unlabelled: markdown.split("\n").filter((line) => /^\s*- /.test(line) && !/^\s*- [^:]+:( |$)/.test(line)),
      unkeyed: tables.flatMap(({ columns, above }) =>
        above.includes("Key:") ? columns.filter((column) => !above.some((line) => line.startsWith(`- ${column}: `))) : [`no key above ${columns[0]}`],
      ),
      tables: tables.length,
    }).toEqual({ headings: ["Run provenance", "Errors in the inputs", "Run integrity", "Summary", "Step account", "Claim Reconciliations"], unlabelled: [], unkeyed: [], tables: 6 });
  });
});

describe("neither report will have an optional section the run had nothing for", () => {
  it.each([
    ["CLM-RPT-077", "errors in the inputs", "Errors in the inputs", "errorsInTheInputs"],
    ["CLM-RPT-021", "run integrity", "Run integrity", "runIntegrity"],
    ["CLM-RPT-052", "step accounting", "Step account", "stepAccount"],
    ["CLM-RPT-006", "out of balance by feature", "Out of balance by feature", "outOfBalanceByFeature"],
  ] as const)("[%s] a run with no %s has that section in neither report", (_clm, _section, heading, part) => {
    const run = reconciled({ scenarios: ["@unit @CLM-ONE-001"], unitTests: [["passed", "ONE-001"]] });
    const json = JSON.parse(jsonReportOf(run)) as Record<string, unknown> & { readonly totals: Record<string, unknown> };
    const markdown = markdownReportOf(run);

    expect({ markdown: markdown.includes(`## ${heading}`) || markdown.includes(`### ${heading}`), json: part in json || part in json.totals }).toEqual({ markdown: false, json: false });
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
