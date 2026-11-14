import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";
import { main } from "./main.js";

// A folder outside git with one feature file of one claim, and a workflows folder holding the given workflows.
function folderWithWorkflows(workflows: Readonly<Record<string, string>>): string {
  const folder = temporaryDirectory("reports-");
  mkdirSync(join(folder, "features"));
  writeFileSync(join(folder, "features", "one.feature"), "@ONE\nFeature: one\n\n  @unit @CLM-ONE-001\n  Scenario: one\n");
  mkdirSync(join(folder, "workflows"));
  for (const [name, text] of Object.entries(workflows)) writeFileSync(join(folder, "workflows", name), text);
  return folder;
}

// The report balance writes in the format, reading the folder's workflows.
function reportIn(folder: string, format: "md" | "json"): string {
  let report = "";
  main(["balance", "--ci", "workflows", "--format", format], folder, { output: { fd: 1, write: (text) => (report += text) }, error: { fd: 2, write: () => {} } });
  return report;
}

describe("the Markdown report leaves out any part the run had nothing for", () => {
  it("[CLM-RPT-052] a run had nothing for the step account, its workflows folder holding no workflow: when its Markdown report is written, it will not have that part", () => {
    expect(reportIn(folderWithWorkflows({}), "md").includes("## Step account")).toBe(false);
  });
});

describe("a row lists its reconciling items, each with where to look", () => {
  it("[CLM-RPT-154] a claim had a fitness Evidence Obligation, and its step ci.yml:build:Lint failing: when the Markdown report is written, its row's reconciling items will be fitness failing, at ci.yml:build:Lint", () => {
    const folder = folderWithWorkflows({ "ci.yml": "jobs:\n  build:\n    steps:\n      - name: Lint\n        id: CLM-TWO-001\n        run: pnpm lint\n" });
    writeFileSync(join(folder, "features", "two.feature"), "@TWO\nFeature: two\n\n  @fitness @CLM-TWO-001\n  Scenario: lints\n");
    writeFileSync(join(folder, "steps.json"), '{"CLM-TWO-001":{"outcome":"failure","conclusion":"failure"}}');
    let report = "";

    main(["balance", "--ci", "workflows", "--ci-steps", "steps.json", "--format", "md"], folder, { output: { fd: 1, write: (text) => (report += text) }, error: { fd: 2, write: () => {} } });

    expect(report.split("\n").filter((line) => line.startsWith("| CLM-TWO-001 ")).map((row) => row.split("|").at(-2)!.trim())).toEqual(["fitness: failing (`ci.yml:build:Lint`)"]);
  });
});
