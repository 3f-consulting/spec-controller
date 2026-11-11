import { describe, expect, it } from "vitest";
import { shellReading } from "../parse/commandRuns.js";
import { parseCucumberEvidenceObservations } from "../parse/cucumber.js";
import { parseJunitEvidenceObservations, parsePytestEvidenceObservations } from "../parse/junit.js";
import { workflowSteps } from "../parse/parsedWorkflows.test-utils.js";
import { parseRspecEvidenceObservations } from "../parse/rspec.js";
import { parseVitestEvidenceObservations } from "../parse/vitest.js";
import type { ClaimCode } from "./claimCodes.js";
import { stepDispositionOf } from "./postEvidenceObservation.js";

const ONE: ClaimCode = { featureCode: "ONE", number: "001" };

describe("balance posts only the steps that prove something, as each report and workflow gives them", () => {
  it("[CLM-OBS-004] a step running pnpm audit-the-tree with its own environment is a fitness function", () => {
    const [step] = workflowSteps(["jobs:\n  build:\n    steps:\n      - run: pnpm audit-the-tree\n        env:\n          CI: \"true\"\n"]);
    const readings = { runsTheReconciler: () => false, nonChecks: [], runners: {}, scripts: {}, shell: shellReading };
    expect(stepDispositionOf(step!, readings)).toBe("candidate");
  });
});

describe("balance posts each result with how it went, as each report gives it", () => {
  it("[CLM-OBS-018] a failed test in a file Vitest marks failed is posted as failed, citing its claim code", () => {
    const posted = parseVitestEvidenceObservations({
      testResults: [{ name: "a.test.ts", status: "failed", assertionResults: [{ title: "[CLM-ONE-001] a test", fullName: "[CLM-ONE-001] a test", status: "failed" }] }],
    });
    expect(posted).toEqual([{ cites: [ONE], result: "failed", kind: "unit", place: "a.test.ts", notes: [], name: "[CLM-ONE-001] a test" }]);
  });

  it("[CLM-OBS-021] a pytest result is posted citing its clm property, and no other property", () => {
    const property = [
      { name: "clm", value: "CLM-ONE-001" },
      { name: "owner", value: "team-a" },
    ];
    const posted = parsePytestEvidenceObservations({ testsuites: { testsuite: [{ name: "pytest", testcase: [{ classname: "tests.a", name: "test_a", properties: { property } }] }] } });
    expect(posted).toEqual([{ cites: [ONE], result: "passed", kind: "unit", place: "tests.a", notes: [], name: "test_a" }]);
  });

  it("[CLM-OBS-026] a JUnit 5 test that ended in an error is posted as failed", () => {
    const testcase = { classname: "example.ATest", name: "[CLM-ONE-001] a test", error: { message: "boom", "#text": "IllegalStateException" } };
    expect(parseJunitEvidenceObservations({ testsuites: { testsuite: [{ name: "a.suite", testcase: [testcase] }] } })).toMatchObject([{ result: "failed", cites: [ONE] }]);
  });

  it("[CLM-OBS-029] an RSpec example that passed is posted as passed, citing its claim code, at its file", () => {
    const examples = [{ description: "[CLM-ONE-001] a spec", full_description: "a group [CLM-ONE-001] a spec", status: "passed", file_path: "./spec/a_spec.rb" }];
    expect(parseRspecEvidenceObservations({ examples })).toEqual([
      { cites: [ONE], result: "passed", kind: "unit", place: "spec/a_spec.rb", notes: [], name: "a group [CLM-ONE-001] a spec" },
    ]);
  });

  it("[CLM-OBS-031] a Cucumber scenario tagged with its kind and @CLM-ONE-001 is posted citing CLM-ONE-001 alone", () => {
    const report = [{ uri: "one.feature", elements: [{ name: "one adds one", tags: [{ name: "@integration" }, { name: "@CLM-ONE-001" }], steps: [{ keyword: "Given ", name: "one", result: { status: "passed" } }] }] }];
    expect(parseCucumberEvidenceObservations(report, undefined, () => [])).toMatchObject([{ result: "passed", cites: [ONE] }]);
  });

  it("[CLM-OBS-051] a scenario whose middle step matched two definitions is posted as never-ran, naming only that step", () => {
    const steps = [
      { keyword: "Given ", name: "one", result: { status: "passed" } },
      { keyword: "When ", name: "one adds one", result: { status: "ambiguous" } },
      { keyword: "Then ", name: "it is two", result: { status: "skipped" } },
    ];
    const report = [{ uri: "one.feature", elements: [{ name: "one adds one", tags: [{ name: "@CLM-ONE-001" }], steps }] }];
    expect(parseCucumberEvidenceObservations(report, undefined, () => [])).toMatchObject([{ result: "never-ran", cites: [ONE], notes: ["When one adds one"] }]);
  });
});

describe("balance posts what could not run as never ran, as each report gives it", () => {
  it("[CLM-OBS-049] a spec file RSpec failed to load is posted as never-ran, and RSpec's other messages post nothing", () => {
    const loadError = "An error occurred while loading ./spec/a_spec.rb.\nFailure/Error: require 'nope'\n";
    const report = { examples: [], summary: { errors_outside_of_examples_count: 1 }, messages: ["Run options: exclude {:slow=>true}", loadError] };
    expect(parseRspecEvidenceObservations(report)).toMatchObject([{ result: "never-ran", cites: [], place: "spec/a_spec.rb", message: loadError }]);
  });
});

describe("an Evidence Observation says where to look, as each report gives it", () => {
  it("[CLM-OBS-078] a test Vitest reports by its title alone is posted with that title as where to look", () => {
    const posted = parseVitestEvidenceObservations({ testResults: [{ name: "a.test.ts", status: "passed", assertionResults: [{ title: "adds two numbers", status: "passed" }] }] });
    expect(posted).toMatchObject([{ place: "a.test.ts", name: "adds two numbers" }]);
  });
});
