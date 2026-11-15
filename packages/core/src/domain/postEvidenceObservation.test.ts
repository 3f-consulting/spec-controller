import { describe, expect, it } from "vitest";
import { featureAsWrittenFrom } from "../inputs/gherkin.js";
import { resultsByFileFrom } from "../inputs/vitest.js";
import { resultsBySuiteFrom } from "../inputs/junit.js";
import { resultsByExampleFrom } from "../inputs/rspec.js";
import { scenarioResultsFrom } from "../inputs/cucumber.js";
import { shellAnswers } from "../inputs/shell.js";
import { workflowStepsFrom } from "../inputs/workflows.js";
import type { ClaimCode } from "./claimCodes.js";
import { claimReconciliationsOf, type ClaimReconciliation } from "./claimReconciliation.js";
import { executableClaimsOf, type FeatureAsWritten } from "./postEvidenceObligation.js";
import { fitnessObservationsOf, observationsByExample, observationsByFile, observationsBySuite, observationsOfScenarios, type EvidenceObservation } from "./postEvidenceObservation.js";

const ONE_001: ClaimCode = { featureCode: "ONE", number: "001" };
const ONE_002: ClaimCode = { featureCode: "ONE", number: "002" };

// A test as Jest's JSON evidence report, which Vitest also writes, records it.
interface TestByFile {
  readonly ancestorTitles?: readonly string[];
  readonly title: string;
  readonly status: string;
  readonly failureMessages?: readonly string[];
}

const reportByFile = (file: string, tests: readonly TestByFile[], fileStatus = "passed", message = ""): unknown => ({
  testResults: [
    {
      name: file,
      status: fileStatus,
      message,
      assertionResults: tests.map(({ ancestorTitles = [], title, status, failureMessages = status === "failed" ? ["expected 2, received 1"] : [] }) => ({
        ancestorTitles,
        title,
        status,
        failureMessages,
      })),
    },
  ],
});

const postedByFile = (report: unknown, targetFolder = "/work"): EvidenceObservation[] => observationsByFile(resultsByFileFrom(report), targetFolder);

// A file that could not run, as Jest words it: under its own heading, the error indented beneath.
const jestSuiteFailure = (error: string): string => `  \u25cf Test suite failed to run\n\n    ${error}\n`;

// The same tests as Jest 30 writes its JSON evidence report, field for field: its run counts around the files, each
// test's own fields, its failure as Jest words it, and a file that could not run under Jest's own heading.
const jestReportByFile = (file: string, tests: readonly TestByFile[], fileStatus = "passed", message = ""): unknown => ({
  numFailedTestSuites: fileStatus === "failed" ? 1 : 0,
  numPassedTestSuites: fileStatus === "failed" ? 0 : 1,
  numTotalTestSuites: 1,
  numTotalTests: tests.length,
  success: fileStatus !== "failed",
  wasInterrupted: false,
  testResults: [
    {
      name: file,
      status: fileStatus,
      message: message === "" ? "" : jestSuiteFailure(message),
      summary: "",
      assertionResults: tests.map(({ ancestorTitles = [], title, status }) => ({
        ancestorTitles,
        title,
        fullName: [...ancestorTitles, title].join(" "),
        status,
        failureMessages: status === "failed" ? ["Error: expect(received).toBe(expected) // Object.is equality\n\nExpected: 2\nReceived: 1"] : [],
        failureDetails: [],
        numPassingAsserts: status === "passed" ? 1 : 0,
        invocations: 1,
        location: null,
      })),
    },
  ],
});

// The evidence report the runner given writes for the tests.
const reportFrom = (runner: "vitest" | "jest"): typeof reportByFile => (runner === "jest" ? jestReportByFile : reportByFile);

// Who wrote a JUnit XML report: Maven Surefire for JUnit 5 in Java, Gradle for JUnit 5 in Kotlin, go-junit-report for Go, and pytest.
type SuiteWriter = "surefire" | "gradle" | "go" | "pytest";

// Each writer's envelope around one suite, as it writes it.
function reportBySuite(writer: SuiteWriter, suite: string, testCases: string): string {
  if (writer === "surefire") {
    return `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="3.0.2" name="${suite}" time="0.042" tests="1" errors="0" skipped="0" failures="0">\n  <properties>\n  </properties>\n${testCases}\n</testsuite>`;
  }
  if (writer === "gradle") {
    return `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="${suite}" tests="1" skipped="0" failures="0" errors="0" timestamp="2026-10-15T20:00:06.809Z" hostname="runner" time="0.034">\n  <properties/>\n${testCases}\n  <system-out><![CDATA[]]></system-out>\n  <system-err><![CDATA[]]></system-err>\n</testsuite>`;
  }
  if (writer === "go") {
    return `<?xml version="1.0" encoding="UTF-8"?>\n<testsuites tests="1" failures="0" errors="0" time="0.005">\n\t<testsuite tests="1" failures="0" time="0.005" name="${suite}" timestamp="2026-10-14T22:35:27Z">\n\t\t<properties>\n\t\t\t<property name="go.version" value="go1.27.2 linux/amd64"></property>\n\t\t</properties>\n${testCases}\n\t</testsuite>\n</testsuites>`;
  }
  return `<?xml version="1.0" encoding="utf-8"?><testsuites name="pytest tests"><testsuite name="${suite}" errors="0" failures="0" skipped="0" tests="1" time="0.039">${testCases}</testsuite></testsuites>`;
}

const testCase = (className: string, name: string, inside = ""): string => `<testcase classname="${className}" name="${name}" time="0.001">${inside}</testcase>`;

const CLM_PROPERTY = '<properties><property name="clm" value="CLM-ONE-001" /></properties>';

const postedBySuite = (writer: SuiteWriter, suite: string, testCases: string): EvidenceObservation[] =>
  observationsBySuite(resultsBySuiteFrom(reportBySuite(writer, suite, testCases), writer === "pytest" ? "pytest" : "junit"), "/work");

// What a row checks of each Evidence Observation posted.
const resultAndCitations = ({ result, cites }: EvidenceObservation): { result: string; cites: readonly ClaimCode[] } => ({ result, cites });

// An example as RSpec's JSON evidence report records it, in its group.
interface Example {
  readonly group?: string;
  readonly description: string;
  readonly status: string;
  readonly message?: string;
}

// RSpec writes its messages only when it has some: a filtered run's Run options message, then each error outside its
// examples.
const reportByExample = (examples: readonly Example[], errorsOutsideExamples: readonly string[] = [], filtered = false): unknown => {
  const messages = [...(filtered ? ["Run options: include {:focus=>true}"] : []), ...errorsOutsideExamples];
  return {
    version: "3.13.0",
    ...(messages.length > 0 && { messages }),
    examples: examples.map(({ group = "Adding", description, status, message = "\nexpected: 2\n     got: 1\n" }, at) => ({
      id: `./spec/adds_spec.rb[1:${at + 1}]`,
      description,
      full_description: `${group} ${description}`,
      status,
      file_path: "./spec/adds_spec.rb",
      line_number: 2 + at * 2,
      run_time: 0.000378728,
      pending_message: status === "pending" ? "not yet" : null,
      ...(status === "failed" && { exception: { class: "RSpec::Expectations::ExpectationNotMetError", message } }),
    })),
    summary: { duration: 0.014, example_count: examples.length, failure_count: 0, pending_count: 0, errors_outside_of_examples_count: errorsOutsideExamples.length },
    summary_line: `${examples.length} examples, 0 failures`,
  };
};

const postedByExample = (report: unknown): EvidenceObservation[] => observationsByExample(resultsByExampleFrom(report), "/work");

// A step as Cucumber's JSON evidence report records it: its keyword, its text and its status.
type StepRun = readonly [keyword: string, text: string, status: string, errorMessage?: string];

interface ScenarioRun {
  readonly title?: string;
  readonly line?: number;
  readonly tags: readonly string[];
  readonly steps: readonly StepRun[];
}

const reportByScenario = (uri: string, scenarios: readonly ScenarioRun[]): unknown => [
  {
    uri,
    id: "one",
    keyword: "Feature",
    name: "one",
    line: 2,
    tags: [{ name: "@ONE", line: 1 }],
    elements: scenarios.map(({ title = "one adds one", line = 5, tags, steps }) => ({
      id: `one;${title.replaceAll(" ", "-")}`,
      keyword: "Scenario",
      type: "scenario",
      name: title,
      line,
      tags: tags.map((tag) => ({ name: `@${tag}`, line: line - 1 })),
      steps: steps.map(([keyword, text, status, errorMessage = "AssertionError: expected 2 to equal 3"], at) => ({
        keyword,
        name: text,
        line: line + 1 + at,
        ...(status === "undefined" ? {} : { match: { location: "tests/steps/one.steps.ts:3" } }),
        result: { status, duration: 1000, ...(status === "failed" && { error_message: errorMessage }) },
      })),
    })),
  },
];

const postedByScenario = (report: unknown, features: readonly FeatureAsWritten[] = []): EvidenceObservation[] =>
  observationsOfScenarios(scenarioResultsFrom(report), features, "/work");

const PASSED: StepRun = ["Given ", "one adds one", "passed"];

describe("a Cucumber Background and hook post nothing of their own", () => {
  it("[CLM-OBS-121] a scenario in Cucumber's evidence report tagged @CLM-ONE-001, every step passed after a Background and a hook that passed, is read once, as passed, citing CLM-ONE-001", () => {
    const passed = { status: "passed" };
    const report = [
      {
        uri: "features/one.feature",
        elements: [
          { type: "background", name: "", line: 3, steps: [{ keyword: "Given ", name: "a thing", result: passed }] },
          {
            type: "scenario",
            name: "one adds one",
            line: 6,
            tags: [{ name: "@integration" }, { name: "@CLM-ONE-001" }],
            steps: [{ keyword: "Before", result: passed }, { keyword: "Given ", name: "one adds one", result: passed }],
          },
        ],
      },
    ];

    expect(postedByScenario(report).map(({ result, cites }) => ({ result, cites }))).toEqual([{ result: "passed", cites: [{ featureCode: "ONE", number: "001" }] }]);
  });
});

describe("balance reads a result as passed or failed, citing the code it names", () => {
  it.each<[string, "vitest" | "jest", string, string]>([
    ["CLM-OBS-017", "vitest", "passed", "passed"],
    ["CLM-OBS-018", "vitest", "failed", "failed"],
    ["CLM-OBS-017", "jest", "passed", "passed"],
    ["CLM-OBS-018", "jest", "failed", "failed"],
  ])("[%s] a result in %s's evidence report, CLM-ONE-001 in brackets in its title, that %s, is read as %s, citing CLM-ONE-001", (_clm, from, status, result) => {
    const posted = postedByFile(reportFrom(from)("/work/one.test.ts", [{ title: "[CLM-ONE-001] it holds", status }], status));

    expect(posted.map(({ result: postedResult, cites }) => ({ result: postedResult, cites }))).toEqual([{ result, cites: [ONE_001] }]);
  });
});

describe("balance reads a result as passed or failed, citing the code it names, from a report kept by suite", () => {
  it.each<[string, SuiteWriter, string, string, string, string, string]>([
    ["CLM-OBS-021", "pytest", "pytest", "test_adds", "test_adds_one", CLM_PROPERTY, "passed"],
    ["CLM-OBS-022", "pytest", "pytest", "test_adds", "test_adds_one", `${CLM_PROPERTY}<failure message="assert 1 == 2">def test_adds_one():\n&gt;       assert 1 == 2</failure>`, "failed"],
    ["CLM-OBS-023", "go", "example.com/adds", "example.com/adds", "TestAdds/[CLM-ONE-001]_adds_one", "", "passed"],
    ["CLM-OBS-024", "go", "example.com/adds", "example.com/adds", "TestAdds/[CLM-ONE-001]_adds_one", '<failure message="Failed" type="">=== RUN   TestAdds/[CLM-ONE-001]_adds_one&#xA;    adds_test.go:9: the assertion failed&#xA;</failure>', "failed"],
    ["CLM-OBS-025", "surefire", "example.AddsTest", "example.AddsTest", "[CLM-ONE-001] adds one", "", "passed"],
    ["CLM-OBS-026", "surefire", "example.AddsTest", "example.AddsTest", "[CLM-ONE-001] adds one", '<failure message="expected: &lt;2&gt; but was: &lt;1&gt;" type="org.opentest4j.AssertionFailedError"><![CDATA[org.opentest4j.AssertionFailedError: expected: <2> but was: <1>]]></failure>', "failed"],
    ["CLM-OBS-118", "surefire", "example.AddsTest", "example.AddsTest", "[CLM-ONE-001] adds one", '<error message="the database was not there" type="java.lang.IllegalStateException"><![CDATA[java.lang.IllegalStateException: the database was not there]]></error>', "failed"],
    ["CLM-OBS-027", "gradle", "example.AddsTest", "example.AddsTest", "[CLM-ONE-001] adds one", "", "passed"],
    ["CLM-OBS-028", "gradle", "example.AddsTest", "example.AddsTest", "[CLM-ONE-001] adds one", '<failure message="org.opentest4j.AssertionFailedError: expected: &lt;2&gt; but was: &lt;1&gt;" type="org.opentest4j.AssertionFailedError">org.opentest4j.AssertionFailedError: expected: &lt;2&gt; but was: &lt;1&gt;\n</failure>', "failed"],
  ])("[%s] a result in %s's evidence report citing CLM-ONE-001 is read as it went, citing CLM-ONE-001", (_clm, writer, suite, className, name, inside, result) => {
    const posted = postedBySuite(writer, suite, testCase(className, name, inside));

    expect(posted.map(resultAndCitations)).toEqual([{ result, cites: [ONE_001] }]);
  });

  it("[CLM-OBS-055] balance posts a Kotlin class whose setup failed as one failed Evidence Observation, citing no claim code", () => {
    const failure = '<failure message="java.lang.IllegalStateException: the shared resource could not be set up" type="java.lang.IllegalStateException">java.lang.IllegalStateException: the shared resource could not be set up\n</failure>';
    const posted = postedBySuite("gradle", "[CLM-ONE-001] a class", testCase("example.SetupFailsTest", "initializationError", failure));

    expect(posted.map(resultAndCitations)).toEqual([{ result: "failed", cites: [] }]);
  });
});

describe("balance posts nothing for a test that was skipped, from a report kept by suite", () => {
  it.each<[string, SuiteWriter, string, string, string, string]>([
    ["CLM-OBS-038", "pytest", "pytest", "test_adds", "test_adds_one", `${CLM_PROPERTY}<skipped type="pytest.skip" message="the behaviour is not built yet">test_adds.py:4: the behaviour is not built yet</skipped>`],
    ["CLM-OBS-039", "go", "example.com/adds", "example.com/adds", "TestAdds/[CLM-ONE-001]_adds_one", '<skipped message="=== RUN   TestAdds/[CLM-ONE-001]_adds_one&#xA;    adds_test.go:20: not yet&#xA;"></skipped>'],
    ["CLM-OBS-040", "surefire", "example.AddsTest", "example.AddsTest", "[CLM-ONE-001] adds one", '<skipped message="not yet written"/>'],
    ["CLM-OBS-040", "surefire", "example.AddsTest", "example.AddsTest", "[CLM-ONE-001] adds one", '<skipped type="org.opentest4j.TestAbortedException"><![CDATA[org.opentest4j.TestAbortedException: Assumption failed: the environment is not ready]]></skipped>'],
    ["CLM-OBS-041", "gradle", "example.AddsTest", "example.AddsTest", "[CLM-ONE-001] adds one", "<skipped/>"],
    ["CLM-OBS-041", "gradle", "example.AddsTest", "example.AddsTest", "[CLM-ONE-001] adds one", '<skipped><![CDATA[org.opentest4j.TestAbortedException: Assumption failed: the environment is not ready]]></skipped>'],
  ])("[%s] a test in %s's evidence report citing CLM-ONE-001 that was skipped, disabled or whose assumption failed posts nothing", (_clm, writer, suite, className, name, inside) => {
    expect(postedBySuite(writer, suite, testCase(className, name, inside))).toEqual([]);
  });
});

describe("balance reads a result as passed or failed, citing the code it names, from a report kept by example", () => {
  it.each<[string, string, string]>([
    ["CLM-OBS-029", "passed", "passed"],
    ["CLM-OBS-030", "failed", "failed"],
  ])("[%s] a result in RSpec's evidence report, CLM-ONE-001 in brackets in its description, that %s, is read as %s, citing CLM-ONE-001", (_clm, status, result) => {
    const posted = postedByExample(reportByExample([{ description: "[CLM-ONE-001] adds one", status }], [], true));

    expect(posted.map(resultAndCitations)).toEqual([{ result, cites: [ONE_001] }]);
  });

  it("[CLM-OBS-042] an example in RSpec's evidence report citing CLM-ONE-001 that was skipped or pending posts nothing", () => {
    const posted = postedByExample(reportByExample([{ description: "[CLM-ONE-001] adds one", status: "pending" }]));

    expect(posted).toEqual([]);
  });
});

describe("balance reads a result as passed or failed, citing the code it names, from a report kept by scenario", () => {
  it.each<[string, string, readonly StepRun[]]>([
    ["CLM-OBS-031", "passed", [PASSED, ["Then ", "it is two", "passed"]]],
    ["CLM-OBS-032", "failed", [["Given ", "one adds one", "failed"], ["Then ", "it is two", "skipped"]]],
  ])("[%s] a scenario in Cucumber's evidence report tagged @CLM-ONE-001 is read as %s when every step passed, or one failed and the next was skipped, citing CLM-ONE-001", (_clm, result, steps) => {
    const posted = postedByScenario(reportByScenario("features/one.feature", [{ tags: ["integration", "CLM-ONE-001"], steps }]));

    expect(posted.map(resultAndCitations)).toEqual([{ result, cites: [ONE_001] }]);
  });

  it.each<[string, readonly StepRun[]]>([
    ["CLM-OBS-043", [PASSED, ["Then ", "it is two", "skipped"]]],
    ["CLM-OBS-106", []],
  ])("[%s] a scenario in Cucumber's evidence report tagged @CLM-ONE-001 that skipped a step and failed none, or had no steps, posts nothing", (_clm, steps) => {
    expect(postedByScenario(reportByScenario("features/one.feature", [{ tags: ["integration", "CLM-ONE-001"], steps }]))).toEqual([]);
  });

  it("[CLM-OBS-106] a scenario in Cucumber's evidence report tagged @CLM-ONE-001 whose only steps were its Before and After hooks, as cucumber-js writes a scenario with no steps, posts nothing", () => {
    const passed = { status: "passed", duration: 1000 };
    const report = [
      {
        uri: "features/one.feature",
        elements: [
          {
            type: "scenario",
            name: "one adds one",
            line: 6,
            tags: [{ name: "@integration" }, { name: "@CLM-ONE-001" }],
            steps: [{ keyword: "Before", hidden: true, result: passed }, { keyword: "After", hidden: true, result: passed }],
          },
        ],
      },
    ];

    expect(postedByScenario(report)).toEqual([]);
  });

  it("[CLM-OBS-130] Cucumber's evidence report leaving out a feature's empty elements, and a scenario's empty steps and another's empty tags, as Cucumber for Ruby and the JVM write it, posts the scenario with no tags alone, as passed, citing no claim code", () => {
    const passed = { status: "passed", duration: 1000 };
    const report = [
      { uri: "features/empty.feature", id: "empty", keyword: "Feature", name: "empty", line: 1, description: "" },
      {
        uri: "features/one.feature",
        id: "one",
        keyword: "Feature",
        name: "one",
        line: 1,
        elements: [
          { id: "one;stepless", keyword: "Scenario", type: "scenario", name: "stepless", line: 4, tags: [{ name: "@CLM-ONE-001", line: 3 }] },
          { id: "one;untagged", keyword: "Scenario", type: "scenario", name: "untagged", line: 6, steps: [{ keyword: "Given ", name: "one adds one", line: 7, result: passed }] },
        ],
      },
    ];

    expect(postedByScenario(report).map(({ name, result, cites }) => ({ name, result, cites }))).toEqual([{ name: "untagged", result: "passed", cites: [] }]);
  });
});

describe("balance posts nothing for a test that was skipped", () => {
  it.each<[string, "vitest" | "jest", readonly string[]]>([
    ["CLM-OBS-036", "vitest", ["skipped", "todo"]],
    ["CLM-OBS-036", "jest", ["pending", "todo"]],
  ])("[%s] a test in %s's evidence report citing CLM-ONE-001, skipped or marked todo, posts nothing", (_clm, from, statuses) => {
    const tests = statuses.map((status) => ({ title: "[CLM-ONE-001] it holds", status }));

    expect(postedByFile(reportFrom(from)("/work/one.test.ts", tests))).toEqual([]);
  });
});

describe("balance posts what could not run as never ran", () => {
  it.each<[string, "vitest" | "jest", string]>([
    ["CLM-OBS-044", "vitest", "Error: Cannot find module './adds.js'"],
    ["CLM-OBS-045", "jest", "the test file could not be loaded"],
  ])("[%s] a test file in %s's evidence report that could not run is posted as never-ran, citing no claim code, naming the file and its error", (_clm, from, error) => {
    const posted = postedByFile(reportFrom(from)("/work/a.test.ts", [], "failed", error));

    expect(posted.map(({ result, cites, place, message }) => ({ result, cites, place, message }))).toEqual([
      { result: "never-ran", cites: [], place: "a.test.ts", message: from === "jest" ? jestSuiteFailure(error) : error },
    ]);
  });
});

describe("balance posts what could not run as never ran, from a report kept by suite", () => {
  it.each<[string, SuiteWriter, string, string, string, string, readonly ClaimCode[], string, string, string | undefined]>([
    ["CLM-OBS-046", "pytest", "pytest", "", "test_uncollectable", '<error message="collection failure">test_uncollectable.py:1: in &lt;module&gt;\n    import module_that_does_not_exist\nE   ModuleNotFoundError: No module named \'module_that_does_not_exist\'</error>', [], "test_uncollectable", "collection failure", undefined],
    ["CLM-OBS-047", "go", "example.com/broken", "", "TestMain", '<failure message="Failed" type="">FAIL&#x9;example.com/broken [build failed]&#xA;</failure>', [], "example.com/broken", "Failed", undefined],
    ["CLM-OBS-100", "go", "example.com/setup", "", "TestMain", '<failure message="Failed" type="">main_test.go:12: the database could not be reached&#xA;FAIL&#x9;example.com/setup&#x9;0.004s&#xA;</failure>', [], "example.com/setup", "Failed", undefined],
    ["CLM-OBS-048", "surefire", "example.SetupFailsTest", "example.SetupFailsTest", "", '<error message="the shared resource could not be set up" type="java.lang.IllegalStateException"><![CDATA[java.lang.IllegalStateException: the shared resource could not be set up]]></error>', [], "example.SetupFailsTest", "the shared resource could not be set up", undefined],
    ["CLM-OBS-050", "pytest", "pytest", "test_adds", "test_adds_one", `${CLM_PROPERTY}<error message="failed on setup with &quot;RuntimeError: the resource could not be set up&quot;">@pytest.fixture\ndef broken_resource():\n&gt;       raise RuntimeError("the resource could not be set up")</error>`, [ONE_001], "test_adds", 'failed on setup with "RuntimeError: the resource could not be set up"', "test_adds_one"],
  ])("[%s] what could not run in %s's evidence report is posted as never-ran, citing what it cites and naming where and its error", (_clm, writer, suite, className, name, inside, cites, place, message, test) => {
    const posted = postedBySuite(writer, suite, testCase(className, name, inside));

    expect(posted.map(({ result, cites: cited, place: placed, name: named, message: said }) => ({ result, cites: cited, place: placed, name: named, message: said }))).toStrictEqual([
      { result: "never-ran", cites, place, name: test, message },
    ]);
  });
});

describe("balance posts what could not run as never ran, from a report kept by example", () => {
  it.each<[string, string, string]>([
    [
      "CLM-OBS-049",
      "\nAn error occurred while loading ./spec/unloadable_spec.rb.\nFailure/Error: __send__(method, file)\n\nSyntaxError:\n  Unmatched `{', missing `}' ?\n",
      "./spec/unloadable_spec.rb",
    ],
    ["CLM-OBS-049", "\nAn error occurred while loading ./spec/unloadable_spec.rb\nSyntaxError:\n  Unmatched `{', missing `}' ?\n", "./spec/unloadable_spec.rb"],
    ["CLM-OBS-099", "\nAn error occurred in a `before(:suite)` hook.\nFailure/Error: raise \"the database could not be reached\"\n", ""],
  ])("[%s] RSpec's evidence report saying %j is posted as never-ran, citing no claim code, naming where and the error", (_clm, error, place) => {
    const posted = postedByExample(reportByExample([], [error], true));

    expect(posted.map(({ result, cites, place: placed, message }) => ({ result, cites, place: placed, message }))).toEqual([
      { result: "never-ran", cites: [], place, message: error },
    ]);
  });

  it("[CLM-OBS-129] RSpec's evidence report whose only message is a spec file's load error is posted as never-ran, citing no claim code, naming the file and its error", () => {
    const error = "\nAn error occurred while loading ./spec/unloadable_spec.rb.\nFailure/Error: __send__(method, file)\n\nSyntaxError:\n  Unmatched `{', missing `}' ?\n";
    // A run with no filter writes no Run options message, so its messages are its load errors alone.
    const posted = postedByExample(reportByExample([], [error]));

    expect(posted.map(({ result, cites, place, message }) => ({ result, cites, place, message }))).toEqual([
      { result: "never-ran", cites: [], place: "./spec/unloadable_spec.rb", message: error },
    ]);
  });
});

describe("balance posts what could not run as never ran, from a report kept by scenario", () => {
  it.each<[string, readonly StepRun[]]>([
    ["CLM-OBS-051", [["Given ", "one adds one", "ambiguous"], ["Then ", "it is two", "skipped"]]],
    ["CLM-OBS-052", [["Given ", "one adds one", "undefined"], ["Then ", "it is two", "skipped"]]],
    ["CLM-OBS-110", [["Given ", "one is ready", "failed"], ["Given ", "one adds one", "undefined"]]],
  ])("[%s] a scenario in Cucumber's evidence report tagged @CLM-ONE-001 whose step \"one adds one\" matched no single definition is posted as never-ran, citing CLM-ONE-001 and naming the step \"Given one adds one\"", (_clm, steps) => {
    const posted = postedByScenario(reportByScenario("features/one.feature", [{ tags: ["integration", "CLM-ONE-001"], steps }]));

    expect(posted.map(({ result, cites, message }) => ({ result, cites, message }))).toEqual([{ result: "never-ran", cites: [ONE_001], message: "Given one adds one" }]);
  });
});

describe("balance identifies a result's kind of quality check from its source and its tags", () => {
  it("[CLM-OBS-059] a result in Vitest's evidence report is read as unit evidence", () => {
    const posted = postedByFile(reportByFile("/work/one.test.ts", [{ title: "[CLM-ONE-001] it holds", status: "failed" }], "failed"));

    expect(posted.map(({ kind }) => kind)).toEqual(["unit"]);
  });
});

describe("a test report kept by suite gives unit evidence", () => {
  it("[CLM-OBS-060] a result in pytest's evidence report is read as unit evidence", () => {
    expect(postedBySuite("pytest", "pytest", testCase("test_adds", "test_adds_one", CLM_PROPERTY)).map(({ kind }) => kind)).toEqual(["unit"]);
  });
});

describe("balance identifies a Cucumber result's kind of quality check from its tags", () => {
  it.each<[string, readonly string[], string, readonly string[]]>([
    ["CLM-OBS-061", ["CLM-ONE-001", "smoke"], "passed", ["integration"]],
    ["CLM-OBS-062", ["CLM-ONE-001", "e2e"], "passed", ["e2e"]],
    ["CLM-OBS-063", ["CLM-ONE-001", "performance"], "passed", ["performance"]],
    ["CLM-OBS-064", ["CLM-ONE-001", "integration", "e2e"], "passed", ["integration", "e2e"]],
    ["CLM-OBS-111", ["CLM-ONE-001", "integration", "e2e"], "undefined", ["integration", "e2e"]],
  ])("[%s] a scenario in Cucumber's evidence report tagged %j whose step %s is read as the kinds of quality check its tags name", (_clm, tags, status, kinds) => {
    const posted = postedByScenario(reportByScenario("features/one.feature", [{ tags, steps: [["Given ", "one adds one", status]] }]));

    expect(posted.map(({ kind }) => kind)).toEqual(kinds);
  });
});

describe("balance posts a nested test citing its own code, or its parent's code when the report gives one", () => {
  it.each<[string, "vitest" | "jest", string, string, readonly ClaimCode[]]>([
    ["CLM-OBS-065", "vitest", "CLM-ONE-001 in brackets in its title", "[CLM-ONE-001] it holds", [ONE_001]],
    ["CLM-OBS-066", "vitest", "no claim code", "it holds", [ONE_002]],
    ["CLM-OBS-067", "vitest", "CLM-ONE-001 in its title, with no brackets", "CLM-ONE-001 it holds", [ONE_002]],
    ["CLM-OBS-065", "jest", "CLM-ONE-001 in brackets in its title", "[CLM-ONE-001] it holds", [ONE_001]],
    ["CLM-OBS-066", "jest", "no claim code", "it holds", [ONE_002]],
  ])("[%s] a passing test in %s's evidence report with %s, nested in a describe with CLM-ONE-002 in brackets in its title, is posted citing its nearest code", (_clm, from, _titled, title, cites) => {
    const posted = postedByFile(reportFrom(from)("/work/one.test.ts", [{ ancestorTitles: ["[CLM-ONE-002] a group"], title, status: "passed" }]));

    expect(posted.map(({ cites: cited }) => cited)).toEqual([cites]);
  });
});

describe("balance posts a nested test from a report kept by suite citing its own code, or its parent's code when the report gives one", () => {
  it.each<[string, SuiteWriter, string, string, string, string, readonly ClaimCode[]]>([
    ["CLM-OBS-070", "go", "CLM-ONE-001 in brackets in its subtest's name, under a subtest with CLM-ONE-002 in brackets", "example.com/adds", "TestAdds/[CLM-ONE-002]_a_group/[CLM-ONE-001]_adds_one", "example.com/adds", [ONE_001]],
    ["CLM-OBS-071", "go", "no claim code, under a subtest with CLM-ONE-002 in brackets", "example.com/adds", "TestAdds/[CLM-ONE-002]_a_group/adds_one", "example.com/adds", [ONE_002]],
    ["CLM-OBS-072", "surefire", "CLM-ONE-001 in brackets in its display name, in a class with CLM-ONE-002 in brackets", "[CLM-ONE-002] a class", "[CLM-ONE-001] adds one", "[CLM-ONE-002] a class", [ONE_001]],
    ["CLM-OBS-073", "surefire", "no claim code, in a class with CLM-ONE-002 in brackets", "[CLM-ONE-002] a class", "adds one", "[CLM-ONE-002] a class", [ONE_002]],
    ["CLM-OBS-073", "surefire", "no claim code, its display name 007, in a class with CLM-ONE-002 in brackets", "[CLM-ONE-002] a class", "007", "[CLM-ONE-002] a class", [ONE_002]],
    [
      "CLM-OBS-120",
      "surefire",
      "no claim code, in a class with CLM-ONE-002 in brackets nested in one with CLM-ONE-001 in brackets",
      "[CLM-ONE-001] an outer class [CLM-ONE-002] an inner class",
      "adds one",
      "[CLM-ONE-001] an outer class [CLM-ONE-002] an inner class",
      [ONE_002],
    ],
    ["CLM-OBS-074", "gradle", "no claim code, in a class with CLM-ONE-002 in brackets", "[CLM-ONE-002] a class", "adds one", "example.AddsTest", []],
  ])("[%s] a passing test in %s's evidence report with %s is posted citing its nearest code", (_clm, writer, _named, suite, name, className, cites) => {
    expect(postedBySuite(writer, suite, testCase(className, name)).map(({ cites: cited }) => cited)).toEqual([cites]);
  });
});

describe("balance posts a nested example citing its own code, or its group's code", () => {
  it.each<[string, string, string, readonly ClaimCode[]]>([
    ["CLM-OBS-075", "CLM-ONE-001 in brackets in its description", "[CLM-ONE-001] adds one", [ONE_001]],
    ["CLM-OBS-076", "no claim code", "adds one", [ONE_002]],
  ])("[%s] a passing example in RSpec's evidence report with %s, in a group with CLM-ONE-002 in brackets in its description, is posted citing its nearest code", (_clm, _described, description, cites) => {
    const posted = postedByExample(reportByExample([{ group: "[CLM-ONE-002] Adding", description, status: "passed" }]));

    expect(posted.map(({ cites: cited }) => cited)).toEqual([cites]);
  });
});

// A feature file whose two-row Outline has its rows at lines 10 and 11, with the claim codes CLM-<FFF>-001 and -002.
const outlineIn = (featureCode: string): string =>
  `@${featureCode}\nFeature: ${featureCode.toLowerCase()}\n\n  @integration\n  Scenario Outline: adds <n>\n    Given one adds <n>\n\n    Examples:\n      | clm | n |\n      | CLM-${featureCode}-001 | 1 |\n      | CLM-${featureCode}-002 | 2 |\n`;

describe("balance posts each row of an Outline citing its own claim code", () => {
  it("[CLM-OBS-077] two rows of one Scenario Outline, CLM-ONE-001 and CLM-ONE-002, each with a result in Cucumber's evidence report, are posted citing the claim code of their row", () => {
    const report = reportByScenario("features/one.feature", [
      { title: "adds 1", line: 10, tags: ["integration"], steps: [["Given ", "one adds 1", "passed"]] },
      { title: "adds 2", line: 11, tags: ["integration"], steps: [["Given ", "one adds 2", "passed"]] },
    ]);

    expect(postedByScenario(report, [featureAsWrittenFrom("one.feature", outlineIn("ONE"))]).map(({ cites }) => cites)).toEqual([[ONE_001], [ONE_002]]);
  });

  it.each([
    ["CLM-OBS-107", "two.feature", "TWO"],
    ["CLM-OBS-138", "sub/one.feature", "SUB"],
  ] as const)("[%s] a result for the row at line 10 of %s, when one.feature also has a row at line 10, is posted citing that file's row", (_clm, file, featureCode) => {
    const features = [featureAsWrittenFrom("one.feature", outlineIn("ONE")), featureAsWrittenFrom(file, outlineIn(featureCode))];
    const report = reportByScenario(`features/${file}`, [{ title: "adds 1", line: 10, tags: ["integration"], steps: [["Given ", "one adds 1", "passed"]] }]);

    expect(postedByScenario(report, features).map(({ cites }) => cites)).toEqual([[{ featureCode, number: "001" }]]);
  });
});

describe("balance posts an Evidence Observation saying where to look", () => {
  it.each<[string, string, string]>([
    ["CLM-OBS-078", "a.test.ts", "/work/acme"],
    ["CLM-OBS-079", "/work/acme/a.test.ts", "/work/acme"],
  ])("[%s] the test \"adds two numbers\" in %s, for a target at %s, is posted saying where to look: \"adds two numbers\" in a.test.ts", (_clm, file, targetFolder) => {
    const posted = postedByFile(reportByFile(file, [{ title: "[CLM-ONE-001] adds two numbers", status: "passed" }]), targetFolder);

    expect(posted.map(({ place, name }) => ({ place, name }))).toEqual([{ place: "a.test.ts", name: "[CLM-ONE-001] adds two numbers" }]);
  });
});

describe("balance posts a Cucumber result saying where to look", () => {
  it("[CLM-OBS-080] the scenario \"one adds one\" in one.feature is posted saying where to look: \"one adds one\" in one.feature", () => {
    const posted = postedByScenario(reportByScenario("one.feature", [{ tags: ["integration", "CLM-ONE-001"], steps: [PASSED] }]));

    expect(posted.map(({ place, name }) => ({ place, name }))).toEqual([{ place: "one.feature", name: "one adds one" }]);
  });
});

describe("balance places a test file outside the target's folder at the absolute path its evidence report recorded", () => {
  it("[CLM-OBS-098] a Jest test file at /home/runner/work/app/src/a.test.ts, for a target at /work/app, is placed at that path", () => {
    const file = "/home/runner/work/app/src/a.test.ts";
    const posted = postedByFile(reportByFile(file, [{ title: "[CLM-ONE-001] it holds", status: "passed" }]), "/work/app");

    expect(posted.map(({ place }) => place)).toEqual([file]);
  });
});

// A corpus of two scenarios, tagged with the codes given, each raising a unit Evidence Obligation.
const claimsTagged = (first: string, second: string) =>
  executableClaimsOf([
    featureAsWrittenFrom("one.feature", `@ONE\nFeature: one\n\n  @unit @${first}\n  Scenario: first\n    Given a step\n\n  @unit @${second}\n  Scenario: second\n    Given a step\n`),
  ], { deferralTags: [], strict: false });

const written = ({ featureCode, number }: ClaimCode): string => `CLM-${featureCode}-${number}`;

// Each Claim Reconciliation as the claim it is for, and the codes each of its Evidence Observations cites.
const filed = (reconciliations: readonly ClaimReconciliation[]): { claim: string; cites: string[][] }[] =>
  reconciliations.map(({ claim, qualityCheckReconciliations }) => ({
    claim: "obligations" in claim ? `the claim of ${written(claim.claimCode!)}` : claim.claimCode ? `the phantom claim of ${written(claim.claimCode)}` : "the unnamed claim",
    cites: qualityCheckReconciliations.flatMap(({ observation }) => (observation ? [observation.cites.map(written)] : [])),
  }));

// A passing test in the evidence report of the runner given, with the title given.
const passingTitled = (runner: "vitest" | "jest", title: string): EvidenceObservation[] => postedByFile(reportFrom(runner)("/work/one.test.ts", [{ title, status: "passed" }]));

describe("balance posts each Evidence Observation to the claim it cites, or else to a phantom claim or the unnamed claim", () => {
  it("[CLM-OBS-082] balance posts an Evidence Observation to the executable claim whose code it cites", () => {
    const reconciliations = claimReconciliationsOf(claimsTagged("CLM-ONE-001", "CLM-ONE-002"), passingTitled("vitest", "[CLM-ONE-001] it holds"));

    expect(filed(reconciliations)).toEqual([
      { claim: "the claim of CLM-ONE-001", cites: [["CLM-ONE-001"]] },
      { claim: "the claim of CLM-ONE-002", cites: [] },
    ]);
  });

  it("[CLM-OBS-083] balance posts an Evidence Observation citing a code no executable claim has to its phantom claim", () => {
    const reconciliations = claimReconciliationsOf(claimsTagged("CLM-ONE-001", "CLM-ONE-002"), passingTitled("vitest", "[CLM-ONE-999] it holds"));

    expect(filed(reconciliations).filter(({ cites }) => cites.length > 0)).toEqual([{ claim: "the phantom claim of CLM-ONE-999", cites: [["CLM-ONE-999"]] }]);
  });
});

describe("balance posts an Evidence Observation no single executable claim can take to the unnamed claim", () => {
  it.each<[string, string, string, readonly string[], string, () => EvidenceObservation[]]>([
    ["CLM-OBS-084", "vitest", "no claim code", [], "CLM-ONE-002", () => passingTitled("vitest", "it holds")],
    ["CLM-OBS-085", "vitest", "CLM-ABCDEF-001 in brackets", [], "CLM-ONE-002", () => passingTitled("vitest", "[CLM-ABCDEF-001] it holds")],
    ["CLM-OBS-086", "vitest", "CLM-ONE-999 with no brackets", [], "CLM-ONE-002", () => passingTitled("vitest", "CLM-ONE-999 it holds")],
    ["CLM-OBS-105", "pytest", "the clm property CLM-A-001", [], "CLM-ONE-002", () => postedBySuite("pytest", "pytest", testCase("test_adds", "test_adds_one", '<properties><property name="clm" value="CLM-A-001" /></properties>'))],
    ["CLM-OBS-088", "vitest", "CLM-ONE-001 in brackets, a code two claims share", ["CLM-ONE-001"], "CLM-ONE-001", () => passingTitled("vitest", "[CLM-ONE-001] it holds")],
    ["CLM-OBS-089", "vitest", "CLM-ONE-001 and CLM-ONE-002, each in brackets", ["CLM-ONE-001", "CLM-ONE-002"], "CLM-ONE-002", () => passingTitled("vitest", "[CLM-ONE-001] [CLM-ONE-002] it holds")],
    ["CLM-OBS-090", "jest", "CLM-ONE-001 and CLM-ONE-002, each in brackets", ["CLM-ONE-001", "CLM-ONE-002"], "CLM-ONE-002", () => passingTitled("jest", "[CLM-ONE-001] [CLM-ONE-002] it holds")],
    [
      "CLM-OBS-091",
      "pytest",
      "the clm properties CLM-ONE-001 and CLM-ONE-002",
      ["CLM-ONE-001", "CLM-ONE-002"],
      "CLM-ONE-002",
      () => postedBySuite("pytest", "pytest", testCase("test_adds", "test_adds_one", '<properties><property name="clm" value="CLM-ONE-001" /><property name="clm" value="CLM-ONE-002" /></properties>')),
    ],
    ["CLM-OBS-092", "go", "CLM-ONE-001 and CLM-ONE-002, each in brackets", ["CLM-ONE-001", "CLM-ONE-002"], "CLM-ONE-002", () => postedBySuite("go", "example.com/adds", testCase("example.com/adds", "TestAdds/[CLM-ONE-001]_[CLM-ONE-002]_adds_one"))],
    ["CLM-OBS-093", "surefire", "CLM-ONE-001 and CLM-ONE-002, each in brackets", ["CLM-ONE-001", "CLM-ONE-002"], "CLM-ONE-002", () => postedBySuite("surefire", "example.AddsTest", testCase("example.AddsTest", "[CLM-ONE-001] [CLM-ONE-002] adds one"))],
    ["CLM-OBS-094", "rspec", "CLM-ONE-001 and CLM-ONE-002, each in brackets", ["CLM-ONE-001", "CLM-ONE-002"], "CLM-ONE-002", () => postedByExample(reportByExample([{ description: "[CLM-ONE-001] [CLM-ONE-002] adds one", status: "passed" }]))],
    [
      "CLM-OBS-095",
      "cucumber",
      "the tags CLM-ONE-001 and CLM-ONE-002",
      ["CLM-ONE-001", "CLM-ONE-002"],
      "CLM-ONE-002",
      () => postedByScenario(reportByScenario("features/one.feature", [{ tags: ["integration", "CLM-ONE-001", "CLM-ONE-002"], steps: [PASSED] }])),
    ],
  ])("[%s] a passing quality check in %s's evidence report citing %s is posted to the unnamed claim, naming %j", (_clm, _source, _cited, named, secondClaimTag, posted) => {
    expect(filed(claimReconciliationsOf(claimsTagged("CLM-ONE-001", secondClaimTag), posted())).filter(({ cites }) => cites.length > 0)).toEqual([
      { claim: "the unnamed claim", cites: [named] },
    ]);
  });

  it("[CLM-OBS-128] a passing test in pytest's evidence report whose ticket property, not a clm property, is CLM-ONE-002 is posted to the unnamed claim, naming no claim code", () => {
    const posted = postedBySuite("pytest", "pytest", testCase("test_adds", "test_adds_one", '<properties><property name="ticket" value="CLM-ONE-002" /></properties>'));

    expect(filed(claimReconciliationsOf(claimsTagged("CLM-ONE-001", "CLM-ONE-002"), posted)).filter(({ cites }) => cites.length > 0)).toEqual([
      { claim: "the unnamed claim", cites: [[]] },
    ]);
  });
});

describe("balance posts a failed test with the message its report gave", () => {
  const failingInVitest = (failureMessages: readonly string[]) => postedByFile(reportByFile("/work/a.test.ts", [{ title: "[CLM-ONE-001] adds", status: "failed", failureMessages }], "failed"));

  it.each([
    ["CLM-OBS-132", "Vitest's evidence report", "the failure message \"expected 2\"", () => failingInVitest(["expected 2"]), "expected 2"],
    ["CLM-OBS-133", "Vitest's evidence report", "the failure messages \"first\" and \"second\"", () => failingInVitest(["first", "second"]), "first\nsecond"],
    ["CLM-OBS-134", "RSpec's evidence report", "the message \"expected 2\"", () => postedByExample(reportByExample([{ description: "[CLM-ONE-001] adds", status: "failed", message: "expected 2" }])), "expected 2"],
    [
      "CLM-OBS-135",
      "Cucumber's evidence report",
      "the failed step's message \"expected 2\"",
      () => postedByScenario(reportByScenario("features/one.feature", [{ tags: ["integration", "CLM-ONE-001"], steps: [["Then ", "it is two", "failed", "expected 2"]] }])),
      "expected 2",
    ],
  ] as const)("[%s] a failed test in %s, citing CLM-ONE-001, whose report gave %s, is posted as failed with that message", (_clm, _source, _said, posted, message) => {
    expect(posted().map(({ result, cites, message: said }) => ({ result, cites, message: said }))).toEqual([{ result: "failed", cites: [ONE_001], message }]);
  });
});

describe("balance posts a result from a feature file it did not read to the unnamed claim", () => {
  it("[CLM-OBS-144] a passing scenario of a feature file balance did not read, with no claim-code tag, is posted to the unnamed claim, naming no claim code", () => {
    const posted = postedByScenario(reportByScenario("features/unread.feature", [{ tags: ["integration"], steps: [PASSED] }]), [featureAsWrittenFrom("one.feature", outlineIn("ONE"))]);

    expect(filed(claimReconciliationsOf([], posted))).toEqual([{ claim: "the unnamed claim", cites: [[]] }]);
  });
});

// A passing result of each kind of quality check, citing the one claim, from the source that gives that kind.
const passedCitingOne001: Readonly<Record<string, () => EvidenceObservation[]>> = {
  unit: () => postedByFile(reportByFile("/work/one.test.ts", [{ title: "[CLM-ONE-001] it holds", status: "passed" }])),
  integration: () => postedByScenario(reportByScenario("features/one.feature", [{ tags: ["CLM-ONE-001", "integration"], steps: [PASSED] }])),
  e2e: () => postedByScenario(reportByScenario("features/one.feature", [{ tags: ["CLM-ONE-001", "e2e"], steps: [PASSED] }])),
  performance: () => postedByScenario(reportByScenario("features/one.feature", [{ tags: ["CLM-ONE-001", "performance"], steps: [PASSED] }])),
  fitness: () =>
    fitnessObservationsOf(
      workflowStepsFrom("ci.yml", JSON.stringify({ jobs: { ci: { steps: [{ id: "CLM-ONE-001", run: "pnpm lint" }] } } })),
      [],
      { runners: {}, nonChecks: [], deferralTags: [] },
      {},
      shellAnswers,
    ),
};

describe("balance posts each result as an Evidence Observation of its kind", () => {
  it.each([
    ["CLM-OBS-151", "unit"],
    ["CLM-OBS-152", "integration"],
    ["CLM-OBS-153", "e2e"],
    ["CLM-OBS-154", "performance"],
    ["CLM-OBS-155", "fitness"],
  ] as const)("[%s] a %s result, passed, citing CLM-ONE-001, is posted as an Evidence Observation of that kind, as passed, citing CLM-ONE-001", (_clm, kind) => {
    expect(passedCitingOne001[kind]!().map(({ kind: posted, result, cites }) => ({ kind: posted, result, cites }))).toEqual([{ kind, result: "passed", cites: [ONE_001] }]);
  });
});
