import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { main } from "../../../spec-controller/src/commands/main.js";
import { folderForTest } from "../../../spec-controller/src/repository/repository.test-utils.js";
import type { EvidenceReconciliation } from "./evidenceReconciliation.js";

// The JSON report balance writes, in a folder outside git holding the files, with the flags given.
function reportOf(files: Readonly<Record<string, string>>, ...args: string[]): EvidenceReconciliation {
  const folder = folderForTest();
  Object.entries(files).forEach(([path, text]) => {
    mkdirSync(dirname(join(folder.top, path)), { recursive: true });
    writeFileSync(join(folder.top, path), text);
  });
  let report = "";
  main(["balance", "--format", "json", ...args], folder.top, { output: { fd: 1, write: (text) => (report += text) }, error: { fd: 2, write: () => {} } });
  return JSON.parse(report) as EvidenceReconciliation;
}

const featureOf = (kind: string): string => `@ONE\nFeature: one\n\n  @${kind} @CLM-ONE-001\n  Scenario: one adds one\n    Given one adds one\n`;

const byFile = (): string =>
  JSON.stringify({
    testResults: [{ name: "/work/a.test.ts", status: "passed", message: "", assertionResults: [{ ancestorTitles: [], title: "[CLM-ONE-001] adds one", status: "passed", failureMessages: [] }] }],
  });

const byExample = (): string =>
  JSON.stringify({
    version: "3.13.0",
    examples: [{ id: "./spec/adds_spec.rb[1:1]", description: "[CLM-ONE-001] adds one", full_description: "Adding [CLM-ONE-001] adds one", status: "passed", file_path: "./spec/adds_spec.rb", line_number: 2, run_time: 0.0004, pending_message: null }],
    summary: { duration: 0.014, example_count: 1, failure_count: 0, pending_count: 0, errors_outside_of_examples_count: 0 },
    summary_line: "1 example, 0 failures",
  });

const byScenario = (): string =>
  JSON.stringify([
    {
      uri: "features/one.feature",
      id: "one",
      keyword: "Feature",
      name: "one",
      line: 2,
      tags: [{ name: "@ONE", line: 1 }],
      elements: [
        {
          id: "one;one-adds-one",
          keyword: "Scenario",
          type: "scenario",
          name: "one adds one",
          line: 5,
          tags: [
            { name: "@integration", line: 4 },
            { name: "@CLM-ONE-001", line: 4 },
          ],
          steps: [{ keyword: "Given ", name: "one adds one", line: 6, match: { location: "tests/steps/one.steps.ts:3" }, result: { status: "passed", duration: 1000 } }],
        },
      ],
    },
  ]);

describe("balance posts a result as passed or failed, citing its claim code", () => {
  it.each([
    ["CLM-OBS-017", "Vitest's", "unit", ["--vitest", "report.json"], byFile],
    ["CLM-OBS-019", "Jest's", "unit", ["--jest", "report.json"], byFile],
    ["CLM-OBS-029", "RSpec's", "unit", ["--rspec", "report.json"], byExample],
    ["CLM-OBS-031", "Cucumber's", "integration", ["--cucumber", "report.json"], byScenario],
  ] as const)("[%s] %s evidence report had a result citing CLM-ONE-001 that passed: balance posts it as passed, citing CLM-ONE-001", (_clm, _runner, kind, args, report) => {
    const { claimReconciliations } = reportOf({ "features/one.feature": featureOf(kind), "report.json": report() }, ...args);

    expect(claimReconciliations.flatMap(({ qualityCheckReconciliations }) => qualityCheckReconciliations.map(({ observation }) => observation && { result: observation.result, cites: observation.cites }))).toEqual([
      { result: "passed", cites: [{ featureCode: "ONE", number: "001" }] },
    ]);
  });
});

describe("the step account", () => {
  it("[CLM-EVR-032] each job's counts will add up to the steps read in it, for a workflow balance read", () => {
    const workflow = "jobs:\n  build:\n    steps:\n      - uses: actions/checkout@v4\n      - run: pnpm lint\n  test:\n    steps:\n      - run: pnpm audit-the-tree\n";
    const { stepAccount } = reportOf({ "features/one.feature": featureOf("unit"), "workflows/ci.yml": workflow }, "--ci", "workflows");

    expect(stepAccount?.jobs.map(({ job, stepsRead, runners, reconcilerSteps, nonChecks, plumbing, candidates }) => ({ job, stepsRead, sum: runners + reconcilerSteps + nonChecks + plumbing + candidates }))).toEqual([
      { job: "build", stepsRead: 2, sum: 2 },
      { job: "test", stepsRead: 1, sum: 1 },
    ]);
  });
});
