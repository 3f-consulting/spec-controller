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

interface Posted {
  readonly claimReconciliations: readonly { readonly qualityCheckReconciliations: readonly { readonly observation?: { readonly result: string; readonly cites: readonly { readonly featureCode: string; readonly number: string }[] } }[] }[];
}

// Each Evidence Observation the JSON report posts, as its result and the codes it cites.
function postedIn(folder: string, ...args: string[]): string[] {
  let report = "";
  main(["balance", ...args, "--format", "json"], folder, { output: { fd: 1, write: (text) => (report += text) }, error: { fd: 2, write: () => {} } });
  return (JSON.parse(report) as Posted).claimReconciliations.flatMap(({ qualityCheckReconciliations }) =>
    qualityCheckReconciliations.flatMap(({ observation }) => (observation ? [`${observation.result} ${observation.cites.map(({ featureCode, number }) => `CLM-${featureCode}-${number}`).join()}`] : [])),
  );
}

describe("balance posts each result with how it went", () => {
  it("[CLM-OBS-033] the step record had a result with the id CLM-ONE-001, and it succeeded: an Evidence Observation will be posted, as passed, citing CLM-ONE-001", () => {
    const folder = folderWithWorkflows({ "ci.yml": "jobs:\n  ci:\n    steps:\n      - id: CLM-ONE-001\n        run: pnpm audit-the-tree\n" });
    writeFileSync(join(folder, "steps.json"), '{"CLM-ONE-001":{"outcome":"success","conclusion":"success"}}');

    expect(postedIn(folder, "--ci", "workflows", "--ci-steps", "steps.json")).toEqual(["passed CLM-ONE-001"]);
  });
});

describe("balance posts what could not run as never ran", () => {
  it("[CLM-OBS-050] pytest's evidence report said the setup of a test citing CLM-ONE-001 errored: an Evidence Observation will be posted, as never-ran, citing CLM-ONE-001", () => {
    const folder = folderWithWorkflows({});
    writeFileSync(
      join(folder, "pytest.xml"),
      '<?xml version="1.0" encoding="utf-8"?><testsuites name="pytest tests"><testsuite name="pytest" errors="1" failures="0" skipped="0" tests="1"><testcase classname="test_adds" name="test_adds_one"><properties><property name="clm" value="CLM-ONE-001" /></properties><error message="failed on setup">the resource could not be set up</error></testcase></testsuite></testsuites>',
    );

    expect(postedIn(folder, "--pytest", "pytest.xml")).toEqual(["never-ran CLM-ONE-001"]);
  });
});
