import { describe, expect, it } from "vitest";
import { shellReading } from "../inputs/shell.js";
import { parseCucumberEvidenceObservations } from "../inputs/cucumber.js";
import { parseJunitEvidenceObservations, parsePytestEvidenceObservations } from "../inputs/junit.js";
import { parsedFeatures } from "../inputs/parsedFeatures.test-utils.js";
import { workflowSteps } from "../inputs/parsedWorkflows.test-utils.js";
import { parseRspecEvidenceObservations } from "../inputs/rspec.js";
import { parseVitestEvidenceObservations } from "../inputs/vitest.js";
import type { ClaimCode } from "./claimCodes.js";
import { claimCodesAtOf, stepDispositionOf } from "./postEvidenceObservation.js";

const ONE: ClaimCode = { featureCode: "ONE", number: "001" };

describe("balance posts only the steps that prove something, as each report and workflow gives them", () => {
  it("[CLM-OBS-004] a step running pnpm audit-the-tree with its own environment is a fitness function", () => {
    const [step] = workflowSteps(["jobs:\n  build:\n    steps:\n      - run: pnpm audit-the-tree\n        env:\n          CI: \"true\"\n"]);
    const readings = { nonChecks: [], runners: {}, scripts: {}, shell: shellReading };
    expect(stepDispositionOf(step!, readings)).toBe("candidate");
  });

  it("[CLM-OBS-004] a step running pnpm audit-the-tree whose environment holds a number and a flag is a fitness function", () => {
    const [step] = workflowSteps(["jobs:\n  build:\n    steps:\n      - run: pnpm audit-the-tree\n        env:\n          RETRIES: 3\n          VERBOSE: true\n"]);
    const readings = { nonChecks: [], runners: {}, scripts: {}, shell: shellReading };
    expect(stepDispositionOf(step!, readings)).toBe("candidate");
  });

  it("[CLM-OBS-013] a step whose own command writes out the step record is the reconciler", () => {
    const [step] = workflowSteps(["jobs:\n  build:\n    steps:\n      - name: Record\n        run: echo '${{ toJSON( steps ) }}' > steps.json\n"]);
    const readings = { nonChecks: [], runners: {}, scripts: {}, shell: shellReading };
    expect(stepDispositionOf(step!, readings)).toBe("reconciler");
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
      { name: "requirement", value: "CLM-ONE-002" },
    ];
    const posted = parsePytestEvidenceObservations({ testsuites: { testsuite: [{ name: "pytest", testcase: [{ classname: "tests.a", name: "test_a", properties: { property } }] }] } });
    expect(posted).toEqual([{ cites: [ONE], result: "passed", kind: "unit", place: "tests.a", notes: [], name: "test_a" }]);
  });

  it("[CLM-OBS-026] a JUnit 5 test that ended in an error is posted as failed", () => {
    const testcase = { classname: "example.ATest", name: "[CLM-ONE-001] a test", error: { message: "boom", "#text": "IllegalStateException" } };
    expect(parseJunitEvidenceObservations({ testsuites: { testsuite: [{ name: "a.suite", testcase: [testcase] }] } })).toEqual([
      { cites: [ONE], result: "failed", kind: "unit", place: "example.ATest", notes: [], name: "[CLM-ONE-001] a test" },
    ]);
  });

  it("[CLM-OBS-029] an RSpec example that passed is posted as passed, citing its claim code, at its file", () => {
    const examples = [{ description: "[CLM-ONE-001] a spec", full_description: "a group [CLM-ONE-001] a spec", status: "passed", file_path: "./spec/a_spec.rb" }];
    expect(parseRspecEvidenceObservations({ examples })).toEqual([
      { cites: [ONE], result: "passed", kind: "unit", place: "spec/a_spec.rb", notes: [], name: "a group [CLM-ONE-001] a spec" },
    ]);
  });

  it("[CLM-OBS-031] a Cucumber scenario tagged with its kind and @CLM-ONE-001 is posted citing CLM-ONE-001 alone", () => {
    const report = [{ uri: "one.feature", elements: [{ name: "one adds one", tags: [{ name: "@integration" }, { name: "@CLM-ONE-001" }], steps: [{ keyword: "Given ", name: "one", result: { status: "passed" } }] }] }];
    expect(parseCucumberEvidenceObservations(report, undefined, () => [])).toEqual([
      { cites: [ONE], result: "passed", kind: "integration", place: "one.feature", notes: [], name: "one adds one" },
    ]);
  });

  it("[CLM-OBS-031] a Cucumber scenario tagged @CLM-ONE-001, which the corpus also finds at its line, is posted citing CLM-ONE-001 once", () => {
    const report = [{ uri: "one.feature", elements: [{ name: "one adds one", line: 4, tags: [{ name: "@CLM-ONE-001" }], steps: [{ keyword: "Given ", name: "one", result: { status: "passed" } }] }] }];
    expect(parseCucumberEvidenceObservations(report, undefined, () => ["CLM-ONE-001"]).map(({ cites }) => cites)).toEqual([[ONE]]);
  });

  it.each([
    ["CLM-OBS-031", "a feature file the corpus holds", ["@ONE\nFeature: one\n\n  @CLM-ONE-001\n  Scenario: one adds one\n    Given one\n"], "one.feature"],
    ["CLM-OBS-031", "a feature file the corpus does not hold, beside one it holds", ["@TWO\nFeature: two\n\n  @CLM-TWO-001\n  Scenario: two adds two\n    Given two\n"], "two.feature"],
    ["CLM-OBS-031", "a feature file the corpus does not hold", [], "one.feature"],
  ])("[%s] a Cucumber scenario tagged @CLM-ONE-001 from %s is posted as passed, citing CLM-ONE-001", (_clm, _held, sources, held) => {
    const report = [{ uri: "one.feature", elements: [{ name: "one adds one", line: 5, tags: [{ name: "@CLM-ONE-001" }], steps: [{ keyword: "Given ", name: "one", result: { status: "passed" } }] }] }];
    const claimCodesAt = claimCodesAtOf(parsedFeatures(sources, [held]));
    expect(parseCucumberEvidenceObservations(report, undefined, claimCodesAt)).toEqual([
      { cites: [ONE], result: "passed", kind: "integration", place: "one.feature", notes: [], name: "one adds one" },
    ]);
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

  it("[CLM-OBS-049] a spec file RSpec quit on while loading is posted as never-ran, naming the file and its error", () => {
    const loadError = "\nWhile loading ./spec/a_spec.rb a `raise SyntaxError` occurred, RSpec will now quit.\nFailure/Error: __send__(method, file)\n";
    const report = { examples: [], summary: { errors_outside_of_examples_count: 1 }, messages: [loadError] };
    expect(parseRspecEvidenceObservations(report)).toEqual([{ cites: [], result: "never-ran", kind: "unit", place: "spec/a_spec.rb", notes: [], message: loadError }]);
  });

  it("[CLM-OBS-099] errors RSpec met outside any spec file are posted once, as never-ran, naming those errors and no file", () => {
    const loadError = "\nAn error occurred while loading ./spec/a_spec.rb.\nFailure/Error: require 'nope'\n";
    const beforeSuite = "\nAn error occurred in a `before(:suite)` hook.\nFailure/Error: raise \"no database\"\n";
    const afterSuite = "\nAn error occurred in an `after(:suite)` hook.\nFailure/Error: raise \"no cleanup\"\n";
    const report = { examples: [], summary: { errors_outside_of_examples_count: 3 }, messages: [loadError, beforeSuite, afterSuite] };
    expect(parseRspecEvidenceObservations(report)).toEqual([
      { cites: [], result: "never-ran", kind: "unit", place: "spec/a_spec.rb", notes: [], message: loadError },
      { cites: [], result: "never-ran", kind: "unit", place: "", notes: [], message: `${beforeSuite}\n${afterSuite}` },
    ]);
  });

  it("[CLM-OBS-047] a Go package that failed to build is posted as never-ran, naming the package and its error, as Go writes the report", () => {
    const goVersion = { property: [{ name: "go.version", value: "go1.27.2 linux/amd64" }] };
    const buildFailed = "FAIL\texample.com/a/broken [build failed]\n";
    const report = {
      testsuites: {
        testsuite: [
          { name: "", properties: goVersion },
          { name: "example.com/a/broken", properties: goVersion, testcase: [{ classname: "", name: "TestMain", failure: { message: "Failed", type: "", "#text": buildFailed } }] },
        ],
      },
    };
    expect(parseJunitEvidenceObservations(report)).toEqual([{ cites: [], result: "never-ran", kind: "unit", place: "example.com/a/broken", notes: [], message: buildFailed }]);
  });

  it("[CLM-OBS-050] a pytest test whose setup errored is posted as never-ran, citing its claim code, naming the test and its error", () => {
    const testcase = { classname: "tests.a", name: "test_a", properties: { property: [{ name: "clm", value: "CLM-ONE-001" }] }, error: { message: "failed on setup", "#text": "fixture 'db' not found" } };
    expect(parsePytestEvidenceObservations({ testsuites: { testsuite: [{ name: "pytest", testcase: [testcase] }] } })).toEqual([
      { cites: [ONE], result: "never-ran", kind: "unit", place: "tests.a", notes: [], name: "test_a", message: "fixture 'db' not found" },
    ]);
  });
});

describe("balance posts each result citing the nearest code it has, as each report gives it", () => {
  it("[CLM-OBS-073] a JUnit 5 test in a nested class is posted citing the code of its own class, not its outer class's", () => {
    const testcase = { classname: "[CLM-ONE-003] an outer class [CLM-ONE-002] an inner class", name: "a test" };
    const posted = parseJunitEvidenceObservations({ testsuites: { testsuite: [{ name: "example.OuterTest$InnerTest", testcase: [testcase] }] } });
    expect(posted.map(({ cites }) => cites)).toEqual([[{ featureCode: "ONE", number: "002" }]]);
  });

  it("[CLM-OBS-107] a Cucumber result from a row of two.feature cites that row's code, not the code one.feature has at the same line", () => {
    const outline = (code: string): string =>
      `@${code}\nFeature: ${code}\n\n  @integration\n  Scenario Outline: adds <n>\n    Given <n>\n\n    Examples:\n      | clm | n |\n      | CLM-${code}-001 | 1 |\n`;
    const claimCodesAt = claimCodesAtOf(parsedFeatures([outline("ONE"), outline("TWO")], ["one.feature", "two.feature"]));
    const report = [{ uri: "features/two.feature", elements: [{ name: "adds 1", line: 10, tags: [{ name: "@integration" }], steps: [{ keyword: "Given ", name: "1", result: { status: "passed" } }] }] }];
    expect(parseCucumberEvidenceObservations(report, undefined, claimCodesAt).map(({ cites }) => cites)).toEqual([[{ featureCode: "TWO", number: "001" }]]);
  });
});

describe("an Evidence Observation says where to look, as each report gives it", () => {
  it("[CLM-OBS-078] a test Vitest reports by its title alone is posted with that title as where to look", () => {
    const posted = parseVitestEvidenceObservations({ testResults: [{ name: "a.test.ts", status: "passed", assertionResults: [{ title: "adds two numbers", status: "passed" }] }] });
    expect(posted).toMatchObject([{ place: "a.test.ts", name: "adds two numbers" }]);
  });

  it("[CLM-OBS-098] a test file Jest recorded at an absolute path is placed at that path when no target's folder is given", () => {
    const file = "/home/runner/work/app/src/a.test.ts";
    const report = { testResults: [{ name: file, assertionResults: [{ title: "adds two numbers", fullName: "adds two numbers", status: "passed" }] }] };
    expect(parseVitestEvidenceObservations(report).map(({ place }) => place)).toEqual([file]);
  });
});
