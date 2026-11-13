import { describe, expect, it } from "vitest";
import { featureAsWrittenFrom } from "../inputs/gherkin.js";
import { resultsByFileFrom } from "../inputs/jestJson.js";
import { resultsBySuiteFrom } from "../inputs/junitXml.js";
import { resultsByExampleFrom } from "../inputs/rspecJson.js";
import type { ClaimCode } from "./claimCodes.js";
import { executableClaimsOf } from "./postEvidenceObligation.js";
import { observationsByExample, observationsByFile, observationsBySuite, observationsFiledUnder, type EvidenceObservation } from "./postEvidenceObservation.js";

const ONE_001: ClaimCode = { featureCode: "ONE", number: "001" };
const ONE_002: ClaimCode = { featureCode: "ONE", number: "002" };

// A test as Jest's JSON evidence report, which Vitest also writes, records it.
interface TestByFile {
  readonly ancestorTitles?: readonly string[];
  readonly title: string;
  readonly status: string;
}

const reportByFile = (file: string, tests: readonly TestByFile[], fileStatus = "passed", message = ""): unknown => ({
  testResults: [
    {
      name: file,
      status: fileStatus,
      message,
      assertionResults: tests.map(({ ancestorTitles = [], title, status }) => ({
        ancestorTitles,
        title,
        status,
        failureMessages: status === "failed" ? ["expected 2, received 1"] : [],
      })),
    },
  ],
});

const postedByFile = (from: "vitest" | "jest", report: unknown, targetFolder = "/work"): EvidenceObservation[] =>
  observationsByFile(resultsByFileFrom(report, from), targetFolder);

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
}

const reportByExample = (examples: readonly Example[], errorsOutsideExamples: readonly string[] = []): unknown => ({
  version: "3.13.0",
  messages: ["Run options: include {:focus=>true}", ...errorsOutsideExamples],
  examples: examples.map(({ group = "Adding", description, status }, at) => ({
    id: `./spec/adds_spec.rb[1:${at + 1}]`,
    description,
    full_description: `${group} ${description}`,
    status,
    file_path: "./spec/adds_spec.rb",
    line_number: 2 + at * 2,
    run_time: 0.000378728,
    pending_message: status === "pending" ? "not yet" : null,
    ...(status === "failed" && { exception: { class: "RSpec::Expectations::ExpectationNotMetError", message: "\nexpected: 2\n     got: 1\n" } }),
  })),
  summary: { duration: 0.014, example_count: examples.length, failure_count: 0, pending_count: 0, errors_outside_of_examples_count: errorsOutsideExamples.length },
  summary_line: `${examples.length} examples, 0 failures`,
});

const postedByExample = (report: unknown): EvidenceObservation[] => observationsByExample(resultsByExampleFrom(report), "/work");

describe("balance posts a result as passed or failed, citing its claim code", () => {
  it.each<[string, "vitest" | "jest", string, string]>([
    ["CLM-OBS-017", "vitest", "passed", "passed"],
    ["CLM-OBS-018", "vitest", "failed", "failed"],
    ["CLM-OBS-019", "jest", "passed", "passed"],
    ["CLM-OBS-020", "jest", "failed", "failed"],
  ])("[%s] a result in %s's evidence report, [CLM-ONE-001] in its title, that %s, is posted as %s, citing CLM-ONE-001", (_clm, from, status, result) => {
    const posted = postedByFile(from, reportByFile("/work/one.test.ts", [{ title: "[CLM-ONE-001] it holds", status }], status));

    expect(posted.map(({ result: postedResult, cites }) => ({ result: postedResult, cites }))).toEqual([{ result, cites: [ONE_001] }]);
  });
});

describe("balance posts a result as passed or failed, citing its claim code, from a report kept by suite", () => {
  it.each<[string, SuiteWriter, string, string, string, string, string]>([
    ["CLM-OBS-021", "pytest", "pytest", "test_adds", "test_adds_one", CLM_PROPERTY, "passed"],
    ["CLM-OBS-022", "pytest", "pytest", "test_adds", "test_adds_one", `${CLM_PROPERTY}<failure message="assert 1 == 2">def test_adds_one():\n&gt;       assert 1 == 2</failure>`, "failed"],
    ["CLM-OBS-023", "go", "example.com/adds", "example.com/adds", "TestAdds/[CLM-ONE-001]_adds_one", "", "passed"],
    ["CLM-OBS-024", "go", "example.com/adds", "example.com/adds", "TestAdds/[CLM-ONE-001]_adds_one", '<failure message="Failed" type="">=== RUN   TestAdds/[CLM-ONE-001]_adds_one&#xA;    adds_test.go:9: the assertion failed&#xA;</failure>', "failed"],
    ["CLM-OBS-025", "surefire", "example.AddsTest", "example.AddsTest", "[CLM-ONE-001] adds one", "", "passed"],
    ["CLM-OBS-026", "surefire", "example.AddsTest", "example.AddsTest", "[CLM-ONE-001] adds one", '<failure message="expected: &lt;2&gt; but was: &lt;1&gt;" type="org.opentest4j.AssertionFailedError"><![CDATA[org.opentest4j.AssertionFailedError: expected: <2> but was: <1>]]></failure>', "failed"],
    ["CLM-OBS-027", "gradle", "example.AddsTest", "example.AddsTest", "[CLM-ONE-001] adds one", "", "passed"],
    ["CLM-OBS-028", "gradle", "example.AddsTest", "example.AddsTest", "[CLM-ONE-001] adds one", '<failure message="org.opentest4j.AssertionFailedError: expected: &lt;2&gt; but was: &lt;1&gt;" type="org.opentest4j.AssertionFailedError">org.opentest4j.AssertionFailedError: expected: &lt;2&gt; but was: &lt;1&gt;\n</failure>', "failed"],
  ])("[%s] a result in %s's evidence report citing CLM-ONE-001 is posted as it went, citing CLM-ONE-001", (_clm, writer, suite, className, name, inside, result) => {
    const posted = postedBySuite(writer, suite, testCase(className, name, inside));

    expect(posted.map(resultAndCitations)).toEqual([{ result, cites: [ONE_001] }]);
  });

  it("[CLM-OBS-055] a Kotlin class whose setup failed will be posted as one failing result citing no claim code", () => {
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

describe("balance posts a result as passed or failed, citing its claim code, from a report kept by example", () => {
  it.each<[string, string, string]>([
    ["CLM-OBS-029", "passed", "passed"],
    ["CLM-OBS-030", "failed", "failed"],
  ])("[%s] a result in RSpec's evidence report, [CLM-ONE-001] in its description, that %s, is posted as %s, citing CLM-ONE-001", (_clm, status, result) => {
    const posted = postedByExample(reportByExample([{ description: "[CLM-ONE-001] adds one", status }]));

    expect(posted.map(resultAndCitations)).toEqual([{ result, cites: [ONE_001] }]);
  });

  it("[CLM-OBS-042] an example in RSpec's evidence report citing CLM-ONE-001 that was skipped or pending posts nothing", () => {
    const posted = postedByExample(reportByExample([{ description: "[CLM-ONE-001] adds one", status: "pending" }]));

    expect(posted).toEqual([]);
  });
});

describe("balance posts nothing for a test that was skipped", () => {
  it.each<[string, "vitest" | "jest", readonly string[]]>([
    ["CLM-OBS-036", "vitest", ["skipped", "todo"]],
    ["CLM-OBS-037", "jest", ["pending", "todo"]],
  ])("[%s] a test in %s's evidence report citing CLM-ONE-001, skipped or marked todo, posts nothing", (_clm, from, statuses) => {
    const tests = statuses.map((status) => ({ title: "[CLM-ONE-001] it holds", status }));

    expect(postedByFile(from, reportByFile("/work/one.test.ts", tests))).toEqual([]);
  });
});

describe("balance posts what could not run as never ran", () => {
  it.each<[string, "vitest" | "jest", string]>([
    ["CLM-OBS-044", "vitest", "Error: Cannot find module './adds.js'"],
    ["CLM-OBS-045", "jest", "Test suite failed to run\n\nthe test file could not be loaded"],
  ])("[%s] a test file in %s's evidence report that could not run is posted as never-ran, citing no claim code, naming the file and its error", (_clm, from, error) => {
    const posted = postedByFile(from, reportByFile("/work/a.test.ts", [], "failed", error));

    expect(posted.map(({ result, cites, place, message }) => ({ result, cites, place, message }))).toEqual([
      { result: "never-ran", cites: [], place: "a.test.ts", message: error },
    ]);
  });
});

describe("balance posts what could not run as never ran, from a report kept by suite", () => {
  it.each<[string, SuiteWriter, string, string, string, string, readonly ClaimCode[], string, string]>([
    ["CLM-OBS-046", "pytest", "pytest", "", "test_uncollectable", '<error message="collection failure">test_uncollectable.py:1: in &lt;module&gt;\n    import module_that_does_not_exist\nE   ModuleNotFoundError: No module named \'module_that_does_not_exist\'</error>', [], "test_uncollectable", "collection failure"],
    ["CLM-OBS-047", "go", "example.com/broken", "", "TestMain", '<failure message="Failed" type="">FAIL&#x9;example.com/broken [build failed]&#xA;</failure>', [], "example.com/broken", "Failed"],
    ["CLM-OBS-100", "go", "example.com/setup", "", "TestMain", '<failure message="Failed" type="">main_test.go:12: the database could not be reached&#xA;FAIL&#x9;example.com/setup&#x9;0.004s&#xA;</failure>', [], "example.com/setup", "Failed"],
    ["CLM-OBS-048", "surefire", "example.SetupFailsTest", "example.SetupFailsTest", "", '<error message="the shared resource could not be set up" type="java.lang.IllegalStateException"><![CDATA[java.lang.IllegalStateException: the shared resource could not be set up]]></error>', [], "example.SetupFailsTest", "the shared resource could not be set up"],
    ["CLM-OBS-050", "pytest", "pytest", "test_adds", "test_adds_one", `${CLM_PROPERTY}<error message="failed on setup with &quot;RuntimeError: the resource could not be set up&quot;">@pytest.fixture\ndef broken_resource():\n&gt;       raise RuntimeError("the resource could not be set up")</error>`, [ONE_001], "test_adds", 'failed on setup with "RuntimeError: the resource could not be set up"'],
  ])("[%s] what could not run in %s's evidence report is posted as never-ran, citing what it cites and naming where and its error", (_clm, writer, suite, className, name, inside, cites, place, message) => {
    const posted = postedBySuite(writer, suite, testCase(className, name, inside));

    expect(posted.map(({ result, cites: cited, place: placed, message: said }) => ({ result, cites: cited, place: placed, message: said }))).toEqual([
      { result: "never-ran", cites, place, message },
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
    ["CLM-OBS-099", "\nAn error occurred in a `before(:suite)` hook.\nFailure/Error: raise \"the database could not be reached\"\n", ""],
  ])("[%s] RSpec's evidence report saying %j is posted as never-ran, citing no claim code, naming where and the error", (_clm, error, place) => {
    const posted = postedByExample(reportByExample([], [error]));

    expect(posted.map(({ result, cites, place: placed, message }) => ({ result, cites, place: placed, message }))).toEqual([
      { result: "never-ran", cites: [], place, message: error },
    ]);
  });
});

describe("a test report's result will be unit evidence, and a Cucumber result will take the kind its tags name", () => {
  it("[CLM-OBS-059] a result in Vitest's evidence report is posted as unit evidence", () => {
    const posted = postedByFile("vitest", reportByFile("/work/one.test.ts", [{ title: "[CLM-ONE-001] it holds", status: "failed" }], "failed"));

    expect(posted.map(({ kind }) => kind)).toEqual(["unit"]);
  });
});

describe("a test report kept by suite gives unit evidence", () => {
  it("[CLM-OBS-060] a result in pytest's evidence report is posted as unit evidence", () => {
    expect(postedBySuite("pytest", "pytest", testCase("test_adds", "test_adds_one", CLM_PROPERTY)).map(({ kind }) => kind)).toEqual(["unit"]);
  });
});

describe("balance posts a nested test citing its own code, or its parent's code when the report gives one", () => {
  it.each<[string, "vitest" | "jest", string, readonly ClaimCode[]]>([
    ["CLM-OBS-065", "vitest", "[CLM-ONE-001] it holds", [ONE_001]],
    ["CLM-OBS-066", "vitest", "it holds", [ONE_002]],
    ["CLM-OBS-067", "vitest", "CLM-ONE-001 it holds", [ONE_002]],
    ["CLM-OBS-068", "jest", "[CLM-ONE-001] it holds", [ONE_001]],
    ["CLM-OBS-069", "jest", "it holds", [ONE_002]],
  ])("[%s] a passing test in %s's evidence report titled %s, nested in a describe with [CLM-ONE-002] in its title, is posted citing its nearest code", (_clm, from, title, cites) => {
    const posted = postedByFile(from, reportByFile("/work/one.test.ts", [{ ancestorTitles: ["[CLM-ONE-002] a group"], title, status: "passed" }]));

    expect(posted.map(({ cites: cited }) => cited)).toEqual([cites]);
  });
});

describe("balance posts a nested test from a report kept by suite citing its own code, or its parent's code when the report gives one", () => {
  it.each<[string, SuiteWriter, string, string, string, readonly ClaimCode[]]>([
    ["CLM-OBS-070", "go", "example.com/adds", "TestAdds/[CLM-ONE-002]_a_group/[CLM-ONE-001]_adds_one", "example.com/adds", [ONE_001]],
    ["CLM-OBS-071", "go", "example.com/adds", "TestAdds/[CLM-ONE-002]_a_group/adds_one", "example.com/adds", [ONE_002]],
    ["CLM-OBS-072", "surefire", "[CLM-ONE-002] a class", "[CLM-ONE-001] adds one", "[CLM-ONE-002] a class", [ONE_001]],
    ["CLM-OBS-073", "surefire", "[CLM-ONE-002] a class", "adds one", "[CLM-ONE-002] a class", [ONE_002]],
    ["CLM-OBS-074", "gradle", "[CLM-ONE-002] a class", "adds one", "example.AddsTest", []],
  ])("[%s] a passing test in %s's evidence report, in suite %s and named %s, is posted citing its nearest code", (_clm, writer, suite, name, className, cites) => {
    expect(postedBySuite(writer, suite, testCase(className, name)).map(({ cites: cited }) => cited)).toEqual([cites]);
  });
});

describe("balance posts a nested example citing its own code, or its group's code", () => {
  it.each<[string, string, readonly ClaimCode[]]>([
    ["CLM-OBS-075", "[CLM-ONE-001] adds one", [ONE_001]],
    ["CLM-OBS-076", "adds one", [ONE_002]],
  ])("[%s] a passing example in RSpec's evidence report described %s, in a group with [CLM-ONE-002] in its description, is posted citing its nearest code", (_clm, description, cites) => {
    const posted = postedByExample(reportByExample([{ group: "[CLM-ONE-002] Adding", description, status: "passed" }]));

    expect(posted.map(({ cites: cited }) => cited)).toEqual([cites]);
  });
});

describe("balance posts an Evidence Observation saying where to look", () => {
  it.each<[string, string, string]>([
    ["CLM-OBS-078", "a.test.ts", "/work/acme"],
    ["CLM-OBS-079", "/work/acme/a.test.ts", "/work/acme"],
  ])("[%s] the test \"adds two numbers\" in %s, for a target at %s, is posted saying where to look: \"adds two numbers\" in a.test.ts", (_clm, file, targetFolder) => {
    const posted = postedByFile("vitest", reportByFile(file, [{ title: "[CLM-ONE-001] adds two numbers", status: "passed" }]), targetFolder);

    expect(posted.map(({ place, name }) => ({ place, name }))).toEqual([{ place: "a.test.ts", name: "[CLM-ONE-001] adds two numbers" }]);
  });
});

describe("a test file outside the target's folder will be placed at the absolute path its evidence report recorded", () => {
  it("[CLM-OBS-098] a Jest test file at /home/runner/work/app/src/a.test.ts, for a target at /work/app, is placed at that path", () => {
    const file = "/home/runner/work/app/src/a.test.ts";
    const posted = postedByFile("jest", reportByFile(file, [{ title: "[CLM-ONE-001] it holds", status: "passed" }]), "/work/app");

    expect(posted.map(({ place }) => place)).toEqual([file]);
  });
});

describe("balance files each Evidence Observation under the claim it cites, or else on a phantom claim or the unnamed claim", () => {
  it("[CLM-OBS-082] balance posts an Evidence Observation to the executable claim whose code it cites", () => {
    const claims = executableClaimsOf([
      featureAsWrittenFrom(
        "one.feature",
        "Feature: one\n\n  @unit @CLM-ONE-001\n  Scenario: first\n    Given a step\n\n  @unit @CLM-ONE-002\n  Scenario: second\n    Given a step\n",
      ),
    ], { deferralTags: [], strict: false });
    const observations = postedByFile("vitest", reportByFile("/work/one.test.ts", [{ title: "[CLM-ONE-001] it holds", status: "passed" }]));

    expect(claims.map((claim) => ({ claimCode: claim.claimCode, posted: observationsFiledUnder(claim, observations).length }))).toEqual([
      { claimCode: ONE_001, posted: 1 },
      { claimCode: ONE_002, posted: 0 },
    ]);
  });
});
