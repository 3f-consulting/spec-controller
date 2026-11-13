import { describe, expect, it } from "vitest";
import { markdownReportOf } from "./markdown.js";
import { reconciled, type RunHas } from "./reconciledRun.test-utils.js";

// A Summary group's table: its header cells, and the first cell of each row.
function tableUnder(heading: string, markdown: string): { readonly header: string[]; readonly rows: string[] } {
  const lines = markdown.slice(markdown.indexOf(`### ${heading}`)).split("\n");
  const table = lines.slice(lines.findIndex((line) => line.startsWith("| "))).filter((_line, at, all) => all.slice(0, at + 1).every((each) => each.startsWith("| ")));
  const cells = (line: string): string[] => line.slice(2, -2).split(" | ");
  return { header: table.length === 0 ? [] : cells(table[0]!), rows: table.slice(2).map((line) => cells(line)[0]!) };
}

describe("the Failing column, the row with no kind and the performance row each appear only above zero", () => {
  it.each([
    ["CLM-RPT-120", "no failing Quality Check Reconciliation", { scenarios: ["@unit @CLM-ONE-001"], unitTests: [["passed", "ONE-001"]] }, "Failing", "column", false],
    ["CLM-RPT-121", "one failing Quality Check Reconciliation", { scenarios: ["@unit @CLM-ONE-001"], unitTests: [["failed", "ONE-001"]] }, "Failing", "column", true],
    ["CLM-RPT-122", "no Quality Check Reconciliation with no kind", { scenarios: ["@unit @CLM-ONE-001"], unitTests: [["passed", "ONE-001"]] }, "No kind", "row", false],
    ["CLM-RPT-123", "one no-quality-check Quality Check Reconciliation", { scenarios: ["@CLM-ONE-001"], unitTests: [] }, "No kind", "row", true],
    ["CLM-RPT-124", "no performance Evidence Obligation or Observation", { scenarios: ["@unit @CLM-ONE-001"], unitTests: [["passed", "ONE-001"]] }, "performance", "row", false],
  ] as const)("[%s] totals with %s show the table by kind as they call for", (_clm, _counts, run: RunHas, name, shape, shown) => {
    const { header, rows } = tableUnder("Quality Check Reconciliations, by kind", markdownReportOf(reconciled(run)));

    expect({ table: header.length > 0, shown: (shape === "column" ? header : rows).includes(name) }).toEqual({ table: true, shown });
  });
});

describe("the Markdown where-filed table leaves out a place nothing was filed on", () => {
  it.each([
    ["CLM-RPT-125", "no Evidence Observation on a phantom claim", { scenarios: ["@unit @CLM-ONE-001"], unitTests: [["passed", "ONE-001"]] }, false],
    ["CLM-RPT-126", "one Evidence Observation on a phantom claim", { scenarios: ["@unit @CLM-ONE-001"], unitTests: [["passed", "ONE-001"], ["passed", "ONE-009"]] }, true],
  ] as const)("[%s] totals with %s show the where-filed table as they call for", (_clm, _filed, run: RunHas, shown) => {
    const { header, rows } = tableUnder("Evidence Observations, by where they were filed", markdownReportOf(reconciled(run)));

    expect({ table: header.length > 0, shown: rows.includes("On a phantom claim") }).toEqual({ table: true, shown });
  });
});

describe("the line of claim codes no claim reads is left out when there are none", () => {
  it("[CLM-RPT-127] totals with no claim code written where no claim reads it leave out the line about them", () => {
    const markdown = markdownReportOf(reconciled({ scenarios: ["@unit @CLM-ONE-001"], unitTests: [["passed", "ONE-001"]] }));
    const group = markdown.slice(markdown.indexOf("### Claim Reconciliations"), markdown.indexOf("### Quality Check Reconciliations"));

    expect({ group: group.startsWith("### Claim Reconciliations"), line: group.includes("where no claim reads them") }).toEqual({ group: true, line: false });
  });
});
