import { describe, expect, it } from "vitest";
import { featureAsWrittenFrom } from "../inputs/gherkin.js";
import { resultsByFileFrom, whereResultsByFileBreak } from "../inputs/vitest.js";
import { resultsBySuiteFrom, whereSuitesBreak, whyXmlDoesNotParse } from "../inputs/junit.js";
import { resultsByExampleFrom, whereResultsByExampleBreak } from "../inputs/rspec.js";
import { scenarioResultsFrom, whereScenarioResultsBreak } from "../inputs/cucumber.js";
import { shellAnswers } from "../inputs/shell.js";
import { stepRecordFrom, whereStepRecordBreaks } from "../inputs/stepRecord.js";
import type { ClaimCode } from "./claimCodes.js";
import { claimReconciliationsOf, type ClaimReconciliation } from "./claimReconciliation.js";
import { executableClaimsOf, type FeatureAsWritten } from "./postEvidenceObligation.js";
import { fitnessObservationsOf, observationsByExample, observationsByFile, observationsBySuite, observationsOfScenarios, type EvidenceObservation } from "./postEvidenceObservation.js";
import observationVariants from "./postEvidenceObservation.variants.json" with { type: "json" };

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

const postedByFile = (report: unknown, targetFolder = "/work"): EvidenceObservation[] => observationsByFile(resultsByFileFrom(report), targetFolder);

// Who wrote a JUnit XML report: Maven Surefire for JUnit 5 in Java, Gradle for JUnit 5 in Kotlin, gotestsum for Go, and pytest.
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

// RSpec writes its messages only when it has some: a filtered run's Run options message, then each error outside its
// examples.
const reportByExample = (examples: readonly Example[], errorsOutsideExamples: readonly string[] = [], filtered = false): unknown => {
  const messages = [...(filtered ? ["Run options: include {:focus=>true}"] : []), ...errorsOutsideExamples];
  return {
    version: "3.13.0",
    ...(messages.length > 0 && { messages }),
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
  };
};

const postedByExample = (report: unknown): EvidenceObservation[] => observationsByExample(resultsByExampleFrom(report), "/work");

// A step as Cucumber's JSON evidence report records it: its keyword, its text and its status.
type StepRun = readonly [keyword: string, text: string, status: string];

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
      steps: steps.map(([keyword, text, status], at) => ({
        keyword,
        name: text,
        line: line + 1 + at,
        ...(status === "undefined" ? {} : { match: { location: "tests/steps/one.steps.ts:3" } }),
        result: { status, duration: 1000, ...(status === "failed" && { error_message: "AssertionError: expected 2 to equal 3" }) },
      })),
    })),
  },
];

const postedByScenario = (report: unknown, features: readonly FeatureAsWritten[] = []): EvidenceObservation[] =>
  observationsOfScenarios(scenarioResultsFrom(report), features, "/work");

const PASSED: StepRun = ["Given ", "one adds one", "passed"];

describe("a Cucumber Background and hook post nothing of their own", () => {
  it("[CLM-OBS-121] Cucumber's evidence report had a result with the tag @CLM-ONE-001, and every step passed, after a Background and a hook that passed: an Evidence Observation will be posted, as passed, citing CLM-ONE-001", () => {
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

// What each writer of Vitest's report format writes where the two differ: a skipped test's statuses, and the error of
// a test file that could not run.
const byFileWriters: Readonly<Record<string, { readonly skipped: readonly string[]; readonly fileError: string }>> = {
  Vitest: { skipped: ["skipped", "todo"], fileError: "Error: Cannot find module './adds.js'" },
  Jest: { skipped: ["pending", "todo"], fileError: "Test suite failed to run\n\nthe test file could not be loaded" },
};

describe("balance posts a result as passed or failed", () => {
  it.each(observationVariants["CLM-OBS-017"].variants)("[CLM-OBS-017] %s's evidence report had a result with CLM-ONE-001, in brackets, in its title, and it passed: an Evidence Observation will be posted, as passed, citing CLM-ONE-001", () => {
    const posted = postedByFile(reportByFile("/work/one.test.ts", [{ title: "[CLM-ONE-001] it holds", status: "passed" }]));

    expect(posted.map(resultAndCitations)).toEqual([{ result: "passed", cites: [ONE_001] }]);
  });

  it.each(observationVariants["CLM-OBS-018"].variants)("[CLM-OBS-018] %s's evidence report had a result with CLM-ONE-001, in brackets, in its title, and it failed: an Evidence Observation will be posted, as failed, citing CLM-ONE-001", () => {
    const posted = postedByFile(reportByFile("/work/one.test.ts", [{ title: "[CLM-ONE-001] it holds", status: "failed" }], "failed"));

    expect(posted.map(resultAndCitations)).toEqual([{ result: "failed", cites: [ONE_001] }]);
  });
});

// How each writer of JUnit XML spells a test citing a claim code, and what it writes inside the test when it fails, and
// each way it writes one skipped.
interface SuiteCase {
  readonly writer: SuiteWriter;
  readonly suite: string;
  readonly className: string;
  readonly name: string;
  readonly citation: string;
  readonly failure: string;
  readonly skipped: readonly string[];
}

const junitWriters: Readonly<Record<string, SuiteCase>> = {
  "JUnit 5 in Java": {
    writer: "surefire",
    suite: "example.AddsTest",
    className: "example.AddsTest",
    name: "[CLM-ONE-001] adds one",
    citation: "",
    failure: '<failure message="expected: &lt;2&gt; but was: &lt;1&gt;" type="org.opentest4j.AssertionFailedError"><![CDATA[org.opentest4j.AssertionFailedError: expected: <2> but was: <1>]]></failure>',
    skipped: ['<skipped message="not yet written"/>', '<skipped type="org.opentest4j.TestAbortedException"><![CDATA[org.opentest4j.TestAbortedException: Assumption failed: the environment is not ready]]></skipped>'],
  },
  "JUnit 5 in Kotlin": {
    writer: "gradle",
    suite: "example.AddsTest",
    className: "example.AddsTest",
    name: "[CLM-ONE-001] adds one",
    citation: "",
    failure: '<failure message="org.opentest4j.AssertionFailedError: expected: &lt;2&gt; but was: &lt;1&gt;" type="org.opentest4j.AssertionFailedError">org.opentest4j.AssertionFailedError: expected: &lt;2&gt; but was: &lt;1&gt;\n</failure>',
    skipped: ["<skipped/>", "<skipped><![CDATA[org.opentest4j.TestAbortedException: Assumption failed: the environment is not ready]]></skipped>"],
  },
  "Go via gotestsum": {
    writer: "go",
    suite: "example.com/adds",
    className: "example.com/adds",
    name: "TestAdds/[CLM-ONE-001]_adds_one",
    citation: "",
    failure: '<failure message="Failed" type="">=== RUN   TestAdds/[CLM-ONE-001]_adds_one&#xA;    adds_test.go:9: the assertion failed&#xA;</failure>',
    skipped: ['<skipped message="=== RUN   TestAdds/[CLM-ONE-001]_adds_one&#xA;    adds_test.go:20: not yet&#xA;"></skipped>'],
  },
  pytest: {
    writer: "pytest",
    suite: "pytest",
    className: "test_adds",
    name: "test_adds_one",
    citation: CLM_PROPERTY,
    failure: '<failure message="assert 1 == 2">def test_adds_one():\n&gt;       assert 1 == 2</failure>',
    skipped: ['<skipped type="pytest.skip" message="the behaviour is not built yet">test_adds.py:4: the behaviour is not built yet</skipped>'],
  },
};

const postedByWriter = ({ writer, suite, className, name, citation }: SuiteCase, inside = ""): EvidenceObservation[] => postedBySuite(writer, suite, testCase(className, name, `${citation}${inside}`));

describe("balance posts a result as passed or failed, from a report kept by suite", () => {
  it.each(observationVariants["CLM-OBS-025"].variants)("[CLM-OBS-025] %s's evidence report had a result with CLM-ONE-001, in brackets, in its display name, and it passed: an Evidence Observation will be posted, as passed, citing CLM-ONE-001", (variant) => {
    expect(postedByWriter(junitWriters[variant]!).map(resultAndCitations)).toEqual([{ result: "passed", cites: [ONE_001] }]);
  });

  it("[CLM-OBS-025] pytest's evidence report had a result whose clm properties name CLM-ONE-001 twice, and it passed: an Evidence Observation will be posted, as passed, citing CLM-ONE-001 once", () => {
    const twice = { ...junitWriters["pytest"]!, citation: '<properties><property name="clm" value="CLM-ONE-001" /><property name="clm" value="CLM-ONE-001" /></properties>' };

    expect(postedByWriter(twice).map(resultAndCitations)).toEqual([{ result: "passed", cites: [ONE_001] }]);
  });

  it.each(observationVariants["CLM-OBS-026"].variants)("[CLM-OBS-026] %s's evidence report had a result with CLM-ONE-001, in brackets, in its display name, and it failed: an Evidence Observation will be posted, as failed, citing CLM-ONE-001", (variant) => {
    const writer = junitWriters[variant]!;

    expect(postedByWriter(writer, writer.failure).map(resultAndCitations)).toEqual([{ result: "failed", cites: [ONE_001] }]);
  });

  it("[CLM-OBS-118] JUnit 5 in Java's evidence report had a result with CLM-ONE-001, in brackets, in its display name, and it raised an error: an Evidence Observation will be posted, as failed, citing CLM-ONE-001", () => {
    const error = '<error message="the database was not there" type="java.lang.IllegalStateException"><![CDATA[java.lang.IllegalStateException: the database was not there]]></error>';

    expect(postedByWriter(junitWriters["JUnit 5 in Java"]!, error).map(resultAndCitations)).toEqual([{ result: "failed", cites: [ONE_001] }]);
  });

  it("[CLM-OBS-055] JUnit 5 in Kotlin's evidence report said a class's setup before all its tests failed: an Evidence Observation will be posted, as failed, citing no claim code", () => {
    const failure = '<failure message="java.lang.IllegalStateException: the shared resource could not be set up" type="java.lang.IllegalStateException">java.lang.IllegalStateException: the shared resource could not be set up\n</failure>';
    const posted = postedBySuite("gradle", "[CLM-ONE-001] a class", testCase("example.SetupFailsTest", "initializationError", failure));

    expect(posted.map(resultAndCitations)).toEqual([{ result: "failed", cites: [] }]);
  });
});

describe("balance posts nothing for a test that was skipped, from a report kept by suite", () => {
  it.each(observationVariants["CLM-OBS-040"].variants)("[CLM-OBS-040] %s's evidence report had a test citing CLM-ONE-001, and it was disabled or its assumption failed: nothing will be posted", (variant) => {
    const writer = junitWriters[variant]!;

    expect(writer.skipped.map((skipped) => postedByWriter(writer, skipped))).toEqual(writer.skipped.map(() => []));
  });
});

describe("balance posts a result as passed or failed, from a report kept by example", () => {
  it.each<[string, string, string]>([
    ["CLM-OBS-029", "passed", "passed"],
    ["CLM-OBS-030", "failed", "failed"],
  ])("[%s] RSpec's evidence report had a result with CLM-ONE-001, in brackets, in its description, and it %s: an Evidence Observation will be posted, as %s, citing CLM-ONE-001", (_clm, status, result) => {
    const posted = postedByExample(reportByExample([{ description: "[CLM-ONE-001] adds one", status }], [], true));

    expect(posted.map(resultAndCitations)).toEqual([{ result, cites: [ONE_001] }]);
  });

  it("[CLM-OBS-042] RSpec's evidence report had a test citing CLM-ONE-001, and it was skipped or pending: nothing will be posted", () => {
    const posted = postedByExample(reportByExample([{ description: "[CLM-ONE-001] adds one", status: "pending" }]));

    expect(posted).toEqual([]);
  });
});

// Each writer of Cucumber's report, with a scenario tagged with a claim code whose every step passed. Ruby and JVM Cucumber
// leave out a feature's empty elements and a scenario's empty steps and tags.
const cucumberWriters: Readonly<Record<string, () => unknown>> = {
  "cucumber-js": () => reportByScenario("features/one.feature", [{ tags: ["integration", "CLM-ONE-001"], steps: [PASSED, ["Then ", "it is two", "passed"]] }]),
  "Ruby or JVM Cucumber, which leave out empty lists": () => [
    { uri: "features/empty.feature", id: "empty", keyword: "Feature", name: "empty", line: 1, description: "" },
    {
      uri: "features/one.feature",
      id: "one",
      keyword: "Feature",
      name: "one",
      line: 1,
      elements: [
        { id: "one;untagged-and-stepless", keyword: "Scenario", type: "scenario", name: "untagged and stepless", line: 3 },
        {
          id: "one;one-adds-one",
          keyword: "Scenario",
          type: "scenario",
          name: "one adds one",
          line: 6,
          tags: [{ name: "@CLM-ONE-001", line: 5 }],
          steps: [{ keyword: "Given ", name: "one adds one", line: 7, result: { status: "passed", duration: 1000 } }],
        },
      ],
    },
  ],
};

describe("balance posts a result as passed or failed, from a report kept by scenario", () => {
  it.each(observationVariants["CLM-OBS-031"].variants)("[CLM-OBS-031] Cucumber's evidence report, written by %s, had a result with the tag @CLM-ONE-001, and every step passed: an Evidence Observation will be posted, as passed, citing CLM-ONE-001", (variant) => {
    expect(postedByScenario(cucumberWriters[variant]!()).map(resultAndCitations)).toEqual([{ result: "passed", cites: [ONE_001] }]);
  });

  it("[CLM-OBS-032] Cucumber's evidence report had a result with the tag @CLM-ONE-001, and one step failed and the next was skipped: an Evidence Observation will be posted, as failed, citing CLM-ONE-001", () => {
    const steps: readonly StepRun[] = [["Given ", "one adds one", "failed"], ["Then ", "it is two", "skipped"]];
    const posted = postedByScenario(reportByScenario("features/one.feature", [{ tags: ["integration", "CLM-ONE-001"], steps }]));

    expect(posted.map(resultAndCitations)).toEqual([{ result: "failed", cites: [ONE_001] }]);
  });

  it.each<[string, string, readonly StepRun[]]>([
    ["CLM-OBS-043", "a step was skipped and none failed", [PASSED, ["Then ", "it is two", "skipped"]]],
    ["CLM-OBS-106", "it was a scenario with no steps", []],
  ])("[%s] Cucumber's evidence report had a test citing CLM-ONE-001, and %s: nothing will be posted", (_clm, _happened, steps) => {
    expect(postedByScenario(reportByScenario("features/one.feature", [{ tags: ["integration", "CLM-ONE-001"], steps }]))).toEqual([]);
  });

  it("[CLM-OBS-106] Cucumber's evidence report had a test citing CLM-ONE-001, and it was a scenario with no steps, written by cucumber-js as its Before and After hooks alone: nothing will be posted", () => {
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
});

describe("balance posts nothing for a test that was skipped", () => {
  it.each(observationVariants["CLM-OBS-036"].variants)("[CLM-OBS-036] %s's evidence report had a test citing CLM-ONE-001, and it was skipped or marked todo: nothing will be posted", (variant) => {
    const tests = byFileWriters[variant]!.skipped.map((status) => ({ title: "[CLM-ONE-001] it holds", status }));

    expect(postedByFile(reportByFile("/work/one.test.ts", tests))).toEqual([]);
  });
});

describe("balance posts what could not run as never ran", () => {
  it.each(observationVariants["CLM-OBS-044"].variants)("[CLM-OBS-044] %s's evidence report said a test file failed to collect: an Evidence Observation will be posted, as never-ran, citing no claim code and naming the file and its error", (variant) => {
    const error = byFileWriters[variant]!.fileError;
    const posted = postedByFile(reportByFile("/work/a.test.ts", [], "failed", error));

    expect(posted.map(({ result, cites, place, message }) => ({ result, cites, place, message }))).toEqual([{ result: "never-ran", cites: [], place: "a.test.ts", message: error }]);
  });
});

// What could not run, as each writer of a report kept by suite writes it.
const goPackages: Readonly<Record<string, readonly [suite: string, failure: string]>> = {
  "one that failed to compile": ["example.com/broken", '<failure message="Failed" type="">FAIL&#x9;example.com/broken [build failed]&#xA;</failure>'],
  "one whose TestMain failed before any test": ["example.com/setup", '<failure message="Failed" type="">main_test.go:12: the database could not be reached&#xA;FAIL&#x9;example.com/setup&#x9;0.004s&#xA;</failure>'],
};

const neverRanFrom = (posted: readonly EvidenceObservation[]) => posted.map(({ result, cites, place, name, message }) => ({ result, cites, place, name, message }));

describe("balance posts what could not run as never ran, from a report kept by suite", () => {
  it.each<[string, SuiteWriter, string, string, string, string, readonly ClaimCode[], string, string, string | undefined]>([
    ["CLM-OBS-046", "pytest", "pytest", "", "test_uncollectable", '<error message="collection failure">test_uncollectable.py:1: in &lt;module&gt;\n    import module_that_does_not_exist\nE   ModuleNotFoundError: No module named \'module_that_does_not_exist\'</error>', [], "test_uncollectable", "collection failure", undefined],
    ["CLM-OBS-048", "surefire", "example.SetupFailsTest", "example.SetupFailsTest", "", '<error message="the shared resource could not be set up" type="java.lang.IllegalStateException"><![CDATA[java.lang.IllegalStateException: the shared resource could not be set up]]></error>', [], "example.SetupFailsTest", "the shared resource could not be set up", undefined],
    ["CLM-OBS-050", "pytest", "pytest", "test_adds", "test_adds_one", `${CLM_PROPERTY}<error message="failed on setup with &quot;RuntimeError: the resource could not be set up&quot;">@pytest.fixture\ndef broken_resource():\n&gt;       raise RuntimeError("the resource could not be set up")</error>`, [ONE_001], "test_adds", 'failed on setup with "RuntimeError: the resource could not be set up"', "test_adds_one"],
  ])("[%s] %s's evidence report said what could not run: an Evidence Observation will be posted, as never-ran, citing what it cites and naming where and its error", (_clm, writer, suite, className, name, inside, cites, place, message, test) => {
    expect(neverRanFrom(postedBySuite(writer, suite, testCase(className, name, inside)))).toStrictEqual([{ result: "never-ran", cites, place, name: test, message }]);
  });

  it.each(observationVariants["CLM-OBS-047"].variants)("[CLM-OBS-047] Go's evidence report said a package failed to compile, as %s: an Evidence Observation will be posted, as never-ran, citing no claim code and naming the package and its error", (variant) => {
    const [suite, failure] = goPackages[variant]!;

    expect(neverRanFrom(postedBySuite("go", suite, testCase("", "TestMain", failure)))).toStrictEqual([{ result: "never-ran", cites: [], place: suite, name: undefined, message: "Failed" }]);
  });
});

const loadError = "\nAn error occurred while loading ./spec/unloadable_spec.rb.\nFailure/Error: __send__(method, file)\n\nSyntaxError:\n  Unmatched `{', missing `}' ?\n";

// Whether the run wrote another message beside the load error: a filtered run's Run options message.
const anotherMessage: Readonly<Record<string, boolean>> = { "with another message from the run": true, "without another message from the run": false };

describe("balance posts what could not run as never ran, from a report kept by example", () => {
  const neverRanOf = (posted: readonly EvidenceObservation[]) => posted.map(({ result, cites, place, message }) => ({ result, cites, place, message }));

  it.each(observationVariants["CLM-OBS-049"].variants)("[CLM-OBS-049] RSpec's evidence report said a spec file failed to load, %s: an Evidence Observation will be posted, as never-ran, citing no claim code and naming the file and its error", (variant) => {
    expect(neverRanOf(postedByExample(reportByExample([], [loadError], anotherMessage[variant])))).toEqual([{ result: "never-ran", cites: [], place: "./spec/unloadable_spec.rb", message: loadError }]);
  });

  it.each<[string, string, string]>([
    ["CLM-OBS-049", "\nAn error occurred while loading ./spec/unloadable_spec.rb\nSyntaxError:\n  Unmatched `{', missing `}' ?\n", "./spec/unloadable_spec.rb"],
    ["CLM-OBS-099", "\nAn error occurred in a `before(:suite)` hook.\nFailure/Error: raise \"the database could not be reached\"\n", ""],
  ])("[%s] RSpec's evidence report saying %j: an Evidence Observation will be posted, as never-ran, citing no claim code and naming where and the error", (_clm, error, place) => {
    expect(neverRanOf(postedByExample(reportByExample([], [error], true)))).toEqual([{ result: "never-ran", cites: [], place, message: error }]);
  });
});

// The status Cucumber writes for a step that matched two definitions, or none.
const unmatched: Readonly<Record<string, string>> = { "matched two definitions": "ambiguous", "matched none": "undefined" };

describe("balance posts what could not run as never ran, from a report kept by scenario", () => {
  const neverRanOf = (steps: readonly StepRun[]) =>
    postedByScenario(reportByScenario("features/one.feature", [{ tags: ["integration", "CLM-ONE-001"], steps }])).map(({ result, cites, message }) => ({ result, cites, message }));

  it.each(observationVariants["CLM-OBS-051"].variants)("[CLM-OBS-051] Cucumber's evidence report said the step \"one adds one\" of a scenario tagged @CLM-ONE-001 %s: an Evidence Observation will be posted, as never-ran, citing CLM-ONE-001 and naming the step \"Given one adds one\"", (variant) => {
    expect(neverRanOf([["Given ", "one adds one", unmatched[variant]!], ["Then ", "it is two", "skipped"]])).toEqual([{ result: "never-ran", cites: [ONE_001], message: "Given one adds one" }]);
  });

  it("[CLM-OBS-110] Cucumber's evidence report said a scenario tagged @CLM-ONE-001 had a step that failed, and the step \"one adds one\" that matched no definition: an Evidence Observation will be posted, as never-ran, citing CLM-ONE-001 and naming the step \"Given one adds one\"", () => {
    expect(neverRanOf([["Given ", "one is ready", "failed"], ["Given ", "one adds one", "undefined"]])).toEqual([{ result: "never-ran", cites: [ONE_001], message: "Given one adds one" }]);
  });
});

// How each test runner's evidence report spells a result citing a claim code.
const citingOneIn: Readonly<Record<string, readonly [source: string, citation: string]>> = {
  Vitest: ["vitest", "[CLM-ONE-001]"],
  Jest: ["jest", "[CLM-ONE-001]"],
  pytest: ["pytest", "CLM-ONE-001"],
  JUnit: ["surefire", "[CLM-ONE-001]"],
  RSpec: ["rspec", "[CLM-ONE-001]"],
};

describe("balance posts each result at the kind of quality check its source and tags give", () => {
  it.each(observationVariants["CLM-OBS-059"].variants)("[CLM-OBS-059] %s's evidence report had a result citing a scenario tagged @e2e: it will be posted as unit evidence", (variant) => {
    const [source, citation] = citingOneIn[variant]!;

    expect(postedFrom(source, citation).map(({ kind }) => kind)).toEqual(["unit"]);
  });

  const kindsPosted = (tags: readonly string[], status: string) =>
    postedByScenario(reportByScenario("features/one.feature", [{ tags: ["CLM-ONE-001", ...tags], steps: [["Given ", "one adds one", status]] }])).map(({ kind }) => kind);

  it.each<[string, string, readonly string[], readonly string[]]>([
    ["CLM-OBS-061", "no @integration, @e2e or @performance", ["smoke"], ["integration"]],
    ["CLM-OBS-062", "@e2e", ["e2e"], ["e2e"]],
    ["CLM-OBS-063", "@performance", ["performance"], ["performance"]],
  ])("[%s] Cucumber's evidence report had a result citing a scenario tagged %s: an Evidence Observation will be posted for each of %j", (_clm, _tagged, tags, kinds) => {
    expect(kindsPosted(tags, "passed")).toEqual(kinds);
  });

  // The status of a step in a Cucumber result that ran, and in one that never ran.
  const statusOf: Readonly<Record<string, string>> = { "one that ran": "passed", "one that never ran": "undefined" };

  it.each(observationVariants["CLM-OBS-064"].variants)("[CLM-OBS-064] Cucumber's evidence report had a result, %s, citing a scenario tagged @integration @e2e: an Evidence Observation will be posted for each of integration and e2e", (variant) => {
    expect(kindsPosted(["integration", "e2e"], statusOf[variant]!)).toEqual(["integration", "e2e"]);
  });
});

describe("balance posts a nested test citing its own code, or its parent's code when the report gives one", () => {
  const citedFrom = (title: string) => postedByFile(reportByFile("/work/one.test.ts", [{ ancestorTitles: ["[CLM-ONE-002] a group"], title, status: "passed" }])).map(({ cites }) => cites);

  it.each(observationVariants["CLM-OBS-065"].variants)("[CLM-OBS-065] %s's evidence report had a passing test whose own citation was CLM-ONE-001, in brackets, in its title, nested in a describe with CLM-ONE-002, in brackets, in its title: an Evidence Observation will be posted, citing CLM-ONE-001", () => {
    expect(citedFrom("[CLM-ONE-001] it holds")).toEqual([[ONE_001]]);
  });

  it.each(observationVariants["CLM-OBS-066"].variants)("[CLM-OBS-066] %s's evidence report had a passing test whose own citation was no claim code, nested in a describe with CLM-ONE-002, in brackets, in its title: an Evidence Observation will be posted, citing CLM-ONE-002", () => {
    expect(citedFrom("it holds")).toEqual([[ONE_002]]);
  });

  it("[CLM-OBS-067] Vitest's evidence report had a passing test whose own citation was CLM-ONE-001 in its title, with no brackets, nested in a describe with CLM-ONE-002, in brackets, in its title: an Evidence Observation will be posted, citing CLM-ONE-002", () => {
    expect(citedFrom("CLM-ONE-001 it holds")).toEqual([[ONE_002]]);
  });
});

// How JUnit 5 in Java and Go via gotestsum write a test nested in a parent citing another claim code, by the test's own name.
const nestedIn: Readonly<Record<string, (own: string) => readonly [suite: string, className: string, name: string]>> = {
  "JUnit 5 in Java": (own) => ["[CLM-ONE-002] a class", "[CLM-ONE-002] a class", own === "" ? "adds one" : `${own} adds one`],
  "Go subtests via gotestsum": (own) => ["example.com/adds", "example.com/adds", own === "" ? "TestAdds/[CLM-ONE-002]_a_group/adds_one" : `TestAdds/[CLM-ONE-002]_a_group/${own}_adds_one`],
};

describe("balance posts a nested test from a report kept by suite citing its own code, or its parent's code when the report gives one", () => {
  const citedFrom = (writer: SuiteWriter, suite: string, className: string, name: string) => postedBySuite(writer, suite, testCase(className, name)).map(({ cites }) => cites);
  const writerOf: Readonly<Record<string, SuiteWriter>> = { "JUnit 5 in Java": "surefire", "Go subtests via gotestsum": "go" };

  it.each(observationVariants["CLM-OBS-072"].variants)("[CLM-OBS-072] %s's evidence report had a passing test whose own citation was CLM-ONE-001, in brackets, in its display name, nested in a class with CLM-ONE-002, in brackets, in its display name: an Evidence Observation will be posted, citing CLM-ONE-001", (variant) => {
    expect(citedFrom(writerOf[variant]!, ...nestedIn[variant]!("[CLM-ONE-001]"))).toEqual([[ONE_001]]);
  });

  it.each(observationVariants["CLM-OBS-073"].variants)("[CLM-OBS-073] %s's evidence report had a passing test whose own citation was no claim code, nested in a class with CLM-ONE-002, in brackets, in its display name: an Evidence Observation will be posted, citing CLM-ONE-002", (variant) => {
    expect(citedFrom(writerOf[variant]!, ...nestedIn[variant]!(""))).toEqual([[ONE_002]]);
  });

  it.each<[string, string, string, string, string, readonly ClaimCode[]]>([
    ["CLM-OBS-073", "no claim code, its display name 007", "a class with CLM-ONE-002, in brackets, in its display name", "[CLM-ONE-002] a class", "007", [ONE_002]],
    [
      "CLM-OBS-120",
      "no claim code",
      "a class with CLM-ONE-002, in brackets, in its display name, nested in one with CLM-ONE-001, in brackets, in its display name",
      "[CLM-ONE-001] an outer class [CLM-ONE-002] an inner class",
      "adds one",
      [ONE_002],
    ],
  ])("[%s] JUnit 5 in Java's evidence report had a passing test whose own citation was %s, nested in %s: an Evidence Observation will be posted, citing CLM-ONE-002", (_clm, _own, _parent, suite, name, cites) => {
    expect(citedFrom("surefire", suite, suite, name)).toEqual([cites]);
  });

  it("[CLM-OBS-074] JUnit 5 in Kotlin's evidence report had a passing test whose own citation was no claim code, nested in a class with CLM-ONE-002, in brackets, in its display name: an Evidence Observation will be posted, citing no claim code", () => {
    expect(citedFrom("gradle", "[CLM-ONE-002] a class", "example.AddsTest", "adds one")).toEqual([[]]);
  });
});

describe("balance posts a nested example citing its own code, or its group's code", () => {
  it.each<[string, string, string, readonly ClaimCode[]]>([
    ["CLM-OBS-075", "CLM-ONE-001, in brackets, in its description", "[CLM-ONE-001] adds one", [ONE_001]],
    ["CLM-OBS-076", "no claim code", "adds one", [ONE_002]],
  ])("[%s] RSpec's evidence report had a passing test whose own citation was %s, nested in a group with CLM-ONE-002, in brackets, in its description: an Evidence Observation will be posted, citing its nearest code", (_clm, _described, description, cites) => {
    const posted = postedByExample(reportByExample([{ group: "[CLM-ONE-002] Adding", description, status: "passed" }]));

    expect(posted.map(({ cites: cited }) => cited)).toEqual([cites]);
  });
});

// A feature file whose two-row Outline has its rows at lines 10 and 11, with the claim codes CLM-<FFF>-001 and -002.
const outlineIn = (featureCode: string): string =>
  `@${featureCode}\nFeature: ${featureCode.toLowerCase()}\n\n  @integration\n  Scenario Outline: adds <n>\n    Given one adds <n>\n\n    Examples:\n      | clm | n |\n      | CLM-${featureCode}-001 | 1 |\n      | CLM-${featureCode}-002 | 2 |\n`;

describe("balance posts each row of an Outline citing its own claim code", () => {
  it("[CLM-OBS-077] two executable claims were rows of one Scenario Outline, with the claim codes CLM-ONE-001 and CLM-ONE-002, and Cucumber's evidence report had a result for each row: an Evidence Observation will be posted for each row, citing the claim code of its row", () => {
    const report = reportByScenario("features/one.feature", [
      { title: "adds 1", line: 10, tags: ["integration"], steps: [["Given ", "one adds 1", "passed"]] },
      { title: "adds 2", line: 11, tags: ["integration"], steps: [["Given ", "one adds 2", "passed"]] },
    ]);

    expect(postedByScenario(report, [featureAsWrittenFrom("one.feature", outlineIn("ONE"))]).map(({ cites }) => cites)).toEqual([[ONE_001], [ONE_002]]);
  });

  it.each([
    ["CLM-OBS-107", "two.feature", "TWO"],
    ["CLM-OBS-138", "sub/one.feature", "SUB"],
  ] as const)("[%s] %s and one.feature each had an Outline row at line 10, and Cucumber's evidence report had a result for the row in that file: an Evidence Observation will be posted, citing its row's code", (_clm, file, featureCode) => {
    const features = [featureAsWrittenFrom("one.feature", outlineIn("ONE")), featureAsWrittenFrom(file, outlineIn(featureCode))];
    const report = reportByScenario(`features/${file}`, [{ title: "adds 1", line: 10, tags: ["integration"], steps: [["Given ", "one adds 1", "passed"]] }]);

    expect(postedByScenario(report, features).map(({ cites }) => cites)).toEqual([[{ featureCode, number: "001" }]]);
  });
});

describe("balance posts an Evidence Observation saying where to look", () => {
  it.each<[string, string, string]>([
    ["CLM-OBS-078", "a.test.ts", "/work/acme"],
    ["CLM-OBS-079", "/work/acme/a.test.ts", "/work/acme"],
  ])("[%s] Vitest's evidence report had a result, the test \"adds two numbers\" in %s, for a target at %s, citing CLM-ONE-001: an Evidence Observation will be posted, saying where to look: \"adds two numbers\" in a.test.ts", (_clm, file, targetFolder) => {
    const posted = postedByFile(reportByFile(file, [{ title: "[CLM-ONE-001] adds two numbers", status: "passed" }]), targetFolder);

    expect(posted.map(({ place, name }) => ({ place, name }))).toEqual([{ place: "a.test.ts", name: "[CLM-ONE-001] adds two numbers" }]);
  });
});

describe("balance posts a Cucumber result saying where to look", () => {
  it("[CLM-OBS-080] Cucumber's evidence report had a result, the scenario \"one adds one\" in one.feature, citing CLM-ONE-001: an Evidence Observation will be posted, saying where to look: \"one adds one\" in one.feature", () => {
    const posted = postedByScenario(reportByScenario("one.feature", [{ tags: ["integration", "CLM-ONE-001"], steps: [PASSED] }]));

    expect(posted.map(({ place, name }) => ({ place, name }))).toEqual([{ place: "one.feature", name: "one adds one" }]);
  });
});

describe("a test file outside the target's folder will be placed at the absolute path its evidence report recorded", () => {
  it("[CLM-OBS-098] Jest's evidence report had a result, a test in the file /home/runner/work/app/src/a.test.ts, for a target at /work/app, citing CLM-ONE-001: an Evidence Observation will be posted, saying where to look: /home/runner/work/app/src/a.test.ts", () => {
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

// A passing quality check in the source named, with the citation as that source writes it.
function postedFrom(source: string, citation: string): EvidenceObservation[] {
  if (source === "vitest" || source === "jest") return postedByFile(reportByFile("/work/one.test.ts", [{ title: `${citation} it holds`, status: "passed" }]));
  if (source === "pytest") {
    const properties = citation.split(" ").map((value) => `<property name="clm" value="${value}" />`).join("");
    return postedBySuite("pytest", "pytest", testCase("test_adds", "test_adds_one", `<properties>${properties}</properties>`));
  }
  if (source === "go") return postedBySuite("go", "example.com/adds", testCase("example.com/adds", `TestAdds/${citation.replaceAll(" ", "_")}_adds_one`));
  if (source === "surefire") return postedBySuite("surefire", "example.AddsTest", testCase("example.AddsTest", `${citation} adds one`));
  if (source === "rspec") return postedByExample(reportByExample([{ description: `${citation} adds one`, status: "passed" }]));
  return postedByScenario(reportByScenario("features/one.feature", [{ tags: ["integration", ...citation.split(" ")], steps: [PASSED] }]));
}

describe("balance files each Evidence Observation under the claim it cites, or else on a phantom claim or the unnamed claim", () => {
  it("[CLM-OBS-082] balance posts an Evidence Observation to the executable claim whose code it cites", () => {
    const reconciliations = claimReconciliationsOf(claimsTagged("CLM-ONE-001", "CLM-ONE-002"), postedFrom("vitest", "[CLM-ONE-001]"));

    expect(filed(reconciliations)).toEqual([
      { claim: "the claim of CLM-ONE-001", cites: [["CLM-ONE-001"]] },
      { claim: "the claim of CLM-ONE-002", cites: [] },
    ]);
  });

  it("[CLM-OBS-083] balance posts an Evidence Observation citing a code no executable claim has to its phantom claim", () => {
    const reconciliations = claimReconciliationsOf(claimsTagged("CLM-ONE-001", "CLM-ONE-002"), postedFrom("vitest", "[CLM-ONE-999]"));

    expect(filed(reconciliations).filter(({ cites }) => cites.length > 0)).toEqual([{ claim: "the phantom claim of CLM-ONE-999", cites: [["CLM-ONE-999"]] }]);
  });
});

// A citation that is not a claim code, in the source that writes it.
const notACode: Readonly<Record<string, readonly [source: string, citation: string]>> = {
  "a malformed code": ["vitest", "[CLM-ABCDEF-001]"],
  "a code without brackets": ["vitest", "CLM-ONE-999"],
  "a clm property that is not a code": ["pytest", "CLM-A-001"],
};

// Two claim codes in each runner's spelling.
const twoCodes: Readonly<Record<string, readonly (readonly [source: string, citation: string])[]>> = {
  "Vitest and Jest titles": [
    ["vitest", "[CLM-ONE-001] [CLM-ONE-002]"],
    ["jest", "[CLM-ONE-001] [CLM-ONE-002]"],
  ],
  "pytest clm properties": [["pytest", "CLM-ONE-001 CLM-ONE-002"]],
  "Go subtest names": [["go", "[CLM-ONE-001] [CLM-ONE-002]"]],
  "JUnit display names": [["surefire", "[CLM-ONE-001] [CLM-ONE-002]"]],
  "RSpec descriptions": [["rspec", "[CLM-ONE-001] [CLM-ONE-002]"]],
  "Cucumber tags": [["cucumber", "CLM-ONE-001 CLM-ONE-002"]],
};

describe("balance posts an Evidence Observation no single executable claim can take to the unnamed claim", () => {
  const unnamedFrom = (posted: EvidenceObservation[], claims = claimsTagged("CLM-ONE-001", "CLM-ONE-002")) => filed(claimReconciliationsOf(claims, posted)).filter(({ cites }) => cites.length > 0);

  it("[CLM-OBS-084] Vitest's evidence report had a passing quality check with no claim code in its title: an Evidence Observation will be posted to the unnamed claim, naming no claim code", () => {
    expect(unnamedFrom(postedFrom("vitest", ""))).toEqual([{ claim: "the unnamed claim", cites: [[]] }]);
  });

  it.each(observationVariants["CLM-OBS-085"].variants)("[CLM-OBS-085] an evidence report had a passing quality check with a citation that is not a claim code, %s: an Evidence Observation will be posted to the unnamed claim, naming no claim code", (variant) => {
    const [source, citation] = notACode[variant]!;

    expect(unnamedFrom(postedFrom(source, citation))).toEqual([{ claim: "the unnamed claim", cites: [[]] }]);
  });

  it("[CLM-OBS-128] pytest's evidence report had a passing quality check with the ticket property CLM-ONE-002, not a clm property: an Evidence Observation will be posted to the unnamed claim, naming no claim code", () => {
    const posted = postedBySuite("pytest", "pytest", testCase("test_adds", "test_adds_one", '<properties><property name="ticket" value="CLM-ONE-002" /></properties>'));

    expect(unnamedFrom(posted)).toEqual([{ claim: "the unnamed claim", cites: [[]] }]);
  });

  it("[CLM-OBS-088] Vitest's evidence report had a passing quality check with CLM-ONE-001, in brackets, in its title, a code two claims share: an Evidence Observation will be posted to the unnamed claim, naming CLM-ONE-001", () => {
    expect(unnamedFrom(postedFrom("vitest", "[CLM-ONE-001]"), claimsTagged("CLM-ONE-001", "CLM-ONE-001"))).toEqual([{ claim: "the unnamed claim", cites: [["CLM-ONE-001"]] }]);
  });

  it.each(observationVariants["CLM-OBS-089"].variants)("[CLM-OBS-089] an evidence report had a passing quality check citing two claim codes, in %s: an Evidence Observation will be posted to the unnamed claim, naming CLM-ONE-001 and CLM-ONE-002", (variant) => {
    const spellings = twoCodes[variant]!;

    expect(spellings.map(([source, citation]) => unnamedFrom(postedFrom(source, citation)))).toEqual(spellings.map(() => [{ claim: "the unnamed claim", cites: [["CLM-ONE-001", "CLM-ONE-002"]] }]));
  });
});

describe("balance posts a failed test with the message its report gave", () => {
  const vitestFailing = (failureMessages: readonly string[]) => ({
    testResults: [{ name: "/work/a.test.ts", status: "failed", message: "", assertionResults: [{ ancestorTitles: [], title: "[CLM-ONE-001] adds", status: "failed", failureMessages }] }],
  });
  const rspecFailing = (message: string) => ({
    version: "3.13.0",
    messages: [],
    examples: [
      {
        id: "./spec/adds_spec.rb[1:1]",
        description: "[CLM-ONE-001] adds",
        full_description: "Adding [CLM-ONE-001] adds",
        status: "failed",
        file_path: "./spec/adds_spec.rb",
        line_number: 2,
        run_time: 0.0004,
        pending_message: null,
        exception: { class: "RSpec::Expectations::ExpectationNotMetError", message },
      },
    ],
    summary: { duration: 0.01, example_count: 1, failure_count: 1, pending_count: 0, errors_outside_of_examples_count: 0 },
    summary_line: "1 example, 1 failure",
  });
  const cucumberFailing = (errorMessage: string) => [
    {
      uri: "features/one.feature",
      id: "one",
      keyword: "Feature",
      name: "one",
      line: 2,
      tags: [{ name: "@ONE", line: 1 }],
      elements: [
        {
          id: "one;adds",
          keyword: "Scenario",
          type: "scenario",
          name: "adds",
          line: 5,
          tags: [
            { name: "@integration", line: 4 },
            { name: "@CLM-ONE-001", line: 4 },
          ],
          steps: [{ keyword: "Then ", name: "it is two", line: 6, match: { location: "tests/steps/one.steps.ts:3" }, result: { status: "failed", duration: 1000, error_message: errorMessage } }],
        },
      ],
    },
  ];

  // A failed test citing a claim code, as each report writes it with the message given.
  const failingIn: Readonly<Record<string, (messages: readonly string[]) => EvidenceObservation[]>> = {
    Vitest: (messages) => {
      const report = vitestFailing(messages);
      return whereResultsByFileBreak(report) === undefined ? observationsByFile(resultsByFileFrom(report), "/work") : [];
    },
    RSpec: (messages) => observationsByExample(resultsByExampleFrom(rspecFailing(messages.join("\n"))), "/work"),
    Cucumber: (messages) => postedByScenario(cucumberFailing(messages.join("\n"))),
  };
  const failedWith = (posted: EvidenceObservation[]) => posted.map(({ result, cites, message }) => ({ result, cites, message }));

  it.each(observationVariants["CLM-OBS-132"].variants)("[CLM-OBS-132] %s's evidence report had a failed test, citing CLM-ONE-001, whose report gave the failure message \"expected 2\": an Evidence Observation will be posted, as failed, with the message \"expected 2\"", (variant) => {
    expect(failedWith(failingIn[variant]!(["expected 2"]))).toEqual([{ result: "failed", cites: [ONE_001], message: "expected 2" }]);
  });

  it("[CLM-OBS-133] Vitest's evidence report had a failed test, citing CLM-ONE-001, whose report gave the failure messages \"first\" and \"second\": an Evidence Observation will be posted, as failed, with the message \"first\" then \"second\", in the order given", () => {
    expect(failedWith(failingIn["Vitest"]!(["first", "second"]))).toEqual([{ result: "failed", cites: [ONE_001], message: "first\nsecond" }]);
  });
});

describe("balance posts a result from a feature file it did not read to the unnamed claim", () => {
  it("[CLM-OBS-144] Cucumber's evidence report had a passing quality check with a scenario of a feature file balance did not read, with no claim-code tag: an Evidence Observation will be posted to the unnamed claim, naming no claim code", () => {
    const posted = postedByScenario(reportByScenario("features/unread.feature", [{ tags: ["integration"], steps: [PASSED] }]), [featureAsWrittenFrom("one.feature", outlineIn("ONE"))]);

    expect(filed(claimReconciliationsOf([], posted))).toEqual([{ claim: "the unnamed claim", cites: [[]] }]);
  });
});


// Where a report breaks its shape, if anywhere; a report that breaks nowhere is read, and the run goes on.
const whereXmlBreaks = (xml: string): string | undefined => whyXmlDoesNotParse(xml) ?? whereSuitesBreak(xml);

describe("balance posts nothing from an evidence report that lists no tests", () => {
  it.each<[string, () => string | undefined, () => readonly EvidenceObservation[]]>([
    ["a Vitest evidence report", () => whereResultsByFileBreak({ testResults: [] }), () => postedByFile({ testResults: [] })],
    ["a Jest evidence report", () => whereResultsByFileBreak({ testResults: [] }), () => postedByFile({ testResults: [] })],
    [
      "a pytest evidence report",
      () => whereXmlBreaks('<?xml version="1.0" encoding="utf-8"?><testsuites name="pytest tests"></testsuites>'),
      () => observationsBySuite(resultsBySuiteFrom('<?xml version="1.0" encoding="utf-8"?><testsuites name="pytest tests"></testsuites>', "pytest"), "/work"),
    ],
    [
      "a JUnit evidence report",
      () => whereXmlBreaks('<?xml version="1.0" encoding="UTF-8"?>\n<testsuites name="all"></testsuites>\n'),
      () => observationsBySuite(resultsBySuiteFrom('<?xml version="1.0" encoding="UTF-8"?>\n<testsuites name="all"></testsuites>\n', "junit"), "/work"),
    ],
    ["an RSpec evidence report", () => whereResultsByExampleBreak({ examples: [], summary: {} }), () => postedByExample({ examples: [], summary: {} })],
    ["a Cucumber evidence report", () => whereScenarioResultsBreak([]), () => postedByScenario([])],
    ["a CI step record", () => whereStepRecordBreaks({}), () => fitnessObservationsOf([], stepRecordFrom({}), { runners: {}, nonChecks: [], deferralTags: [] }, {}, shellAnswers)],
  ])("[CLM-OBS-149] %s was written well formed, listing no tests: nothing will be posted, and the run will not stop", (_report, whereItBreaks, posted) => {
    expect({ breaks: whereItBreaks(), posted: posted() }).toEqual({ breaks: undefined, posted: [] });
  });
});

describe("balance posts the results of a JUnit evidence report written as one suite or as suites of suites", () => {
  const twoTests = '<testcase classname="example.AddsTest" name="[CLM-ONE-001] adds one" time="0.001"/><testcase classname="example.AddsTest" name="[CLM-ONE-002] adds two" time="0.001"/>';

  it.each([
    ["one suite, as Maven Surefire writes it", `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="example.AddsTest" tests="2" errors="0" skipped="0" failures="0">\n  ${twoTests}\n</testsuite>\n`],
    ["a suites element with suites in it, as pytest writes it", `<?xml version="1.0" encoding="utf-8"?><testsuites name="pytest tests"><testsuite name="pytest" errors="0" failures="0" skipped="0" tests="2">${twoTests}</testsuite></testsuites>`],
  ] as const)("[CLM-OBS-150] a JUnit evidence report was written well formed, as %s: an Evidence Observation will be posted for each of its tests", (_written, report) => {
    expect({ breaks: whereXmlBreaks(report), posted: observationsBySuite(resultsBySuiteFrom(report, "junit"), "/work").map(({ name }) => name) }).toEqual({
      breaks: undefined,
      posted: ["[CLM-ONE-001] adds one", "[CLM-ONE-002] adds two"],
    });
  });
});
