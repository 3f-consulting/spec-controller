import { describe, expect, it } from "vitest";
import { coreText } from "../messages/catalogue.js";
import { markdownReportOf } from "./markdown.js";
import { reconciled, type RunHas } from "./reconciledRun.test-utils.js";

// A Summary group's table: its header cells, and the first cell of each row.
function tableUnder(heading: string, markdown: string): { readonly header: string[]; readonly rows: string[] } {
  const lines = markdown.slice(markdown.indexOf(`### ${heading}`)).split("\n");
  const table = lines.slice(lines.findIndex((line) => line.startsWith("| "))).filter((_line, at, all) => all.slice(0, at + 1).every((each) => each.startsWith("| ")));
  const cells = (line: string): string[] => line.slice(2, -2).split(" | ");
  return { header: table.length === 0 ? [] : cells(table[0]!), rows: table.slice(2).map((line) => cells(line)[0]!) };
}

const BY_KIND = "Quality Check Reconciliations, by kind";
const BY_WHERE_FILED = "Evidence Observations, by where they were filed";

describe("the Summary will show a row or column only when it has a count above zero", () => {
  it.each([
    ["CLM-RPT-120", "no failing Quality Check Reconciliation", { scenarios: ["@unit @CLM-ONE-001"], unitTests: [["passed", "ONE-001"]] }, "not have", "Failing column of its totals by kind", BY_KIND, "Failing", "column", false],
    ["CLM-RPT-121", "one failing Quality Check Reconciliation", { scenarios: ["@unit @CLM-ONE-001"], unitTests: [["failed", "ONE-001"]] }, "have", "Failing column of its totals by kind", BY_KIND, "Failing", "column", true],
    ["CLM-RPT-122", "no no-quality-check Quality Check Reconciliation", { scenarios: ["@unit @CLM-ONE-001"], unitTests: [["passed", "ONE-001"]] }, "not have", "no-quality-check row of its totals by kind", BY_KIND, "No kind", "row", false],
    ["CLM-RPT-123", "one no-quality-check Quality Check Reconciliation", { scenarios: ["@CLM-ONE-001"], unitTests: [] }, "have", "no-quality-check row of its totals by kind", BY_KIND, "No kind", "row", true],
    ["CLM-RPT-124", "no performance Evidence Obligation or Observation", { scenarios: ["@unit @CLM-ONE-001"], unitTests: [["passed", "ONE-001"]] }, "not have", "performance row of its totals by kind", BY_KIND, "performance", "row", false],
    ["CLM-RPT-125", "no Evidence Observation on a phantom claim", { scenarios: ["@unit @CLM-ONE-001"], unitTests: [["passed", "ONE-001"]] }, "not have", "phantom claims row of its totals by where filed", BY_WHERE_FILED, "On a phantom claim", "row", false],
    [
      "CLM-RPT-126",
      "one Evidence Observation on a phantom claim",
      { scenarios: ["@unit @CLM-ONE-001"], unitTests: [["passed", "ONE-001"], ["passed", "ONE-009"]] },
      "have",
      "phantom claims row of its totals by where filed",
      BY_WHERE_FILED,
      "On a phantom claim",
      "row",
      true,
    ],
  ] as const)("[%s] totals with %s will %s the Summary's %s", (_clm, _counts, run: RunHas, _show, _rowOrColumn, table, name, shape, shown) => {
    const { header, rows } = tableUnder(table, markdownReportOf(reconciled(run)));

    expect({ table: header.length > 0, shown: (shape === "column" ? header : rows).includes(name) }).toEqual({ table: true, shown });
  });
});

describe("the Markdown has a line of claim codes no claim reads only when there are some", () => {
  it.each([
    ["CLM-RPT-127", 0, "not have", false],
    ["CLM-RPT-145", 1, "have", true],
  ] as const)("[%s] totals with %i claim codes written where no claim reads them will %s the line about them, apart from the table above it", (_clm, count, _show, shown) => {
    const run = reconciled({ scenarios: ["@unit @CLM-ONE-001"], unitTests: [["passed", "ONE-001"]] });
    const markdown = markdownReportOf({ ...run, totals: { ...run.totals, excludedClaimCodeOccurrences: count } });
    const group = markdown.slice(markdown.indexOf("### Claim Reconciliations"), markdown.indexOf("### Quality Check Reconciliations"));
    const line = `${count} claim codes are written in a title, a step or a comment, where no claim reads them.`;

    expect({ group: group.startsWith("### Claim Reconciliations"), line: group.includes(`\n\n${line}`), anyLine: group.includes("where no claim reads them") }).toEqual({
      group: true,
      line: shown,
      anyLine: shown,
    });
  });
});

// A Summary group's table as rows of cells, each row keyed by the header's columns.
function rowsUnder(heading: string, markdown: string): Record<string, string>[] {
  const lines = markdown.slice(markdown.indexOf(`### ${heading}`)).split("\n");
  const table = lines.slice(lines.findIndex((line) => line.startsWith("| "))).filter((_line, at, all) => all.slice(0, at + 1).every((each) => each.startsWith("| ")));
  const cells = (line: string): string[] => line.slice(2, -2).split(" | ");
  return table.slice(2).map((line) => Object.fromEntries(cells(line).map((cell, at) => [cells(table[0]!)[at]!, cell])));
}

describe("the report shows each count the run has in its cell", () => {
  const run = (): string => markdownReportOf(reconciled({ scenarios: ["@unit @CLM-ONE-001", "@unit @CLM-ONE-002"], unitTests: [["passed", "ONE-001"], ["failed", "ONE-002"]] }));

  it("[CLM-RPT-163] a claim with a unit Evidence Obligation and a passing unit test citing it, and one with a failing one, show 2 Claim Reconciliations in the Summary, 1 balanced and 1 out of balance", () => {
    expect(rowsUnder(coreText("summary-claim-reconciliations"), run())).toEqual([
      { [coreText("summary-total")]: "2", [coreText("summary-balanced")]: "1", [coreText("summary-out-of-balance")]: "1" },
    ]);
  });

  it("[CLM-RPT-164] a claim with a unit Evidence Obligation and a passing unit test citing it, and one with a failing one, show 2 Evidence Obligations, 2 Evidence Observations, 1 satisfied and 1 failing on the unit row", () => {
    expect(rowsUnder(coreText("summary-by-kind"), run()).find((row) => row[coreText("summary-kind")] === "unit")).toEqual({
      [coreText("summary-kind")]: "unit",
      [coreText("summary-evidence-obligations")]: "2",
      [coreText("summary-evidence-observations")]: "2",
      [coreText("outcome-satisfied")]: "1",
      [coreText("outcome-failing")]: "1",
    });
  });
});
