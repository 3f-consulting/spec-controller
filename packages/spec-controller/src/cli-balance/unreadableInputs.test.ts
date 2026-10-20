import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "yaml";
import {
  checkInputPaths,
  checkInputShapes,
  checkSavedReconciliation,
  checkWorkflowsParse,
  jsonInputsOf,
  reRenderOrRefusal,
} from "./unreadableInputs.js";
import { ciSourcePathsOf } from "../ingest/ciSourcePaths.js";
import { DEFAULT_CI_PATH, readCorpus } from "../ingest/ingestQualityChecks.js";
import { reRender } from "./reRender.js";
import { APP_MESSAGES, AppMessage } from "../messages.js";
import { runBalanceCaptured } from "../../test-support/runBalance.js";

const nothingByDefault = (): boolean => false;
const reading = (content: string) => (): string => content;

describe("[SCN-CLI-076] checkInputShapes refuses a Vitest report not in the reporter's shape", () => {
  it("names the flag, the file and where the shape is wrong", () => {
    const inputs = jsonInputsOf({ vitest: "reports/vitest.json" }, nothingByDefault);
    const error = checkInputShapes(inputs, reading('{"testResults":"x"}'));

    expect(error).toContain("--vitest");
    expect(error).toContain("reports/vitest.json");
    expect(error).toContain("testResults is a string, not a list");
  });

  it("passes a report in the reporter's shape, so the run goes on to reconcile", () => {
    const report = JSON.stringify({ testResults: [{ name: "a.test.ts", status: "passed", assertionResults: [] }] });
    expect(checkInputShapes(jsonInputsOf({ vitest: "v.json" }, nothingByDefault), reading(report))).toBeNull();
  });

  function reportsOnDisk(files: Record<string, string>): string {
    const dir = mkdtempSync(join(tmpdir(), "misshapen-vitest-"));
    made.push(dir);
    for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
    return dir;
  }

  const misshapenAt = (path: string): string =>
    APP_MESSAGES[AppMessage.NotInShape](
      APP_MESSAGES[AppMessage.FlaggedReport]("--vitest"),
      APP_MESSAGES[AppMessage.VitestReportShape](),
      path,
      "testResults is a string, not a list",
    );

  it("runBalance refuses a misshapen --vitest report at exit 2, naming the file and where its shape is wrong, reconciling nothing", () => {
    const { features, ci } = targetOnDisk();
    const vitest = join(reportsOnDisk({ "vitest.json": '{"testResults":"x"}' }), "vitest.json");
    const { stdout, stderr, exitCode } = runBalanceCaptured(["--features", features, "--ci", ci, "--vitest", vitest]);

    expect({ report: stdout, stderr, exitCode }).toEqual({
      report: "",
      stderr: misshapenAt(vitest) + "\n",
      exitCode: 2,
    });
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
    expect(checkInputShapes(manifestFirst, (path) => readFileSync(path, "utf8"))).toBe(misshapenAt(join(dir, "vitest.json")));
  });
});

describe("[SCN-CLI-077] checkInputShapes refuses a Cucumber report not in the formatter's shape", () => {
  it("names the flag, the file and where the shape is wrong", () => {
    const error = checkInputShapes(jsonInputsOf({ cucumber: "reports/cucumber.json" }, nothingByDefault), reading("{}"));

    expect(error).toContain("--cucumber");
    expect(error).toContain("reports/cucumber.json");
    expect(error).toContain("the top level is an object, not a list");
  });
});

describe("[SCN-PYT-009] checkInputShapes refuses a --pytest file that is not the JUnit XML report pytest writes", () => {
  const PYTEST_SHAPE = "the JUnit XML report pytest --junitxml writes";
  const refusalOf = (content: string): string | null =>
    checkInputShapes(jsonInputsOf({ pytest: "reports/report.xml" }, nothingByDefault), reading(content));

  it.each([
    ["text that is not XML", "collected 3 items\n3 passed\n", "is not valid XML"],
    ["a JSON report", '{"testResults":[]}', "is not valid XML"],
    ["XML that holds no test suites", "<html><body/></html>", "testsuites is missing"],
    ["test suites that are not a list of elements", '<testsuites name="t">x<testsuite>y</testsuite></testsuites>', "testsuites.testsuite[0] is a string, not an object"],
  ])("refuses %s, naming the flag, the file, the shape pytest writes and what is wrong", (_, content, fault) => {
    const error = refusalOf(content) ?? "";

    expect(error).toContain("--pytest");
    expect(error).toContain("reports/report.xml");
    expect(error).toContain(PYTEST_SHAPE);
    expect(error).toContain(fault);
  });

  it("passes the report a real pytest run wrote, so the run goes on to reconcile", () => {
    const real = readFileSync("tests/fixtures/pytest/report.xml", "utf8");
    expect(checkInputShapes(jsonInputsOf({ pytest: "report.xml" }, nothingByDefault), reading(real))).toBeNull();
  });

  it("runBalance refuses a --pytest file that is not XML at exit 2, naming the file and the shape, reconciling nothing", () => {
    const { features, ci } = targetOnDisk();
    const report = join(features, "..", "report.xml");
    writeFileSync(report, "not xml\n");
    const { stdout, stderr, exitCode } = runBalanceCaptured(["--features", features, "--ci", ci, "--pytest", report]);

    expect({ report: stdout, exitCode }).toEqual({ report: "", exitCode: 2 });
    expect(stderr).toContain(report);
    expect(stderr).toContain(PYTEST_SHAPE);
  });
});

describe("[SCN-JST-008] checkInputShapes refuses a --jest file that is not the JSON report Jest writes", () => {
  const JEST_SHAPE = "the JSON report jest --json writes";
  const refusalOf = (content: string): string | null =>
    checkInputShapes(jsonInputsOf({ jest: "reports/jest.json" }, nothingByDefault), reading(content));

  it.each([
    ["text that is not JSON", "PASS src/a.test.ts\nTests: 3 passed, 3 total\n", "is not valid JSON"],
    ["a JUnit XML report", '<?xml version="1.0" encoding="UTF-8"?><testsuites name="jest tests"></testsuites>', "is not valid JSON"],
    ["JSON that holds no test results", '{"numTotalTests":0}', "testResults is missing"],
  ])("refuses %s, naming the flag, the file, the shape Jest writes and what is wrong", (_, content, fault) => {
    const error = refusalOf(content) ?? "";

    expect(error).toContain("--jest");
    expect(error).toContain("reports/jest.json");
    expect(error).toContain(JEST_SHAPE);
    expect(error).toContain(fault);
  });

  it("passes the report a real Jest run wrote, so the run goes on to reconcile", () => {
    const real = readFileSync("tests/fixtures/jest/report.json", "utf8");
    expect(checkInputShapes(jsonInputsOf({ jest: "report.json" }, nothingByDefault), reading(real))).toBeNull();
  });

  it("runBalance refuses a --jest file that is not JSON at exit 2, naming the file and the shape, reconciling nothing", () => {
    const { features, ci } = targetOnDisk();
    const report = join(features, "..", "jest.json");
    writeFileSync(report, "not json\n");
    const { stdout, stderr, exitCode } = runBalanceCaptured(["--features", features, "--ci", ci, "--jest", report]);

    expect({ report: stdout, exitCode }).toEqual({ report: "", exitCode: 2 });
    expect(stderr).toContain(report);
    expect(stderr).toContain(JEST_SHAPE);
  });
});

describe("[SCN-RSP-009] checkInputShapes refuses an --rspec file that is not the JSON report RSpec writes", () => {
  const RSPEC_SHAPE = "the JSON report rspec --format json writes";
  const refusalOf = (content: string): string | null =>
    checkInputShapes(jsonInputsOf({ rspec: "reports/rspec.json" }, nothingByDefault), reading(content));

  it.each([
    ["text that is not JSON", "Finished in 0.01 seconds\n3 examples, 0 failures\n", "is not valid JSON"],
    [
      "a JUnit XML report",
      '<?xml version="1.0" encoding="UTF-8"?><testsuite name="rspec" tests="0"></testsuite>',
      "is not valid JSON",
    ],
    ["JSON that holds no examples, as a Jest report", '{"numTotalTests":0,"testResults":[]}', "examples is missing"],
    ["examples with no summary", '{"examples":[]}', "summary is missing"],
    ["examples that are not a list", '{"examples":{},"summary":{}}', "examples is an object, not a list"],
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
    expect(error).toContain(RSPEC_SHAPE);
    expect(error).toContain(fault);
  });

  it("passes the report a real RSpec run wrote, so the run goes on to reconcile", () => {
    const real = readFileSync("tests/fixtures/rspec/report.json", "utf8");
    expect(checkInputShapes(jsonInputsOf({ rspec: "report.json" }, nothingByDefault), reading(real))).toBeNull();
  });

  it("runBalance refuses an --rspec file that is not JSON at exit 2, naming the file and the shape, reconciling nothing", () => {
    const { features, ci } = targetOnDisk();
    const report = join(features, "..", "rspec.json");
    writeFileSync(report, "not json\n");
    const { stdout, stderr, exitCode } = runBalanceCaptured(["--features", features, "--ci", ci, "--rspec", report]);

    expect({ report: stdout, exitCode }).toEqual({ report: "", exitCode: 2 });
    expect(stderr).toContain(report);
    expect(stderr).toContain(RSPEC_SHAPE);
  });
});

describe("[SCN-GOT-009] checkInputShapes refuses a --junit file that is not a JUnit XML report", () => {
  const JUNIT_SHAPE = "in the shape of a JUnit XML report";
  const refusalOf = (content: string): string | null =>
    checkInputShapes(jsonInputsOf({ junit: "reports/report.xml" }, nothingByDefault), reading(content));

  it.each([
    ["text that is not XML", "=== RUN   TestCited\n--- PASS: TestCited (0.00s)\nok\n", "is not valid XML"],
    ["a JSON report", '{"testResults":[]}', "is not valid XML"],
    ["XML that holds no test suites", "<html><body/></html>", "testsuites is missing"],
  ])("refuses %s, naming the flag, the file, the shape of a JUnit XML report and what is wrong, and no single runner", (_, content, fault) => {
    const error = refusalOf(content) ?? "";

    expect(error).toContain("--junit");
    expect(error).toContain("reports/report.xml");
    expect(error).toContain(JUNIT_SHAPE);
    expect(error).toContain(fault);
    expect(error).not.toContain("pytest");
  });

  it("passes the report a real gotestsum run wrote, so the run goes on to reconcile", () => {
    const real = readFileSync("tests/fixtures/go/report.xml", "utf8");
    expect(checkInputShapes(jsonInputsOf({ junit: "report.xml" }, nothingByDefault), reading(real))).toBeNull();
  });

  it("runBalance refuses a --junit file that is not XML at exit 2, naming the file and the shape, reconciling nothing", () => {
    const { features, ci } = targetOnDisk();
    const report = join(features, "..", "report.xml");
    writeFileSync(report, "not xml\n");
    const { stdout, stderr, exitCode } = runBalanceCaptured(["--features", features, "--ci", ci, "--junit", report]);

    expect({ report: stdout, exitCode }).toEqual({ report: "", exitCode: 2 });
    expect(stderr).toContain(report);
    expect(stderr).toContain(JUNIT_SHAPE);
  });
});

describe("[SCN-JAV-010] checkInputShapes passes a single Surefire report file whose root is one test suite under --junit", () => {
  const shapeFaultUnder = (flag: string): string | null =>
    checkInputShapes(
      jsonInputsOf({ [flag]: "TEST-measure.CitedTest.xml" }, nothingByDefault),
      reading(readFileSync("tests/fixtures/surefire-single-report/report.xml", "utf8")),
    );

  it("passes the report a real Surefire run wrote, so the run goes on to reconcile", () => {
    expect(shapeFaultUnder("junit")).toBeNull();
  });

  it("keeps refusing the same report under --pytest, whose reports hold their suites in testsuites", () => {
    expect(shapeFaultUnder("pytest")).toContain("testsuites is missing");
  });
});

describe("[SCN-JAV-001] checkInputShapes passes the directory of reports Maven Surefire wrote under --junit", () => {
  it("passes the directory, so the run goes on to read the reports in it", () => {
    const fault = checkInputShapes(
      jsonInputsOf({ junit: "tests/fixtures/java/surefire-reports" }, existsSync),
      (path) => readFileSync(path, "utf8"),
    );

    expect(fault).toBeNull();
  });
});

describe("[SCN-JAV-011] checkInputShapes refuses a report file in a --junit directory that is not a JUnit XML report, naming that file", () => {
  const JUNIT_SHAPE = "in the shape of a JUnit XML report";

  function surefireReportsBeside(name: string, content: string): { reports: string; notAReport: string } {
    const reports = mkdtempSync(join(tmpdir(), "surefire-reports-"));
    made.push(reports);
    cpSync("tests/fixtures/java/surefire-reports", reports, { recursive: true });
    const notAReport = join(reports, name);
    writeFileSync(notAReport, content);
    return { reports, notAReport };
  }

  it.each([
    ["text that is not XML", "Tests run: 1, Failures: 0, Errors: 0, Skipped: 0\n", "is not valid XML"],
    ["XML that holds no test suites", "<html><body/></html>", "testsuites is missing"],
  ])("refuses a report file holding %s, naming the flag, that file, the shape of a JUnit XML report and what is wrong", (_, content, fault) => {
    const { reports, notAReport } = surefireReportsBeside("TEST-example.NotAReport.xml", content);
    const error = checkInputShapes(jsonInputsOf({ junit: reports }, existsSync), (path) => readFileSync(path, "utf8")) ?? "";

    expect(error).toContain("--junit");
    expect(error).toContain(notAReport);
    expect(error).toContain(JUNIT_SHAPE);
    expect(error).toContain(fault);
  });

  it("leaves a file in the directory that is not named as a Surefire report unread", () => {
    const { reports } = surefireReportsBeside("example.NotAReport.txt", "Tests run: 1, Failures: 0, Errors: 0, Skipped: 0\n");

    expect(checkInputShapes(jsonInputsOf({ junit: reports }, existsSync), (path) => readFileSync(path, "utf8"))).toBeNull();
  });

  it("runBalance refuses the directory at exit 2, naming that file and the shape, reconciling nothing", () => {
    const { features, ci } = targetOnDisk();
    const { reports, notAReport } = surefireReportsBeside("TEST-example.NotAReport.xml", "not xml\n");
    const { stdout, stderr, exitCode } = runBalanceCaptured(["--features", features, "--ci", ci, "--junit", reports]);

    expect({ report: stdout, exitCode }).toEqual({ report: "", exitCode: 2 });
    expect(stderr).toContain(notAReport);
    expect(stderr).toContain(JUNIT_SHAPE);
  });
});

describe("[SCN-CLI-079] checkInputShapes refuses a package.json not in a manifest's shape, given or read by default", () => {

  it("refuses a default package.json that does not parse, rather than crashing on it", () => {
    const error = checkInputShapes(jsonInputsOf({}, (path) => path === "package.json"), reading("{not json"));
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
    expect(checkInputShapes(jsonInputsOf({ [flag]: "empty.json" }, nothingByDefault), reading(content))).toBeNull();
  });

  function directoryHoldingNoReport(): string {
    const reports = mkdtempSync(join(tmpdir(), "surefire-reports-"));
    made.push(reports);
    return reports;
  }

  it("passes a --junit directory holding no report, reading no file in it", () => {
    const reports = directoryHoldingNoReport();
    const inputs = jsonInputsOf({ junit: reports }, nothingByDefault);

    expect(inputs).toEqual([]);
    expect(checkInputShapes(inputs, (path) => readFileSync(path, "utf8"))).toBeNull();
  });

  it("runBalance reads a --junit directory holding no report as an empty report, reaching the verdict of the same run given no report", () => {
    const { features, ci } = targetOnDisk();
    const reports = directoryHoldingNoReport();
    const withEmptyDirectory = runBalanceCaptured(["--features", features, "--ci", ci, "--junit", reports, "--format", "json"]);
    const withNoReport = runBalanceCaptured(["--features", features, "--ci", ci, "--format", "json"]);

    expect(withEmptyDirectory.stderr).toBe("");
    expect(withEmptyDirectory.exitCode).toBe(withNoReport.exitCode);
    expect(JSON.parse(withEmptyDirectory.stdout).ledger).toEqual(JSON.parse(withNoReport.stdout).ledger);
  });
});

const made: string[] = [];

afterAll(() => {
  for (const dir of made.splice(0)) {
    for (const entry of ["features", "workflows"]) {
      const path = join(dir, entry);
      if (existsSync(path)) chmodSync(path, 0o755);
    }
    for (const entry of [join("features", "a.feature"), join("workflows", "ci.yml")]) {
      const path = join(dir, entry);
      if (existsSync(path)) chmodSync(path, 0o644);
    }
    rmSync(dir, { recursive: true, force: true });
  }
});

function targetOnDisk(): { features: string; ci: string } {
  const dir = mkdtempSync(join(tmpdir(), "input-paths-"));
  made.push(dir);
  const features = join(dir, "features");
  const ci = join(dir, "workflows");
  mkdirSync(features);
  mkdirSync(ci);
  writeFileSync(join(features, "a.feature"), "Feature: a\n");
  writeFileSync(join(ci, "ci.yml"), "jobs: {}\n");
  return { features, ci };
}

describe("[SCN-CLI-075] checkInputPaths refuses a path that is not the kind its flag reads", () => {
  it("refuses a regular file given as the feature corpus, naming the flag and the path", () => {
    const { features } = targetOnDisk();
    const file = join(features, "a.feature");
    const error = checkInputPaths({ features: file }, readCorpus(file));

    expect(error).toContain("--features");
    expect(error).toContain(file);
    expect(error).toContain("ENOTDIR");
  });

  it("names the entry when the corpus holds a directory named as a feature file", () => {
    const { features } = targetOnDisk();
    mkdirSync(join(features, "z.feature"));
    const error = checkInputPaths({ features }, readCorpus(features));

    expect(error).toContain("--features");
    expect(error).toContain(join(features, "z.feature"));
    expect(error).toContain("EISDIR");
  });

  it("names the entry when the CI workflows hold a directory named as a workflow file", () => {
    const { features, ci } = targetOnDisk();
    mkdirSync(join(ci, "x.yml"));
    const error = checkInputPaths({ features, ci }, readCorpus(features));

    expect(error).toContain("--ci");
    expect(error).toContain(join(ci, "x.yml"));
    expect(error).toContain("EISDIR");
  });

  it("names the entry when the directory given to --junit holds a directory named as a JUnit report, never passing it as holding no report", () => {
    const dir = mkdtempSync(join(tmpdir(), "junit-directory-named-as-report-"));
    made.push(dir);
    mkdirSync(join(dir, "TEST-example.NestedTest.xml"));
    const error = checkInputShapes(jsonInputsOf({ junit: dir }, nothingByDefault), (path) => readFileSync(path, "utf8"));

    expect(error).toContain("--junit");
    expect(error).toContain(join(dir, "TEST-example.NestedTest.xml"));
    expect(error).toContain("EISDIR");
  });

  it("runBalance refuses a --junit directory holding a directory named as a JUnit report at exit 2, naming the flag and the entry, reconciling nothing", () => {
    const dir = mkdtempSync(join(tmpdir(), "junit-directory-named-as-report-"));
    made.push(dir);
    mkdirSync(join(dir, "TEST-example.NestedTest.xml"));
    const { stdout, stderr, exitCode } = runBalanceCaptured(["--features", "tests/fixtures/evidence-observation/features", "--junit", dir]);

    expect(exitCode).toBe(2);
    expect(stdout).toBe("");
    expect(stderr).toContain("--junit");
    expect(stderr).toContain(join(dir, "TEST-example.NestedTest.xml"));
    expect(stderr).toContain("EISDIR");
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

  function balancing(argv: string[]): { report: string; stderr: string; exitCode: unknown } {
    const { stdout, stderr, exitCode } = runBalanceCaptured(argv);
    return { report: stdout, stderr, exitCode };
  }

  it("runBalance refuses a given --features corpus it may not read at exit 2, naming the flag, the path and the refusal to read it, reconciling nothing", ({ skip }) => {
    skip(runsAsRoot());
    const features = lock(targetOnDisk().features);
    const reason = osReasonFor(() => readdirSync(features));

    expect(balancing(["--features", features])).toEqual({
      report: "",
      stderr: APP_MESSAGES[AppMessage.CouldNotBeReadAt](APP_MESSAGES[AppMessage.FlaggedCorpus]("--features"), features, reason) + "\n",
      exitCode: 2,
    });
  });

  it("runBalance refuses a given --vitest report it may not read at exit 2, calling the file unreadable rather than misshapen, reconciling nothing", ({ skip }) => {
    skip(runsAsRoot());
    const dir = mkdtempSync(join(tmpdir(), "vitest-not-permitted-"));
    made.push(dir);
    const path = join(dir, "vitest.json");
    writeFileSync(path, '{"testResults":[]}');
    lock(path);
    const reason = osReasonFor(() => readFileSync(path, "utf8"));

    expect(balancing(["--features", "tests/fixtures/evidence-observation/features", "--vitest", path])).toEqual({
      report: "",
      stderr: APP_MESSAGES[AppMessage.CouldNotBeReadAt](APP_MESSAGES[AppMessage.FlaggedFile]("--vitest"), path, reason) + "\n",
      exitCode: 2,
    });
  });

  it("runBalance refuses a given --pytest report it may not read at exit 2, calling the report unreadable rather than misshapen, reconciling nothing", ({ skip }) => {
    skip(runsAsRoot());
    const dir = mkdtempSync(join(tmpdir(), "pytest-not-permitted-"));
    made.push(dir);
    const path = join(dir, "report.xml");
    writeFileSync(path, '<testsuites><testsuite name="pytest" tests="0" /></testsuites>');
    lock(path);
    const reason = osReasonFor(() => readFileSync(path, "utf8"));

    expect(balancing(["--features", "tests/fixtures/evidence-observation/features", "--pytest", path])).toEqual({
      report: "",
      stderr: APP_MESSAGES[AppMessage.CouldNotBeReadAt](APP_MESSAGES[AppMessage.FlaggedReport]("--pytest"), path, reason) + "\n",
      exitCode: 2,
    });
  });

  it("runBalance refuses a given --jest report it may not read at exit 2, calling the report unreadable rather than misshapen, reconciling nothing", ({ skip }) => {
    skip(runsAsRoot());
    const dir = mkdtempSync(join(tmpdir(), "jest-not-permitted-"));
    made.push(dir);
    const path = join(dir, "jest.json");
    writeFileSync(path, '{"numTotalTests":0,"success":true,"testResults":[]}');
    lock(path);
    const reason = osReasonFor(() => readFileSync(path, "utf8"));

    expect(balancing(["--features", "tests/fixtures/evidence-observation/features", "--jest", path])).toEqual({
      report: "",
      stderr: APP_MESSAGES[AppMessage.CouldNotBeReadAt](APP_MESSAGES[AppMessage.FlaggedReport]("--jest"), path, reason) + "\n",
      exitCode: 2,
    });
  });

  it("runBalance refuses a given --rspec report it may not read at exit 2, calling the report unreadable rather than misshapen, reconciling nothing", ({ skip }) => {
    skip(runsAsRoot());
    const dir = mkdtempSync(join(tmpdir(), "rspec-not-permitted-"));
    made.push(dir);
    const path = join(dir, "rspec.json");
    writeFileSync(path, '{"version":"3.13.6","messages":["No examples found."],"examples":[],"summary":{"example_count":0,"errors_outside_of_examples_count":0}}');
    lock(path);
    const reason = osReasonFor(() => readFileSync(path, "utf8"));

    expect(balancing(["--features", "tests/fixtures/evidence-observation/features", "--rspec", path])).toEqual({
      report: "",
      stderr: APP_MESSAGES[AppMessage.CouldNotBeReadAt](APP_MESSAGES[AppMessage.FlaggedReport]("--rspec"), path, reason) + "\n",
      exitCode: 2,
    });
  });

  it("runBalance refuses a given --junit report it may not read at exit 2, calling the report unreadable rather than misshapen, reconciling nothing", ({ skip }) => {
    skip(runsAsRoot());
    const dir = mkdtempSync(join(tmpdir(), "junit-not-permitted-"));
    made.push(dir);
    const path = join(dir, "report.xml");
    writeFileSync(path, '<testsuites tests="0"><testsuite name="example.com/empty" tests="0" /></testsuites>');
    lock(path);
    const reason = osReasonFor(() => readFileSync(path, "utf8"));

    expect(balancing(["--features", "tests/fixtures/evidence-observation/features", "--junit", path])).toEqual({
      report: "",
      stderr: APP_MESSAGES[AppMessage.CouldNotBeReadAt](APP_MESSAGES[AppMessage.FlaggedReport]("--junit"), path, reason) + "\n",
      exitCode: 2,
    });
  });

  it("runBalance refuses a given --junit directory it may not list at exit 2, naming the flag, the directory and the refusal to read it, reconciling nothing", ({ skip }) => {
    skip(runsAsRoot());
    const dir = mkdtempSync(join(tmpdir(), "junit-directory-not-permitted-"));
    made.push(dir);
    const reports = join(dir, "surefire-reports");
    mkdirSync(reports);
    writeFileSync(join(reports, "TEST-example.ExampleTest.xml"), '<testsuite name="example.ExampleTest" tests="0" />');
    lock(reports);
    const reason = osReasonFor(() => readFileSync(reports, "utf8"));

    expect(balancing(["--features", "tests/fixtures/evidence-observation/features", "--junit", reports])).toEqual({
      report: "",
      stderr: APP_MESSAGES[AppMessage.CouldNotBeReadAt](APP_MESSAGES[AppMessage.FlaggedReport]("--junit"), reports, reason) + "\n",
      exitCode: 2,
    });
  });

  it("checkInputShapes refuses a --junit directory it may not list, naming the directory, never passing it as holding no report", ({ skip }) => {
    skip(runsAsRoot());
    const dir = mkdtempSync(join(tmpdir(), "junit-directory-not-permitted-"));
    made.push(dir);
    const reports = lock(dir);
    const reason = osReasonFor(() => readFileSync(reports, "utf8"));

    expect(checkInputShapes(jsonInputsOf({ junit: reports }, () => false), (path) => readFileSync(path, "utf8"))).toBe(
      APP_MESSAGES[AppMessage.CouldNotBeReadAt](APP_MESSAGES[AppMessage.FlaggedReport]("--junit"), reports, reason),
    );
  });

  it("names the feature corpus read by default, and its path, when no --features is given and the working directory's corpus may not be read", ({ skip }) => {
    skip(runsAsRoot());
    const target = targetOnDisk();
    const features = lock(target.features);
    vi.spyOn(process, "cwd").mockReturnValue(join(features, ".."));
    const reason = osReasonFor(() => readdirSync(features));

    expect(checkInputPaths({ ci: target.ci }, readCorpus(features))).toBe(
      APP_MESSAGES[AppMessage.CouldNotBeReadAt](APP_MESSAGES[AppMessage.DefaultFeatureCorpus](), features, reason),
    );
  });

  it("refuses the package.json read by default when it cannot be read", () => {
    const read = (): string => {
      throw new Error("EACCES: permission denied, open 'package.json'");
    };
    expect(checkInputShapes(jsonInputsOf({}, () => true), read)).toContain("package.json read by default could not be read");
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

    expect({ report: stdout, stderr, exitCode }).toEqual({
      report: "",
      stderr: APP_MESSAGES[AppMessage.CouldNotBeReadAt](APP_MESSAGES[AppMessage.FlaggedCorpus]("--features"), subdirectory, reason) + "\n",
      exitCode: 2,
    });
  });

  it("checkInputPaths names the subdirectory, not the corpus, as the path it could not read", ({ skip }) => {
    skip(runsAsRoot());
    const { features, subdirectory, reason } = corpusWithLockedSubdirectory();

    expect(checkInputPaths({ features }, readCorpus(features))).toBe(
      APP_MESSAGES[AppMessage.CouldNotBeReadAt](APP_MESSAGES[AppMessage.FlaggedCorpus]("--features"), subdirectory, reason),
    );
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
    `${workflows} contain a workflow that is not valid YAML: ${file}\n${parseErrorOf(NOT_YAML)}`;

  it("refuses a --ci workflow file that does not parse, naming --ci, the file and the parser's error", () => {
    const { ci } = targetOnDisk();
    const file = join(ci, "ci.yml");
    writeFileSync(file, NOT_YAML);

    expect(checkWorkflowsParse({ ci: file }, readText)).toBe(refusal(APP_MESSAGES[AppMessage.FlaggedWorkflows]("--ci"), file));
  });

  it("refuses a workflow in the --ci folder that does not parse, naming that workflow", () => {
    const { ci } = targetOnDisk();
    const file = join(ci, "build.yml");
    writeFileSync(file, NOT_YAML);

    expect(checkWorkflowsParse({ ci }, readText)).toBe(refusal(APP_MESSAGES[AppMessage.FlaggedWorkflows]("--ci"), file));
  });

  it("refuses a workflow read by default that does not parse, naming the CI workflows read by default", () => {
    const [file] = ciSourcePathsOf(DEFAULT_CI_PATH);
    expect(file, "the repository's own workflows are read by default").toBeDefined();

    const error = checkWorkflowsParse({}, (path) => (path === file ? NOT_YAML : readText(path)));

    expect(error).toBe(refusal(APP_MESSAGES[AppMessage.DefaultCiWorkflows](), file!));
  });

  it("refuses nothing for a workflow that parses but declares no jobs", () => {
    const { ci } = targetOnDisk();
    writeFileSync(join(ci, "ci.yml"), "name: no jobs\n");

    expect(checkWorkflowsParse({ ci }, readText)).toBeNull();
  });
});

const SAVED = {"runProvenance":{"target":"unknown-target","sourceSha":null,"toolSha":null,"toolVersion":"0.1.0-alpha.5","runTimestamp":"2026-09-27T10:03:01Z","inputs":{"features":"feat"},"corpus":"feat","strict":false},"summary":{"claimReconciliations":{"total":1,"balanced":0,"outOfBalance":1,"phantomClaim":0,"unnamedClaim":0},"qualityCheckReconciliations":{"total":1,"byOutcome":{"satisfied":0,"missing":0,"failing":0,"watermelon":0,"cites-unknown-scenario":0,"cites-no-scenario":0,"no-scn-code":1,"duplicate-scn-code":0,"broken":0,"no-evidence-obligation":0,"both-missing":0},"outOfBalance":1,"missingByQualityCheck":[]},"pending":0,"testVolume":{"totalEvidenceObservations":0,"onScenario":0,"onPhantomClaim":0,"onUnnamedClaim":0},"rawByBehaviouralQualityCheck":{"unit":0,"integration":0,"e2e":0,"performance":0},"fitnessFunctions":{"runningFitnessFunctionCount":0,"uncitedFitnessFunctionCount":0},"fitness":{"satisfied":0,"total":0}},"ledger":{"claimReconciliations":[{"scnId":"a.feature : one","kind":"scenario","verdict":"out-of-balance","evidenceObservations":[],"evidenceObligations":[],"qualityCheckReconciliations":[{"outcome":"no-scn-code","evidenceObligation":{}}],"reconcilingItems":[{"outcome":"no-scn-code","evidenceObligation":{}}],"pendingItems":[]}]},"scenarioCodeErrors":[],"scenarioCodePopulation":{"featureFiles":1,"featureCodes":0},"evidenceObligations":{"excludedOccurrences":0,"untaggedScenarios":[{"feature":"a.feature","scenario":"one"}],"proseOnlyCodes":[]}};
const SAVED_BEFORE_CLAIM_KEYS = {"runProvenance":{"target":"unknown-target","sourceSha":null,"toolSha":null,"toolVersion":"0.1.0-alpha.5","runTimestamp":"2026-09-27T10:03:01Z","inputs":{"features":"feat"},"corpus":"feat","strict":false},"summary":{"scenarioReconciliations":{"total":1,"balanced":0,"outOfBalance":1,"phantom":0,"suspense":0},"qualityCheckReconciliations":{"total":1,"byOutcome":{"satisfied":0,"missing":0,"failing":0,"watermelon":0,"cites-unknown-scenario":0,"cites-no-scenario":0,"no-scn-code":1,"duplicate-scn-code":0,"broken":0,"no-evidence-obligation":0,"both-missing":0},"outOfBalance":1,"missingByQualityCheck":[]},"pending":0,"testVolume":{"totalEvidenceObservations":0,"onScenario":0,"onPhantomScenario":0,"onSuspenseScenario":0},"rawByBehaviouralQualityCheck":{"unit":0,"integration":0,"e2e":0,"performance":0},"fitnessFunctions":{"runningFitnessFunctionCount":0,"uncitedFitnessFunctionCount":0},"fitness":{"satisfied":0,"total":0}},"ledger":{"scenarioReconciliations":[{"scnId":"a.feature : one","kind":"scenario","verdict":"out-of-balance","evidenceObservations":[],"evidenceObligations":[],"qualityCheckReconciliations":[{"outcome":"no-scn-code","evidenceObligation":{}}],"reconcilingItems":[{"outcome":"no-scn-code","evidenceObligation":{}}],"pendingItems":[]}]},"scenarioCodeErrors":[],"scenarioCodePopulation":{"featureFiles":1,"featureCodes":0},"evidenceObligations":{"excludedOccurrences":0,"untaggedScenarios":[{"feature":"a.feature","scenario":"one"}],"proseOnlyCodes":[]}};

describe("[SCN-CLI-074] a saved file that is not a saved reconciliation is refused, and nothing is rendered", () => {
  it.each([
    [[], "the top level is a list, not an object"],
    ["x", "the top level is a string, not an object"],
    [{ ...SAVED, runProvenance: undefined }, "runProvenance is missing"],
    [{ ...SAVED, summary: undefined }, "summary is missing"],
    [{ ...SAVED, ledger: undefined }, "ledger is missing"],
    [{ ...SAVED, ledger: {} }, "ledger.claimReconciliations is missing"],
    [SAVED_BEFORE_CLAIM_KEYS, "ledger.claimReconciliations is missing"],
    [{ ...SAVED, ledger: "x" }, "ledger is a string, not an object"],
    [{ ...SAVED, ledger: { claimReconciliations: {} } }, "ledger.claimReconciliations is an object, not a list"],
    [{ ...SAVED, runProvenance: null }, "runProvenance is null, not an object"],
    [{ ...SAVED, scenarioCodeErrors: "x" }, "scenarioCodeErrors is a string, not a list"],
    [{ ...SAVED, runProvenance: { ...SAVED.runProvenance, corpus: undefined } }, "runProvenance.corpus is missing"],
  ])("names where %j departs from a saved reconciliation", (document, fault) => {
    const error = checkSavedReconciliation("saved.json", JSON.stringify(document));

    expect(error).toContain("--render-from-json");
    expect(error).toContain("saved.json");
    expect(error).toContain(fault);
    expect(error).toContain("Run balance again to save one.");
  });

  it("passes a reconciliation this tool saved", () => {
    expect(checkSavedReconciliation("saved.json", JSON.stringify(SAVED))).toBeNull();
  });

  it("refuses, naming the file, a saved reconciliation the renderer cannot read below its top", () => {
    const broken = { ...SAVED, ledger: { claimReconciliations: [null] } };
    const rendered = reRenderOrRefusal("saved.json", JSON.stringify(broken), false);

    expect(typeof rendered).toBe("string");
    expect(rendered).toContain("--render-from-json");
    expect(rendered).toContain("saved.json");
  });

  it("renders a reconciliation this tool saved", () => {
    const rendered = reRenderOrRefusal("saved.json", JSON.stringify(SAVED), false);
    expect(typeof rendered).toBe("object");
  });

  function reRendering(document: unknown): { path: string; report: string; stderr: string; exitCode: unknown } {
    const dir = mkdtempSync(join(tmpdir(), "render-not-saved-"));
    made.push(dir);
    const path = join(dir, "spec-reconciliation.json");
    writeFileSync(path, JSON.stringify(document));
    const { stdout, stderr, exitCode } = runBalanceCaptured(["--render-from-json", path]);
    return { path, report: stdout, stderr, exitCode };
  }

  let theFile: string;

  beforeEach(() => {
    theFile = APP_MESSAGES[AppMessage.FlaggedFile]("--render-from-json");
  });

  it("runBalance refuses a saved file with NO LEDGER at exit 2, naming the file and the missing part, rendering nothing", () => {
    const run = reRendering({ ...SAVED, ledger: undefined });

    expect(run).toEqual({
      path: run.path,
      report: "",
      stderr: APP_MESSAGES[AppMessage.NotASavedReconciliation](theFile, run.path, "ledger is missing") + "\n",
      exitCode: 2,
    });
  });

  it("runBalance refuses a saved file the renderer cannot read BELOW ITS TOP at exit 2, naming the file and the renderer's reason, rendering nothing", () => {
    const broken = { ...SAVED, ledger: { claimReconciliations: [null] } };
    let reason = "";
    try {
      reRender(JSON.stringify(broken), false);
    } catch (e) {
      reason = (e as Error).message;
    }
    expect(reason).not.toBe("");
    const run = reRendering(broken);

    expect(run).toEqual({
      path: run.path,
      report: "",
      stderr: APP_MESSAGES[AppMessage.NotRenderableAsSaved](theFile, run.path, reason) + "\n",
      exitCode: 2,
    });
  });
});
