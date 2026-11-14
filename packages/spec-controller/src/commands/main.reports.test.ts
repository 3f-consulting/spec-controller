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

describe("neither report will have an optional section the run had nothing for", () => {
  it("[CLM-RPT-052] a run whose workflows folder holds no workflow has a step account in neither report", () => {
    const folder = folderWithWorkflows({});

    expect({ markdown: reportIn(folder, "md").includes("## Step account"), json: "stepAccount" in (JSON.parse(reportIn(folder, "json")) as object) }).toEqual({
      markdown: false,
      json: false,
    });
  });
});
