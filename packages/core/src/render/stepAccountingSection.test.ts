import { describe, it, expect } from "vitest";
import { CoreMessage } from "./messages.js";
import { coreMessage } from "./coreText.js";
import { markdownHeading } from "./heading.js";
import { renderMarkdown } from "../assemble/composers.js";
import { sectionCtx as ctx } from "./runContext.test-utils.js";
import { sectionUnder } from "./renderedSection.test-utils.js";
import {
  stepAccountingCi as ci,
  nightly,
  reconcileStepAccounting as reconcile,
} from "../evidenceReconciliation.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";

const heading = (): string => markdownHeading(3, coreMessage(CoreMessage.StepAccountingHeading));
const TABLE_HEADER = (): string => coreMessage(CoreMessage.StepAccountingTableHeader);

const section = (lines: readonly string[]): string[] => sectionUnder(heading())(lines);

describe("[CLM-RPT-052] the step-accounting section tables a row per workflow and job read, and a total row when more than one job was read", () => {
  const throughTable = (reconciliation: ReturnType<typeof reconcile>): string[] => {
    const lines = section(renderMarkdown(reconciliation, ctx, publishedExitCodeOf).split("\n"));
    const header = lines.indexOf(TABLE_HEADER());
    expect(header).toBeGreaterThan(0);
    const end = lines.indexOf("", header);
    expect(end).toBeGreaterThan(header);
    expect(lines[end + 1]).toBe(coreMessage(CoreMessage.StepAccountingRunnersLabel));
    return lines.slice(header, end + 1);
  };

  it("tables the one job read as one row, with no total row, and the lists follow the table", () => {
    expect(throughTable(reconcile([ci]))).toStrictEqual([
      TABLE_HEADER(),
      "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
      "| ci.yml | ci | 15 | 4 | 1 | 2 | 3 | 5 | 15 |",
      "",
    ]);
  });

  it("tables each job read as a row, by workflow then job, then a total row, and the lists follow the table", () => {
    expect(throughTable(reconcile([nightly, ci], ["nightly.yml", "ci.yml"]))).toStrictEqual([
      TABLE_HEADER(),
      "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
      "| ci.yml | ci | 15 | 4 | 1 | 2 | 3 | 5 | 15 |",
      "| nightly.yml | audit | 1 | 1 | 0 | 0 | 0 | 0 | 1 |",
      "| nightly.yml | sweep | 2 | 2 | 0 | 0 | 0 | 0 | 2 |",
      `| ${coreMessage(CoreMessage.StepAccountingTotal)} | | 18 | 7 | 1 | 2 | 3 | 5 | 18 |`,
      "",
    ]);
  });

  it.each([
    { name: "a workflow file named with a pipe", file: "a|b.yml", jobKey: "ci", workflow: "a\\|b.yml", job: "ci" },
    { name: "a job id holding a pipe", file: "ci.yml", jobKey: '"a|b"', workflow: "ci.yml", job: "a\\|b" },
    { name: "a workflow file named with a backslash", file: "a\\b.yml", jobKey: "ci", workflow: "a\\\\b.yml", job: "ci" },
    { name: "a job id holding a line break", file: "ci.yml", jobKey: '"a\\nb"', workflow: "ci.yml", job: "a b" },
    { name: "a workflow file named with a line break", file: "a\nb.yml", jobKey: "ci", workflow: "a b.yml", job: "ci" },
  ])("tables $name as one row of nine cells, its Workflow and Job cells holding the names whole", ({ file, jobKey, workflow, job }) => {
    const source = ci.replace("\n  ci:\n", `\n  ${jobKey}:\n`);
    const packageJson = { scripts: { test: "vitest run" }, specController: { runners: { unit: "vitest" } } };
    const table = throughTable(reconcile([source], [file], packageJson));
    const rows = table.slice(2, -1);
    expect(rows).toStrictEqual([`| ${workflow} | ${job} | 15 | 6 | 1 | 2 | 0 | 6 | 15 |`]);
    expect((rows[0] ?? "").split(/(?<!\\)\|/).slice(1, -1)).toHaveLength(9);
  });

  it("renders no section, and nothing in its place, where the run read no CI configuration and has no notChecks, or read only a workflow with no step that its notChecks alone name", () => {
    const runners = { unit: "vitest" };
    const runs = [
      { workflows: [], files: [], packageJson: { scripts: { test: "vitest run" }, specController: { runners } } },
      {
        workflows: ["jobs:\n  release:\n    uses: ./.github/workflows/reuse.yml\n"],
        files: ["release.yml"],
        packageJson: {
          scripts: { test: "vitest run" },
          specController: { runners, notChecks: ["release.yml:release:Ship"] },
        },
      },
    ];
    for (const { workflows, files, packageJson } of runs) {
      const lines = renderMarkdown(reconcile(workflows, files, packageJson), ctx, publishedExitCodeOf).split("\n");
      expect(lines).not.toContain(heading());
      expect(lines).not.toContain(TABLE_HEADER());
      const headings = lines.flatMap((line, i) => (i > 0 && line.startsWith("#") ? [i] : []));
      expect(headings.length).toBeGreaterThan(0);
      for (const i of headings) expect(lines[i - 1]).toBe("");
    }
  });
});
