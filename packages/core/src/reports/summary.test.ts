import { describe, expect, it } from "vitest";
import { coreText } from "../messages/catalogue.js";
import { markdownReportOf } from "./markdown.js";
import { reconciled, type RunHas } from "./reconciledRun.test-utils.js";

// A Summary group's table: its header cells, and each row keyed by the header's columns.
function tableUnder(heading: string, markdown: string): { readonly header: string[]; readonly rows: Record<string, string>[] } {
  const lines = markdown.slice(markdown.indexOf(`### ${heading}`)).split("\n");
  const table = lines.slice(lines.findIndex((line) => line.startsWith("| "))).filter((_line, at, all) => all.slice(0, at + 1).every((each) => each.startsWith("| ")));
  const cells = (line: string): string[] => line.slice(2, -2).split(" | ");
  const header = table.length === 0 ? [] : cells(table[0]!);
  return { header, rows: table.slice(2).map((line) => Object.fromEntries(cells(line).map((cell, at) => [header[at]!, cell]))) };
}

const firstCells = (rows: readonly Record<string, string>[]): string[] => rows.map((row) => Object.values(row)[0]!);

describe("the Summary will show a row or column only when it has a count above zero", () => {
  it.each([
    ["CLM-RPT-120", "no failing Quality Check Reconciliation", { scenarios: ["@unit @CLM-ONE-001"], unitTests: [["passed", "ONE-001"]] }, "Failing", "column", false],
    ["CLM-RPT-121", "one failing Quality Check Reconciliation", { scenarios: ["@unit @CLM-ONE-001"], unitTests: [["failed", "ONE-001"]] }, "Failing", "column", true],
    ["CLM-RPT-122", "no no-quality-check Quality Check Reconciliation", { scenarios: ["@unit @CLM-ONE-001"], unitTests: [["passed", "ONE-001"]] }, "No kind", "row", false],
    ["CLM-RPT-123", "one no-quality-check Quality Check Reconciliation", { scenarios: ["@CLM-ONE-001"], unitTests: [] }, "No kind", "row", true],
    ["CLM-RPT-124", "no performance Evidence Obligation or Observation", { scenarios: ["@unit @CLM-ONE-001"], unitTests: [["passed", "ONE-001"]] }, "performance", "row", false],
  ] as const)("[%s] totals with %s show the Summary's totals by kind as they call for", (_clm, _counts, run: RunHas, name, shape, shown) => {
    const { header, rows } = tableUnder("Quality Check Reconciliations, by kind", markdownReportOf(reconciled(run)));

    expect({ table: header.length > 0, shown: (shape === "column" ? header : firstCells(rows)).includes(name) }).toEqual({ table: true, shown });
  });

  it.each([
    ["CLM-RPT-125", "no Evidence Observation on a phantom claim", { scenarios: ["@unit @CLM-ONE-001"], unitTests: [["passed", "ONE-001"]] }, false],
    ["CLM-RPT-126", "one Evidence Observation on a phantom claim", { scenarios: ["@unit @CLM-ONE-001"], unitTests: [["passed", "ONE-001"], ["passed", "ONE-009"]] }, true],
  ] as const)("[%s] totals with %s show the Summary's totals by where filed as they call for", (_clm, _filed, run: RunHas, shown) => {
    const { header, rows } = tableUnder("Evidence Observations, by where they were filed", markdownReportOf(reconciled(run)));

    expect({ table: header.length > 0, shown: firstCells(rows).includes("On a phantom claim") }).toEqual({ table: true, shown });
  });

  it.each([
    ["CLM-RPT-174", 0, "not have", false],
    ["CLM-RPT-175", 1, "have", true],
  ] as const)("[%s] totals with %i scenarios set aside by a deferral tag will %s the Claim Reconciliations line counting them", (_clm, count, _show, shown) => {
    const run = reconciled({ scenarios: ["@unit @CLM-ONE-001"], unitTests: [["passed", "ONE-001"]] });
    const markdown = markdownReportOf({ ...run, totals: { ...run.totals, deferredScenarios: count } });
    const group = markdown.slice(markdown.indexOf(`### ${coreText("summary-claim-reconciliations")}`), markdown.indexOf(`### ${coreText("summary-by-kind")}`));

    expect({ group: group.startsWith(`### ${coreText("summary-claim-reconciliations")}`), line: group.split("\n").includes(coreText("summary-deferred", { count })) }).toEqual({ group: true, line: shown });
  });
});

describe("the Markdown has a line of claim codes no claim reads only when there are some", () => {
  it.each([
    ["CLM-RPT-127", 0, "not have", false],
    ["CLM-RPT-145", 1, "have", true],
  ] as const)("[%s] totals with %i excluded claim code occurrences will %s the line about them", (_clm, count, _show, shown) => {
    const run = reconciled({ scenarios: ["@unit @CLM-ONE-001"], unitTests: [["passed", "ONE-001"]] });
    const markdown = markdownReportOf({ ...run, totals: { ...run.totals, excludedClaimCodeOccurrences: count } });
    const group = markdown.slice(markdown.indexOf("### Claim Reconciliations"), markdown.indexOf("### Quality Check Reconciliations"));
    const line = `${count} claim codes are written in a title, a step or a comment, where no claim reads them.`;

    expect({ group: group.startsWith("### Claim Reconciliations"), line: group.includes(line), anyLine: group.includes("where no claim reads them") }).toEqual({
      group: true,
      line: shown,
      anyLine: shown,
    });
  });
});

describe("the report shows each count the run has in its cell", () => {
  const run = (): string => markdownReportOf(reconciled({ scenarios: ["@unit @CLM-ONE-001", "@unit @CLM-ONE-002"], unitTests: [["passed", "ONE-001"], ["failed", "ONE-002"]] }));

  it("[CLM-RPT-163] a claim with a passing unit test and a claim with a failing one show 2 Claim Reconciliations, 1 balanced and 1 out of balance", () => {
    expect(tableUnder(coreText("summary-claim-reconciliations"), run()).rows).toEqual([
      { [coreText("summary-total")]: "2", [coreText("summary-balanced")]: "1", [coreText("summary-out-of-balance")]: "1" },
    ]);
  });

  it("[CLM-RPT-164] a claim with a unit Evidence Obligation and a passing unit test citing it, and one with a failing one, show 2 Evidence Obligations, 2 Evidence Observations, 1 satisfied and 1 failing on the unit row", () => {
    expect(tableUnder(coreText("summary-by-kind"), run()).rows.find((row) => row[coreText("summary-kind")] === "unit")).toEqual({
      [coreText("summary-kind")]: "unit",
      [coreText("summary-evidence-obligations")]: "2",
      [coreText("summary-evidence-observations")]: "2",
      [coreText("outcome-satisfied")]: "1",
      [coreText("outcome-failing")]: "1",
    });
  });
});
