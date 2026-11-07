import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import {
  checkInputPaths,
  checkInputShapes,
  checkSavedReconciliation,
  checkWorkflowsParse,
  corpusDirRefusal,
  jsonInputsOf,
  readReports,
  reRenderOrRefusal,
} from "./unreadableInputs.js";
import { checkInputsExist } from "./cli.js";
import { refusalLine, UnparseableFeatureFiles, UnreadableInput } from "../cli-allocate/unreadable.js";
import { executeKeptRun } from "../run-management/keptRun.js";
import { errorText, type RefusalLines } from "../standardError.js";
import { usageStatusOf } from "../usageStatus.test-utils.js";
import { ciSourcePathsOf } from "../ingest/ciSourcePaths.js";
import { DEFAULT_CI_PATH, readCorpus, readWorkflows } from "../ingest/ingestQualityChecks.js";
import { reRender } from "./reRender.js";
import { AppError, AppMessage, Unreadable } from "../messages.js";
import { message } from "../appText.js";
import { runBalanceCaptured } from "../runBalance.test-utils.js";
import { captured, expectRefused } from "./balanceRun.test-utils.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";
import {
  CLAIM_RECONCILIATIONS_PATH,
  CLAIM_RECONCILIATIONS_SECTION,
  claimReconciliationsOf,
  claimReconciliationsSection,
  withClaimReconciliations,
  withoutClaimReconciliations,
} from "../../../../tests/steps/support/reportClaimReconciliations.js";
import {
  RECONCILIATION_TOTALS_PATH,
  reconciliationTotalsOf,
  reconciliationTotalsSection,
  withReconciliationTotals,
  withReconciliationTotalsUnderEarlierKey,
} from "../../../../tests/steps/support/reportReconciliationTotals.js";
import { SCENARIO_CODES_PATH, withScenarioCodesOnReport } from "../../../../tests/steps/support/reportScenarioCodes.js";
import { shownText } from "../shownText.test-utils.js";
import { scenarioName } from "../../../../tests/steps/support/scenarioName.js";

const nothingByDefault = (): boolean => false;
const reading = (content: string) => (): string => content;

describe("[SCN-CLI-076] checkInputShapes refuses a Vitest report not in the reporter's shape", () => {
  it("names the flag, the file and where the shape is wrong", () => {
    const inputs = jsonInputsOf({ vitest: "reports/vitest.json" }, nothingByDefault);
    const error = shownText(checkInputShapes(readReports(inputs, reading('{"testResults":"x"}'))));

    expect(error).toContain("--vitest");
    expect(error).toContain("reports/vitest.json");
    expect(error).toContain("testResults is a string, not a list");
  });

  it("passes a report in the reporter's shape, so the run goes on to reconcile", () => {
    const report = JSON.stringify({ testResults: [{ name: "a.test.ts", status: "passed", assertionResults: [] }] });
    expect(shownText(checkInputShapes(readReports(jsonInputsOf({ vitest: "v.json" }, nothingByDefault), reading(report))))).toBeNull();
  });

  function reportsOnDisk(files: Record<string, string>): string {
    const dir = temporaryDirectory("misshapen-vitest-");
    for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
    return dir;
  }

  const misshapenAt = (path: string): string =>
    message(AppError.NotInShape, {
      subject: message(AppMessage.FlaggedReport, { flag: "--vitest" }),
      shape: message(AppMessage.VitestReportShape),
      path,
      fault: "testResults is a string, not a list",
    });

  it("runBalance refuses a misshapen --vitest report at exit 2, naming the file and where its shape is wrong, reconciling nothing", () => {
    const { features, ci } = targetOnDisk();
    const vitest = join(reportsOnDisk({ "vitest.json": '{"testResults":"x"}' }), "vitest.json");
    const { stdout, stderr, exitCode } = runBalanceCaptured(["--features", features, "--ci", ci, "--vitest", vitest]);

    expectRefused({ report: stdout, stderr, exitCode }, misshapenAt(vitest));
  });

  it("refuses a misshapen Vitest report checked after a well-formed --package-json, not only the first input it checks", () => {
    const dir = reportsOnDisk({
      "package.json": '{"scripts":{"test":"vitest run"}}',
      "vitest.json": '{"testResults":"x"}',
    });
    const manifestFirst = [
      ...jsonInputsOf({ "package-json": join(dir, "package.json") }, nothingByDefault),
      ...jsonInputsOf({ vitest: join(dir, "vitest.json") }, nothingByDefault),
    ];

    expect(manifestFirst.map((input) => input.path)).toEqual([join(dir, "package.json"), join(dir, "vitest.json")]);
    expect(shownText(checkInputShapes(readReports(manifestFirst, (path) => readFileSync(path, "utf8"))))).toBe(misshapenAt(join(dir, "vitest.json")));
  });
});

describe("[SCN-CLI-077] checkInputShapes refuses a Cucumber report not in the formatter's shape", () => {
  it("names the flag, the file and where the shape is wrong", () => {
    const error = shownText(checkInputShapes(readReports(jsonInputsOf({ cucumber: "reports/cucumber.json" }, nothingByDefault), reading("{}"))));

    expect(error).toContain("--cucumber");
    expect(error).toContain("reports/cucumber.json");
    expect(error).toContain("the top level is an object, not a list");
  });
});

describe("[SCN-PYT-009] checkInputShapes refuses a --pytest file that is not the JUnit XML report pytest writes", () => {
  const refusalOf = (content: string): string | null =>
    shownText(checkInputShapes(readReports(jsonInputsOf({ pytest: "reports/report.xml" }, nothingByDefault), reading(content))));

  it.each([
    ["text that is not XML", "collected 3 items\n3 passed\n", "is not valid XML"],
    ["a JSON report", '{"testResults":[]}', "is not valid XML"],
    ["XML that holds no test suites", "<html><body/></html>", "testsuites is missing"],
    ["test suites that are not a list of elements", '<testsuites name="t">x<testsuite>y</testsuite></testsuites>', "testsuites.testsuite[0] is a string, not an object"],
  ])("refuses %s, naming the flag, the file, the shape pytest writes and what is wrong", (_, content, fault) => {
    const error = refusalOf(content) ?? "";

    expect(error).toContain("--pytest");
    expect(error).toContain("reports/report.xml");
    expect(error).toContain(message(AppMessage.JunitReportShape));
    expect(error).toContain(fault);
  });

  it("refuses a single Surefire report whose root is one test suite, which --junit reads, as XML that holds no test suites", () => {
    const error = refusalOf(readFileSync("tests/fixtures/surefire-single-report/report.xml", "utf8")) ?? "";

    expect(error).toContain("--pytest");
    expect(error).toContain("reports/report.xml");
    expect(error).toContain(message(AppMessage.JunitReportShape));
    expect(error).toContain("testsuites is missing");
  });

  it("runBalance refuses a --pytest file that is not XML at exit 2, naming the file and the shape, reconciling nothing", () => {
    const { features, ci } = targetOnDisk();
    const report = join(features, "..", "report.xml");
    writeFileSync(report, "not xml\n");
    const { stdout, stderr, exitCode } = runBalanceCaptured(["--features", features, "--ci", ci, "--pytest", report]);

    expect({ report: stdout, exitCode }).toEqual({ report: "", exitCode: 2 });
    expect(stderr).toContain(report);
    expect(stderr).toContain(message(AppMessage.JunitReportShape));
  });
});

describe("[SCN-JST-008] checkInputShapes refuses a --jest file that is not the JSON report Jest writes", () => {
  const refusalOf = (content: string): string | null =>
    shownText(checkInputShapes(readReports(jsonInputsOf({ jest: "reports/jest.json" }, nothingByDefault), reading(content))));

  it.each([
    ["text that is not JSON", "PASS src/a.test.ts\nTests: 3 passed, 3 total\n", "is not valid JSON"],
    ["a JUnit XML report", '<?xml version="1.0" encoding="UTF-8"?><testsuites name="jest tests"></testsuites>', "is not valid JSON"],
    ["JSON that holds no test results", '{"numTotalTests":0}', "testResults is missing"],
  ])("refuses %s, naming the flag, the file, the shape Jest writes and what is wrong", (_, content, fault) => {
    const error = refusalOf(content) ?? "";

    expect(error).toContain("--jest");
    expect(error).toContain("reports/jest.json");
    expect(error).toContain(message(AppMessage.JestReportShape));
    expect(error).toContain(fault);
  });

  it("runBalance refuses a --jest file that is not JSON at exit 2, naming the file and the shape, reconciling nothing", () => {
    const { features, ci } = targetOnDisk();
    const report = join(features, "..", "jest.json");
    writeFileSync(report, "not json\n");
    const { stdout, stderr, exitCode } = runBalanceCaptured(["--features", features, "--ci", ci, "--jest", report]);

    expect({ report: stdout, exitCode }).toEqual({ report: "", exitCode: 2 });
    expect(stderr).toContain(report);
    expect(stderr).toContain(message(AppMessage.JestReportShape));
  });
});

describe("[SCN-RSP-009] checkInputShapes refuses an --rspec file that is not the JSON report RSpec writes", () => {
  const refusalOf = (content: string): string | null =>
    shownText(checkInputShapes(readReports(jsonInputsOf({ rspec: "reports/rspec.json" }, nothingByDefault), reading(content))));

  it.each([
    ["text that is not JSON", "Finished in 0.01 seconds\n3 examples, 0 failures\n", "is not valid JSON"],
    [
      "a JUnit XML report",
      '<?xml version="1.0" encoding="UTF-8"?><testsuite name="rspec" tests="0"></testsuite>',
      "is not valid JSON",
    ],
    ["JSON that holds no examples, as a Jest report", '{"numTotalTests":0,"testResults":[]}', "examples is missing"],
    ["examples with no summary", '{"examples":[]}', "summary is missing"],
    [
      "an example whose description is not a string",
      '{"examples":[{"description":1}],"summary":{}}',
      "examples[0].description is a number, not a string",
    ],
    [
      "an error count that is not a number",
      '{"examples":[],"summary":{"errors_outside_of_examples_count":"1"}}',
      "summary.errors_outside_of_examples_count is a string, not a number",
    ],
    ["messages that are not a list", '{"examples":[],"summary":{},"messages":"x"}', "messages is a string, not a list"],
  ])("refuses %s, naming the flag, the file, the shape RSpec writes and what is wrong", (_, content, fault) => {
    const error = refusalOf(content) ?? "";

    expect(error).toContain("--rspec");
    expect(error).toContain("reports/rspec.json");
    expect(error).toContain(message(AppMessage.RspecReportShape));
    expect(error).toContain(fault);
  });

  it("runBalance refuses an --rspec file that is not JSON at exit 2, naming the file and the shape, reconciling nothing", () => {
    const { features, ci } = targetOnDisk();
    const report = join(features, "..", "rspec.json");
    writeFileSync(report, "not json\n");
    const { stdout, stderr, exitCode } = runBalanceCaptured(["--features", features, "--ci", ci, "--rspec", report]);

    expect({ report: stdout, exitCode }).toEqual({ report: "", exitCode: 2 });
    expect(stderr).toContain(report);
    expect(stderr).toContain(message(AppMessage.RspecReportShape));
  });
});

describe("[SCN-GOT-009] checkInputShapes refuses a --junit file that is not a JUnit XML report", () => {
  const refusalOf = (content: string): string | null =>
    shownText(checkInputShapes(readReports(jsonInputsOf({ junit: "reports/report.xml" }, nothingByDefault), reading(content))));

  it.each([
    ["text that is not XML", "=== RUN   TestCited\n--- PASS: TestCited (0.00s)\nok\n", "is not valid XML"],
    ["a JSON report", '{"testResults":[]}', "is not valid XML"],
    ["XML that holds no test suites", "<html><body/></html>", "testsuites is missing"],
  ])("refuses %s, naming the flag, the file, the shape of a JUnit XML report and what is wrong, and no single runner", (_, content, fault) => {
    const error = refusalOf(content) ?? "";

    expect(error).toContain("--junit");
    expect(error).toContain("reports/report.xml");
    expect(error).toContain(`in the shape ${message(AppMessage.JunitXmlReportShape)}`);
    expect(error).toContain(fault);
    expect(error).not.toContain("pytest");
  });

  it("runBalance refuses a --junit file that is not XML at exit 2, naming the file and the shape, reconciling nothing", () => {
    const { features, ci } = targetOnDisk();
    const report = join(features, "..", "report.xml");
    writeFileSync(report, "not xml\n");
    const { stdout, stderr, exitCode } = runBalanceCaptured(["--features", features, "--ci", ci, "--junit", report]);

    expect({ report: stdout, exitCode }).toEqual({ report: "", exitCode: 2 });
    expect(stderr).toContain(report);
    expect(stderr).toContain(`in the shape ${message(AppMessage.JunitXmlReportShape)}`);
  });
});

describe("[SCN-JAV-011] checkInputShapes refuses a report file in a --junit directory that is not a JUnit XML report, naming that file", () => {

  function surefireReportsBeside(content: string): { reports: string; notAReport: string } {
    const reports = temporaryDirectory("surefire-reports-");
    cpSync("tests/fixtures/java/surefire-reports", reports, { recursive: true });
    const notAReport = join(reports, "TEST-example.NotAReport.xml");
    writeFileSync(notAReport, content);
    return { reports, notAReport };
  }

  it("refuses a report file holding XML that holds no test suites, naming the flag, that file, the shape of a JUnit XML report and what is wrong", () => {
    const { reports, notAReport } = surefireReportsBeside("<html><body/></html>");
    const error = shownText(checkInputShapes(readReports(jsonInputsOf({ junit: reports }, existsSync), (path) => readFileSync(path, "utf8")))) ?? "";

    expect(error).toContain("--junit");
    expect(error).toContain(notAReport);
    expect(error).toContain(`in the shape ${message(AppMessage.JunitXmlReportShape)}`);
    expect(error).toContain("testsuites is missing");
  });

  it("runBalance refuses the directory at exit 2, naming that file and the shape, reconciling nothing", () => {
    const { features, ci } = targetOnDisk();
    const { reports, notAReport } = surefireReportsBeside("not xml\n");
    const { stdout, stderr, exitCode } = runBalanceCaptured(["--features", features, "--ci", ci, "--junit", reports]);

    expect({ report: stdout, exitCode }).toEqual({ report: "", exitCode: 2 });
    expect(stderr).toContain(notAReport);
    expect(stderr).toContain(`in the shape ${message(AppMessage.JunitXmlReportShape)}`);
  });
});

describe("[SCN-CLI-079] checkInputShapes refuses a package.json not in a manifest's shape, given or read by default", () => {

  it("refuses a default package.json that does not parse, rather than crashing on it", () => {
    const error = shownText(checkInputShapes(readReports(jsonInputsOf({}, (path) => path === "package.json"), reading("{not json"))));
    expect(error).toContain("package.json read by default is not valid JSON");
  });
});

describe("[SCN-CLI-080] checkInputShapes reads a well-formed empty report", () => {
  it.each([
    ["vitest", '{"testResults":[]}'],
    [
      "pytest",
      '<?xml version="1.0" encoding="utf-8"?><testsuites name="pytest tests"><testsuite name="pytest" errors="0" failures="0" skipped="0" tests="0" time="0.004" /></testsuites>',
    ],
    ["jest", '{"numTotalTests":0,"success":true,"testResults":[]}'],
    [
      "rspec",
      '{"version":"3.13.6","messages":["No examples found."],"examples":[],"summary":{"duration":0.000021,"example_count":0,"failure_count":0,"pending_count":0,"errors_outside_of_examples_count":0},"summary_line":"0 examples, 0 failures"}',
    ],
    [
      "junit",
      '<?xml version="1.0" encoding="UTF-8"?><testsuites tests="0" failures="0" errors="0" time="0.001000"><testsuite tests="0" failures="0" time="0.000000" name="example.com/empty" timestamp="2026-10-14T22:35:27Z"><properties><property name="go.version" value="go1.27.2 linux/amd64"></property></properties></testsuite></testsuites>',
    ],
    ["cucumber", "[]"],
    ["ci-steps", "{}"],
  ])("passes an empty --%s", (flag, content) => {
    expect(shownText(checkInputShapes(readReports(jsonInputsOf({ [flag]: "empty.json" }, nothingByDefault), reading(content))))).toBeNull();
  });

  function directoryHoldingNoReport(): string {
    const reports = temporaryDirectory("surefire-reports-");
    return reports;
  }

  it("passes a --junit directory holding no report, reading no file in it", () => {
    const reports = directoryHoldingNoReport();
    const inputs = jsonInputsOf({ junit: reports }, nothingByDefault);

    expect(inputs).toEqual([]);
    expect(shownText(checkInputShapes(readReports(inputs, (path) => readFileSync(path, "utf8"))))).toBeNull();
  });

  it("runBalance reads a --junit directory holding no report as an empty report, reaching the verdict of the same run given no report", () => {
    const { features, ci } = targetOnDisk();
    const reports = directoryHoldingNoReport();
    const withEmptyDirectory = runBalanceCaptured(["--features", features, "--ci", ci, "--junit", reports, "--format", "json"]);
    const withNoReport = runBalanceCaptured(["--features", features, "--ci", ci, "--format", "json"]);

    expect(withEmptyDirectory.stderr).toBe("");
    expect(withEmptyDirectory.exitCode).toBe(withNoReport.exitCode);
    expect(claimReconciliationsOf(JSON.parse(withEmptyDirectory.stdout))).toEqual(claimReconciliationsOf(JSON.parse(withNoReport.stdout)));
  });
});

function targetOnDisk(): { features: string; ci: string } {
  const dir = temporaryDirectory("input-paths-");
  const features = join(dir, "features");
  const ci = join(dir, "workflows");
  mkdirSync(features);
  mkdirSync(ci);
  writeFileSync(join(features, "a.feature"), "Feature: a\n");
  writeFileSync(join(ci, "ci.yml"), "jobs: {}\n");
  return { features, ci };
}

describe("[SCN-CLI-075] checkInputPaths refuses a path that is not the kind its flag reads", () => {
  it.each([
    ["a regular file", "notes.txt", "notes\n"],
    ["a single feature file", "z.feature", "Feature: z\n"],
  ])("names --features and the path when the corpus given is %s", (_kind, name, content) => {
    const { features } = targetOnDisk();
    const file = join(features, name);
    writeFileSync(file, content);
    const error = shownText(checkInputPaths({ features: file }, readCorpus(file), readWorkflows(undefined)));
    const refusal = message(AppError.CouldNotBeRead, { subject: message(AppMessage.FlaggedCorpus, { flag: "--features" }), path: file, reason: "ENOTDIR" });

    expect(error).toContain(refusal.slice(0, -")".length));
  });

  it("names the entry when the corpus holds a directory named as a feature file", () => {
    const { features } = targetOnDisk();
    mkdirSync(join(features, "z.feature"));
    const error = shownText(checkInputPaths({ features }, readCorpus(features), readWorkflows(undefined)));

    expect(error).toContain("--features");
    expect(error).toContain(join(features, "z.feature"));
    expect(error).toContain("EISDIR");
  });

  it("names the entry when the CI workflows hold a directory named as a workflow file", () => {
    const { features, ci } = targetOnDisk();
    mkdirSync(join(ci, "x.yml"));
    const error = shownText(checkInputPaths({ features, ci }, readCorpus(features), readWorkflows(ci)));

    expect(error).toContain("--ci");
    expect(error).toContain(join(ci, "x.yml"));
    expect(error).toContain("EISDIR");
  });

  it("names the entry when the directory given to --junit holds a directory named as a JUnit report, never passing it as holding no report", () => {
    const dir = temporaryDirectory("junit-directory-named-as-report-");
    mkdirSync(join(dir, "TEST-example.NestedTest.xml"));
    const error = shownText(checkInputShapes(readReports(jsonInputsOf({ junit: dir }, nothingByDefault), (path) => readFileSync(path, "utf8"))));

    expect(error).toContain("--junit");
    expect(error).toContain(join(dir, "TEST-example.NestedTest.xml"));
    expect(error).toContain("EISDIR");
  });
});

describe("[SCN-CLI-082] an input the tool is not permitted to read is refused, naming it and the path", () => {
  const runsAsRoot = (): boolean => process.getuid?.() === 0;
  const locked: string[] = [];

  afterEach(() => {
    vi.restoreAllMocks();
    for (const path of locked.splice(0)) chmodSync(path, 0o755);
  });

  function lock(path: string): string {
    chmodSync(path, 0o000);
    locked.push(path);
    return path;
  }

  function osReasonFor(read: () => unknown): string {
    try {
      read();
    } catch (err) {
      return (err as Error).message;
    }
    throw new Error("the locked input was read");
  }

  it("runBalance refuses a given --features corpus it may not read at exit 2, naming the flag, the path and the refusal to read it, reconciling nothing", ({ skip }) => {
    skip(runsAsRoot());
    const features = lock(targetOnDisk().features);
    const reason = osReasonFor(() => readdirSync(features));

    expectRefused(captured(["--features", features]), message(AppError.CouldNotBeRead, { subject: message(AppMessage.FlaggedCorpus, { flag: "--features" }), path: features, reason }));
  });

  it("runBalance refuses a given --vitest report it may not read at exit 2, calling the report unreadable rather than misshapen, reconciling nothing", ({ skip }) => {
    skip(runsAsRoot());
    const dir = temporaryDirectory("vitest-not-permitted-");
    const path = join(dir, "vitest.json");
    writeFileSync(path, '{"testResults":[]}');
    lock(path);
    const reason = osReasonFor(() => readFileSync(path, "utf8"));

    expectRefused(captured(["--features", "tests/fixtures/evidence-observation/features", "--vitest", path]), message(AppError.CouldNotBeRead, { subject: message(AppMessage.FlaggedReport, { flag: "--vitest" }), path, reason }));
  });

  it.each([
    ["cucumber", "cucumber.json", "[]", AppMessage.FlaggedReport],
    ["package-json", "package.json", "{}", AppMessage.FlaggedManifest],
    ["ci-steps", "ci-steps.json", "{}", AppMessage.FlaggedRecord],
  ] as const)(
    "runBalance refuses a given --%s it may not read at exit 2, naming it as its declaration names it, reconciling nothing",
    (flag, file, text, subject) => {
      if (runsAsRoot()) return;
      const dir = temporaryDirectory(`${flag}-not-permitted-`);
      const path = join(dir, file);
      writeFileSync(path, text);
      lock(path);
      const reason = osReasonFor(() => readFileSync(path, "utf8"));

      expectRefused(captured(["--features", "tests/fixtures/evidence-observation/features", `--${flag}`, path]), message(AppError.CouldNotBeRead, { subject: message(subject, { flag: `--${flag}` }), path, reason }));
    },
  );

  it("runBalance refuses a given --pytest report it may not read at exit 2, calling the report unreadable rather than misshapen, reconciling nothing", ({ skip }) => {
    skip(runsAsRoot());
    const dir = temporaryDirectory("pytest-not-permitted-");
    const path = join(dir, "report.xml");
    writeFileSync(path, '<testsuites><testsuite name="pytest" tests="0" /></testsuites>');
    lock(path);
    const reason = osReasonFor(() => readFileSync(path, "utf8"));

    expectRefused(captured(["--features", "tests/fixtures/evidence-observation/features", "--pytest", path]), message(AppError.CouldNotBeRead, { subject: message(AppMessage.FlaggedReport, { flag: "--pytest" }), path, reason }));
  });

  it("runBalance refuses a given --jest report it may not read at exit 2, calling the report unreadable rather than misshapen, reconciling nothing", ({ skip }) => {
    skip(runsAsRoot());
    const dir = temporaryDirectory("jest-not-permitted-");
    const path = join(dir, "jest.json");
    writeFileSync(path, '{"numTotalTests":0,"success":true,"testResults":[]}');
    lock(path);
    const reason = osReasonFor(() => readFileSync(path, "utf8"));

    expectRefused(captured(["--features", "tests/fixtures/evidence-observation/features", "--jest", path]), message(AppError.CouldNotBeRead, { subject: message(AppMessage.FlaggedReport, { flag: "--jest" }), path, reason }));
  });

  it("runBalance refuses a given --rspec report it may not read at exit 2, calling the report unreadable rather than misshapen, reconciling nothing", ({ skip }) => {
    skip(runsAsRoot());
    const dir = temporaryDirectory("rspec-not-permitted-");
    const path = join(dir, "rspec.json");
    writeFileSync(path, '{"version":"3.13.6","messages":["No examples found."],"examples":[],"summary":{"example_count":0,"errors_outside_of_examples_count":0}}');
    lock(path);
    const reason = osReasonFor(() => readFileSync(path, "utf8"));

    expectRefused(captured(["--features", "tests/fixtures/evidence-observation/features", "--rspec", path]), message(AppError.CouldNotBeRead, { subject: message(AppMessage.FlaggedReport, { flag: "--rspec" }), path, reason }));
  });

  it("runBalance refuses a given --junit report it may not read at exit 2, calling the report unreadable rather than misshapen, reconciling nothing", ({ skip }) => {
    skip(runsAsRoot());
    const dir = temporaryDirectory("junit-not-permitted-");
    const path = join(dir, "report.xml");
    writeFileSync(path, '<testsuites tests="0"><testsuite name="example.com/empty" tests="0" /></testsuites>');
    lock(path);
    const reason = osReasonFor(() => readFileSync(path, "utf8"));

    expectRefused(captured(["--features", "tests/fixtures/evidence-observation/features", "--junit", path]), message(AppError.CouldNotBeRead, { subject: message(AppMessage.FlaggedReport, { flag: "--junit" }), path, reason }));
  });

  it("runBalance refuses a given --junit directory it may not list at exit 2, naming the flag, the directory and the refusal to read it, reconciling nothing", ({ skip }) => {
    skip(runsAsRoot());
    const dir = temporaryDirectory("junit-directory-not-permitted-");
    const reports = join(dir, "surefire-reports");
    mkdirSync(reports);
    writeFileSync(join(reports, "TEST-example.ExampleTest.xml"), '<testsuite name="example.ExampleTest" tests="0" />');
    lock(reports);
    const reason = osReasonFor(() => readFileSync(reports, "utf8"));

    expectRefused(captured(["--features", "tests/fixtures/evidence-observation/features", "--junit", reports]), message(AppError.CouldNotBeRead, { subject: message(AppMessage.FlaggedReport, { flag: "--junit" }), path: reports, reason }));
  });

  it("names the feature corpus read by default, and its path, when no --features is given and the working directory's corpus may not be read", ({ skip }) => {
    skip(runsAsRoot());
    const target = targetOnDisk();
    const features = lock(target.features);
    vi.spyOn(process, "cwd").mockReturnValue(join(features, ".."));
    const reason = osReasonFor(() => readdirSync(features));

    expect(shownText(checkInputPaths({ ci: target.ci }, readCorpus(features), readWorkflows(target.ci)))).toBe(
      message(AppError.CouldNotBeRead, { subject: message(AppMessage.DefaultFeatureCorpus), path: features, reason }),
    );
  });

  it("refuses the package.json read by default when it cannot be read", () => {
    const read = (): string => {
      throw Object.assign(new Error("EACCES: permission denied, open 'package.json'"), { code: "EACCES" });
    };
    expect(shownText(checkInputShapes(readReports(jsonInputsOf({}, () => true), read)))).toContain("package.json read by default could not be read");
  });
});

describe("[SCN-CLI-087] a subdirectory of the corpus the tool may not read is refused, naming it, never skipped", () => {
  const runsAsRoot = (): boolean => process.getuid?.() === 0;
  const locked: string[] = [];

  afterEach(() => {
    for (const path of locked.splice(0)) chmodSync(path, 0o755);
  });

  function corpusWithLockedSubdirectory(): { features: string; subdirectory: string; reason: string } {
    const { features } = targetOnDisk();
    const subdirectory = join(features, "area");
    mkdirSync(subdirectory);
    writeFileSync(join(subdirectory, "b.feature"), "Feature: b\n");
    chmodSync(subdirectory, 0o000);
    locked.push(subdirectory);
    let reason = "";
    try {
      readdirSync(subdirectory);
    } catch (err) {
      reason = (err as Error).message;
    }
    expect(reason).not.toBe("");
    return { features, subdirectory, reason };
  }

  it("runBalance refuses the --features corpus at exit 2, naming the subdirectory it may not read and the refusal to read it, reconciling nothing", ({ skip }) => {
    skip(runsAsRoot());
    const { features, subdirectory, reason } = corpusWithLockedSubdirectory();
    const { stdout, stderr, exitCode } = runBalanceCaptured(["--features", features]);

    expectRefused({ report: stdout, stderr, exitCode }, message(AppError.CouldNotBeRead, { subject: message(AppMessage.FlaggedCorpus, { flag: "--features" }), path: subdirectory, reason }));
  });
});

describe("[SCN-CLI-102] checkWorkflowsParse refuses a workflow that does not parse as YAML, naming the workflows, the file and the parse error", () => {
  const NOT_YAML = "jobs:\n  ci: [\n";
  const readText = (path: string): string => readFileSync(path, "utf8");

  function parseErrorOf(text: string): string {
    try {
      parse(text);
    } catch (err) {
      return (err as Error).message;
    }
    throw new Error("expected the text not to parse as YAML");
  }

  const refusal = (workflows: string, file: string): string =>
    message(AppError.WorkflowNotYaml, { workflows, file, message: parseErrorOf(NOT_YAML) });

  it("refuses a --ci workflow file that does not parse, naming --ci, the file and the parser's error", () => {
    const { ci } = targetOnDisk();
    const file = join(ci, "ci.yml");
    writeFileSync(file, NOT_YAML);

    expect(shownText(checkWorkflowsParse({ ci: file }, readWorkflows(file, readText)))).toBe(refusal(message(AppMessage.FlaggedWorkflows, { flag: "--ci" }), file));
  });

  it("refuses a workflow in the --ci folder that does not parse, naming that workflow", () => {
    const { ci } = targetOnDisk();
    const file = join(ci, "build.yml");
    writeFileSync(file, NOT_YAML);

    expect(shownText(checkWorkflowsParse({ ci }, readWorkflows(ci, readText)))).toBe(refusal(message(AppMessage.FlaggedWorkflows, { flag: "--ci" }), file));
  });

  it("refuses a workflow read by default that does not parse, naming the CI workflows read by default", () => {
    const [file] = ciSourcePathsOf(DEFAULT_CI_PATH);
    expect(file, "the repository's own workflows are read by default").toBeDefined();

    const error = shownText(checkWorkflowsParse({}, readWorkflows(undefined, (path) => (path === file ? NOT_YAML : readText(path)))));

    expect(error).toBe(refusal(message(AppMessage.DefaultCiWorkflows), file!));
  });

  it("refuses nothing for a workflow that parses but declares no jobs", () => {
    const { ci } = targetOnDisk();
    writeFileSync(join(ci, "ci.yml"), "name: no jobs\n");

    expect(shownText(checkWorkflowsParse({ ci }, readWorkflows(ci, readText)))).toBeNull();
  });
});

const claimCodes = () => ({ featureFiles: 1, featureCodes: 0, excludedOccurrences: 0, untaggedScenarios: [scenarioName("a.feature", "one")] });
const saved = () => withScenarioCodesOnReport({"runProvenance":{"target":"unknown-target","sourceSha":null,"toolSha":null,"toolVersion":"0.1.0-alpha.5","runTimestamp":"2026-09-27T10:03:01Z","inputs":{"features":"feat"},"corpus":"feat","strict":false},"summary":{...reconciliationTotalsSection({"claimReconciliations":{"total":1,"balanced":0,"outOfBalance":1,"phantomClaim":0,"unnamedClaim":0},"reconciliationLines":{"total":1,"byOutcome":{"satisfied":0,"missing":0,"failing":0,"watermelon":0,"cites-unknown-scenario":0,"cites-no-scenario":0,"no-claim-code":1,"duplicate-claim-code":0,"broken":0,"no-evidence-obligation":0,"both-missing":0},"outOfBalance":1,"missingByQualityCheckKind":[]},"pending":0}),"evidenceObservations":{"total":0,"onScenario":0,"onPhantomClaim":0,"onUnnamedClaim":0,"byQualityCheckKind":[{"qualityCheckKind":"unit","count":0},{"qualityCheckKind":"integration","count":0},{"qualityCheckKind":"e2e","count":0},{"qualityCheckKind":"performance","count":0},{"qualityCheckKind":"fitness","count":0}]},"claimReconciliations":{"total":1,"balanced":0,"outOfBalance":1,"phantomClaim":0,"unnamedClaim":0},"qualityCheckReconciliations":{"total":1,"byOutcome":{"satisfied":0,"missing":0,"failing":0,"watermelon":0,"cites-unknown-scenario":0,"cites-no-scenario":0,"no-claim-code":1,"duplicate-claim-code":0,"broken":0,"no-evidence-obligation":0,"both-missing":0},"outOfBalance":1,"missingByQualityCheckKind":[]},"pending":0,"testVolume":{"totalEvidenceObservations":0,"onScenario":0,"onPhantomClaim":0,"onUnnamedClaim":0},"rawByBehaviouralQualityCheck":{"unit":0,"integration":0,"e2e":0,"performance":0},"fitnessFunctions":{"runningFitnessFunctionCount":0,"uncitedFitnessFunctionCount":0},"fitness":{"satisfied":0,"total":0}},...claimReconciliationsSection([{"claim":"a.feature : one","kind":"scenario","verdict":"out-of-balance","evidenceObservations":[],"evidenceObligations":[],"qualityCheckReconciliations":[{"outcome":"no-claim-code","evidenceObligation":{"qualityCheckKind":null}}],"reconcilingItems":[{"outcome":"no-claim-code","evidenceObligation":{"qualityCheckKind":null}}],"pendingItems":[]}]),"claimCodeErrors":[],"scenarioCodePopulation":{"featureFiles":1,"featureCodes":0},"evidenceObligations":{"excludedOccurrences":0,"untaggedScenarios":[scenarioName("a.feature", "one")],"proseOnlyCodes":[]}}, claimCodes());
type Saved = ReturnType<typeof saved>;
const SAVED_BEFORE_CLAIM_KEYS = {"runProvenance":{"target":"unknown-target","sourceSha":null,"toolSha":null,"toolVersion":"0.1.0-alpha.5","runTimestamp":"2026-09-27T10:03:01Z","inputs":{"features":"feat"},"corpus":"feat","strict":false},"summary":{"scenarioReconciliations":{"total":1,"balanced":0,"outOfBalance":1,"phantom":0,"suspense":0},"qualityCheckReconciliations":{"total":1,"byOutcome":{"satisfied":0,"missing":0,"failing":0,"watermelon":0,"cites-unknown-scenario":0,"cites-no-scenario":0,"no-scn-code":1,"duplicate-scn-code":0,"broken":0,"no-evidence-obligation":0,"both-missing":0},"outOfBalance":1,"missingByQualityCheckKind":[]},"pending":0,"testVolume":{"totalEvidenceObservations":0,"onScenario":0,"onPhantomScenario":0,"onSuspenseScenario":0},"rawByBehaviouralQualityCheck":{"unit":0,"integration":0,"e2e":0,"performance":0},"fitnessFunctions":{"runningFitnessFunctionCount":0,"uncitedFitnessFunctionCount":0},"fitness":{"satisfied":0,"total":0}},"ledger":{"scenarioReconciliations":[{"scnId":"a.feature : one","kind":"scenario","verdict":"out-of-balance","evidenceObservations":[],"evidenceObligations":[],"qualityCheckReconciliations":[{"outcome":"no-scn-code","evidenceObligation":{}}],"reconcilingItems":[{"outcome":"no-scn-code","evidenceObligation":{}}],"pendingItems":[]}]},"scenarioCodeErrors":[],"scenarioCodePopulation":{"featureFiles":1,"featureCodes":0},"evidenceObligations":{"excludedOccurrences":0,"untaggedScenarios":[{"feature":"a.feature","scenario":"one"}],"proseOnlyCodes":[]}};

const savedWithSections = () => withScenarioCodesOnReport({
  ...saved(),
  errorsInTheInputs: {
    claimCodeErrors: [{ kind: "several-claim-codes", files: ["a.feature"], scenario: "one", codes: ["@SCN-AAA-001", "@SCN-AAA-002"] }],
    configurationNotRead: {
      keysNotRead: ["runner"],
      ofWrongKind: [{ entry: "tiers", is: "string", reads: "list" }],
      runnerKeysNotALayer: ["smoke"],
      nonChecksMatchingNoStep: ["lint"],
      nonChecksNotAStepName: ["Deploy"],
    },
  },
}, claimCodes());

describe("[SCN-CLI-074] a saved file that is not a saved reconciliation is refused, naming a section of the wrong kind by its place in the report, and one in an earlier report shape by its missing section", () => {
  it.each([
    ["the top level is a list, not an object", () => []],
    ["runProvenance is missing", (s: Saved) => ({ ...s, runProvenance: undefined })],
    ["summary is missing", (s: Saved) => ({ ...s, summary: undefined })],
    [`${CLAIM_RECONCILIATIONS_PATH} is missing`, (s: Saved) => withClaimReconciliations(s, undefined)],
    [`${RECONCILIATION_TOTALS_PATH} is missing`, () => SAVED_BEFORE_CLAIM_KEYS],
    [`${RECONCILIATION_TOTALS_PATH} is missing`, (s: Saved) => withReconciliationTotalsUnderEarlierKey(s)],
    [
      "summary.claimCodes is missing",
      (s: Saved) => {
        const { claimCodes, ...summary } = s.summary as Saved["summary"] & { claimCodes: unknown };
        return { ...s, summary, claimCodes };
      },
    ],
    ["claimReconciliations is missing", (s: Saved) => ({ ...withoutClaimReconciliations(s), ledger: claimReconciliationsSection(claimReconciliationsOf(s)) })],
    ["summary.evidenceObservations is missing", (s: Saved) => ({ ...s, summary: { ...s.summary, evidenceObservations: undefined } })],
    [`${CLAIM_RECONCILIATIONS_PATH} is an object, not a list`, (s: Saved) => withClaimReconciliations(s, {})],
    [
      `${CLAIM_RECONCILIATIONS_PATH}[0].qualityCheckReconciliations[0].evidenceObligation.qualityCheckKind is missing`,
      (s: Saved) => withClaimReconciliations(s, [{ qualityCheckReconciliations: [{ outcome: "no-claim-code", evidenceObligation: {} }] }]),
    ],
    [
      `${CLAIM_RECONCILIATIONS_PATH}[0].pendingItems[0].qualityCheckKind is missing`,
      (s: Saved) => withClaimReconciliations(s, [{ pendingItems: [{}] }]),
    ],
    ["errorsInTheInputs.claimCodeErrors is a string, not a list", (s: Saved) => ({ ...s, errorsInTheInputs: { claimCodeErrors: "x" } })],
    ["errorsInTheInputs.configurationNotRead.keysNotRead is a string, not a list", (s: Saved) => ({ ...s, errorsInTheInputs: { configurationNotRead: { keysNotRead: "x" } } })],
    ["errorsInTheInputs.configurationNotRead.ofWrongKind is a string, not a list", (s: Saved) => ({ ...s, errorsInTheInputs: { configurationNotRead: { ofWrongKind: "x" } } })],
    ["errorsInTheInputs.configurationNotRead.runnerKeysNotALayer is a string, not a list", (s: Saved) => ({ ...s, errorsInTheInputs: { configurationNotRead: { runnerKeysNotALayer: "x" } } })],
    ["errorsInTheInputs.configurationNotRead.nonChecksMatchingNoStep is a string, not a list", (s: Saved) => ({ ...s, errorsInTheInputs: { configurationNotRead: { nonChecksMatchingNoStep: "x" } } })],
    ["errorsInTheInputs.configurationNotRead.nonChecksNotAStepName is a string, not a list", (s: Saved) => ({ ...s, errorsInTheInputs: { configurationNotRead: { nonChecksNotAStepName: "x" } } })],
    ["errorsInTheInputs is missing", (s: Saved) => ({ ...s, errors: { configuration: { keysNotRead: ["runner"] } } })],
    ["errorsInTheInputs is missing", (s: Saved) => ({ ...s, errors: { scenarioCodes: [], configurationNotRead: { keysNotRead: ["runner"] } } })],
    ["errorsInTheInputs.claimCodeErrors is missing", (s: Saved) => ({ ...s, errorsInTheInputs: { scenarioCodes: [] } })],
    ["errorsInTheInputs.configurationNotRead is missing", (s: Saved) => ({ ...s, errorsInTheInputs: { configuration: { keysNotRead: ["runner"] } } })],
    [`${SCENARIO_CODES_PATH} is a string, not an object`, (s: Saved) => withScenarioCodesOnReport(s, "x")],
    ["runProvenance.corpus is missing", (s: Saved) => ({ ...s, runProvenance: { ...s.runProvenance, corpus: undefined } })],
    [
      `${RECONCILIATION_TOTALS_PATH}.reconciliationLines.missingByQualityCheckKind[0].qualityCheckKind is missing`,
      (s: Saved) =>
        withReconciliationTotals(s, {
          ...reconciliationTotalsOf(s),
          reconciliationLines: { ...reconciliationTotalsOf(s).reconciliationLines, missingByQualityCheckKind: [{ subject: "unit", count: 1 }] },
        }),
    ],
    [
      `${SCENARIO_CODES_PATH}.untaggedScenarios[0].title is missing`,
      (s: Saved) => withScenarioCodesOnReport(s, { featureFiles: 1, featureCodes: 0, excludedOccurrences: 0, untaggedScenarios: [{ feature: "a.feature", scenario: "one" }] }),
    ],
    [
      `${SCENARIO_CODES_PATH}.sharedClaimCodes[0].scenarios[0].title is missing`,
      (s: Saved) =>
        withScenarioCodesOnReport(s, {
          featureFiles: 1,
          featureCodes: 1,
          excludedOccurrences: 0,
          untaggedScenarios: [],
          sharedClaimCodes: [{ claimCode: "SCN-AAA-001", scenarios: [{ feature: "a.feature", scenario: "one" }, { feature: "a.feature", scenario: "two" }] }],
        }),
    ],
  ] as const)("names where a saved file departs from a saved reconciliation: %s", (fault, documentOf: (s: Saved) => unknown) => {
    const error = shownText(checkSavedReconciliation("saved.json", documentOf(saved())));

    expect(error).toContain("--render-from-json");
    expect(error).toContain("saved.json");
    expect(error).toContain(fault);
    expect(error).toContain("Run balance again to save one.");
  });

  it("passes a reconciliation saved with its input faults and its corpus's facts", () => {
    expect(shownText(checkSavedReconciliation("saved.json", savedWithSections()))).toBeNull();
  });

  function reRendering(document: unknown): { path: string; report: string; stderr: string; exitCode: unknown } {
    const dir = temporaryDirectory("render-not-saved-");
    const path = join(dir, "spec-reconciliation.json");
    writeFileSync(path, JSON.stringify(document));
    const { stdout, stderr, exitCode } = runBalanceCaptured(["--render-from-json", path]);
    return { path, report: stdout, stderr, exitCode };
  }

  let theFile: string;

  beforeEach(() => {
    theFile = message(AppMessage.FlaggedFile, { flag: "--render-from-json" });
  });

  it("runBalance refuses a saved file with NO LEDGER at exit 2, naming the file and the missing part, rendering nothing", () => {
    const run = reRendering(withoutClaimReconciliations(saved()));

    expectRefused(run, message(AppError.NotASavedReconciliation, { subject: theFile, path: run.path, fault: `${CLAIM_RECONCILIATIONS_SECTION} is missing` }));
  });

  it("runBalance refuses a saved file the renderer cannot read BELOW ITS TOP at exit 2, naming the file and the renderer's reason, rendering nothing", () => {
    const broken = withClaimReconciliations(saved(), [{}]);
    let reason = "";
    try {
      reRender(broken, false);
    } catch (e) {
      reason = (e as Error).message;
    }
    expect(reason).not.toBe("");
    const run = reRendering(broken);

    expectRefused(run, message(AppError.NotRenderableAsSaved, { subject: theFile, path: run.path, reason }));
  });
});

describe("[SCN-MSG-010] an error shows its reader the error code of what went wrong — an input it cannot read", () => {
  const BALANCE_INPUTS = ["--features", "tests/fixtures/evidence-observation/features", "--vitest", "tests/fixtures/evidence-observation/vitest.json"];
  const NOT_GHERKIN = "not gherkin at all {{{\n";

  function regularFile(): string {
    const file = join(temporaryDirectory("coded-input-refusal-"), "a-file");
    writeFileSync(file, "a regular file\n");
    return file;
  }

  function stderrOfRefused(run: () => unknown): string {
    const written: string[] = [];
    const spy = vi.spyOn(process.stderr, "write").mockImplementation((chunk: string | Uint8Array) => {
      written.push(String(chunk));
      return true;
    });
    try {
      expect(usageStatusOf(run)).toBe(2);
    } finally {
      spy.mockRestore();
    }
    return written.join("");
  }

  function workflowsNotYaml(): ReturnType<typeof readWorkflows> {
    const { ci } = targetOnDisk();
    writeFileSync(join(ci, "ci.yml"), "jobs:\n  ci: [\n");
    return readWorkflows(ci);
  }

  function corpusOfTwoNotGherkin(): { features: string; ci: string } {
    const target = targetOnDisk();
    writeFileSync(join(target.features, "a.feature"), NOT_GHERKIN);
    writeFileSync(join(target.features, "b.feature"), NOT_GHERKIN);
    return target;
  }

  const printed = (command: string, shown: unknown): string => errorText(shown as RefusalLines, command).trimEnd();

  const ROWS: readonly (readonly [string, string, string, () => unknown])[] = [
    ["balance's unreadable corpus", "could-not-be-read", "balance", () => corpusDirRefusal({ path: "features", reason: "EACCES: permission denied, scandir 'features'" })],
    ["allocate's unreadable repository", "could-not-be-read", "allocate", () => refusalLine(new UnreadableInput(Unreadable.Repository, "/repo/.git", "EACCES: permission denied"))],
    ["allocate's vanished working directory", "working-directory-unreadable", "allocate", () => refusalLine(new UnreadableInput(Unreadable.WorkingDirectory, "", "ENOENT: no such file or directory, uv_cwd"))],
    ["a --vitest path that does not exist", "input-path-missing", "balance", () => checkInputsExist({ vitest: "reports/vitest.json" }, () => false)],
    ["a --vitest report that is not JSON", "not-valid-json", "balance", () => checkInputShapes(readReports(jsonInputsOf({ vitest: "v.json" }, nothingByDefault), reading("{{{")))],
    ["a --jest report that is not JSON", "not-valid-json-in-shape", "balance", () => checkInputShapes(readReports(jsonInputsOf({ jest: "j.json" }, nothingByDefault), reading("{{{")))],
    ["a --pytest report that is not XML", "not-valid-xml", "balance", () => checkInputShapes(readReports(jsonInputsOf({ pytest: "p.xml" }, nothingByDefault), reading("not xml")))],
    ["a --vitest report not in the reporter's shape", "not-in-shape", "balance", () => checkInputShapes(readReports(jsonInputsOf({ vitest: "v.json" }, nothingByDefault), reading('{"testResults":"x"}')))],
    ["a saved file with no ledger", "not-a-saved-reconciliation", "balance", () => checkSavedReconciliation("saved.json", withoutClaimReconciliations(saved()))],
    ["a saved file the renderer cannot read", "not-renderable-as-saved", "balance", () => reRenderOrRefusal("saved.json", withClaimReconciliations(saved(), [null]), false)],
    ["allocate's feature file the parser rejects", "corpus-file-unparseable", "allocate", () => refusalLine(new UnparseableFeatureFiles([{ file: "features/a.feature", message: "(1:1): expected: #Feature" }]))],
    ["a --ci workflow that is not YAML", "workflow-not-yaml", "balance", () => checkWorkflowsParse({ ci: "ci" }, workflowsNotYaml())],
    ["a --format file that cannot be written", "report-not-written", "balance", () => runBalanceCaptured([...BALANCE_INPUTS, "--format", `json:${join(regularFile(), "report.json")}`]).stderr],
    ["a stored run's directory that cannot be created", "stored-run-directory-not-created", "balance", () => stderrOfRefused(() => executeKeptRun({ storeRoot: join(regularFile(), "store"), target: "t", runId: "r1" }, { sourceSha: "unknown", toolSha: "unknown", toolVersion: "0.0.0", mode: "balance", date: "2026-11-03T00:00:00.000Z" }, () => true))],
  ];

  it.each(ROWS)("refuses %s with [%s] once, after %s's usage-error prefix", (_input, code, command, shown) => {
    const text = printed(command, shown());

    expect(text.split("\n")[0]?.slice(0, `spec-controller ${command}: usage error [${code}] — `.length)).toBe(`spec-controller ${command}: usage error [${code}] — `);
    expect(text.split(`[${code}]`)).toHaveLength(2);
  });

  it.each([
    ["balance", () => runBalanceCaptured(["--features", corpusOfTwoNotGherkin().features, "--ci", targetOnDisk().ci]).stderr],
    ["allocate", () => refusalLine(new UnparseableFeatureFiles([{ file: "features/a.feature", message: "(1:1): expected: #Feature" }, { file: "features/b.feature", message: "(1:1): expected: #Feature" }]))],
  ] as const)("refuses %s's two feature files the parser rejects with one coded line each, and no code on the parser's words beneath", (command, shown) => {
    const lines = printed(command, shown()).split("\n");
    const opening = `spec-controller ${command}: usage error [corpus-file-unparseable] — `;

    expect(lines.filter((line) => line.startsWith(opening)).map((line) => /[ab]\.feature$/.exec(line)?.[0])).toEqual(["a.feature", "b.feature"]);
    expect(lines.filter((line) => line.includes("[corpus-file-unparseable]"))).toHaveLength(2);
  });
});
