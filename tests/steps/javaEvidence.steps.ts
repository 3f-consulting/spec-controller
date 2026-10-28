import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";
import { temporaryDirectory } from "./support/temporaryDirectory.js";

const SINGLE_REPORT_TARGET = {
  features: "tests/fixtures/surefire-single-report/features",
  packageJson: "tests/fixtures/surefire-single-report/package.json",
  ci: "tests/fixtures/surefire-single-report",
  report: "tests/fixtures/surefire-single-report/report.xml",
};

const SINGLE_REPORT_CITED = "SCN-AAA-001";
const SINGLE_REPORT_CITING_CLASS = "[SCN-AAA-010] a class that cites";
const SINGLE_REPORT_CITING_TEST = `[${SINGLE_REPORT_CITED}] passes`;

const JAVA_TARGET = {
  features: "tests/fixtures/java/features",
  packageJson: "tests/fixtures/java/package.json",
  ci: "tests/fixtures/java",
  reports: "tests/fixtures/java/surefire-reports",
};

interface ReportedRun {
  readonly features: string;
  readonly packageJson: string;
  readonly ci: string;
  readonly reports: string;
  readonly cited: string;
  readonly citingClass: string;
  readonly citingTest: string;
}

const JAVA_RUN: ReportedRun = {
  ...JAVA_TARGET,
  cited: "SCN-JVF-001",
  citingClass: "example.CitedTest",
  citingTest: "[SCN-JVF-001] a passing test cites its scenario",
};

const KOTLIN_RUN: ReportedRun = {
  features: "tests/fixtures/kotlin/features",
  packageJson: "tests/fixtures/kotlin/package.json",
  ci: "tests/fixtures/kotlin",
  reports: "tests/fixtures/kotlin/test-results",
  cited: "SCN-KOF-001",
  citingClass: "example.CitedTest",
  citingTest: "[SCN-KOF-001] a passing test cites its scenario",
};

let reportedRun: ReportedRun = JAVA_RUN;

let cited = "";
let citingLocator = "";
let targetArgs: string[] = [];
let reportArgs: string[] = [];
let result: SpawnSyncReturns<string>;
let notAReport = "";

interface ScenarioRow {
  readonly scnId: string;
  readonly qualityCheckReconciliations: ReadonlyArray<{
    readonly qualityCheck: string;
    readonly outcome: string;
    readonly evidenceObservation?: { readonly locator?: string };
  }>;
}

const escaped = (text: string): string => text.replace(/[[\]]/g, "\\$&");

Given("a target whose unit tests are a Java suite and whose scenario raises a unit evidence obligation", function () {
  const feature = readFileSync(`${SINGLE_REPORT_TARGET.features}/target.feature`, "utf8");
  assert.match(feature, new RegExp(`@unit @${SINGLE_REPORT_CITED}\\b`), `fixture invariant: ${SINGLE_REPORT_CITED} raises a unit obligation`);
  cited = SINGLE_REPORT_CITED;
  targetArgs = [
    "--features", SINGLE_REPORT_TARGET.features,
    "--package-json", SINGLE_REPORT_TARGET.packageJson,
    "--ci", SINGLE_REPORT_TARGET.ci,
  ];
});

function aTargetWhoseRunWroteAReportDirectory(run: ReportedRun, writer: string): void {
  assert.ok(existsSync(run.reports), `missing the real ${writer} report directory: ${run.reports}`);
  const reportFiles = readdirSync(run.reports).filter((name) => /^TEST-.*\.xml$/.test(name));
  assert.ok(reportFiles.length > 1, `fixture invariant: ${writer} wrote one report file per test class; got ${reportFiles.join(", ")}`);
  reportedRun = run;
  targetArgs = ["--features", run.features, "--package-json", run.packageJson, "--ci", run.ci];
  reportArgs = ["--junit", run.reports];
}

Given(
  "a target whose unit tests are a Java suite that Maven Surefire has run, writing its reports into a directory",
  function () {
    aTargetWhoseRunWroteAReportDirectory(JAVA_RUN, "Surefire");
  },
);

Given(
  "a target whose unit tests are a Kotlin suite that Gradle has run, writing its reports into a directory",
  function () {
    aTargetWhoseRunWroteAReportDirectory(KOTLIN_RUN, "Gradle");
  },
);

Given("in that run a passing test cites one of the target's unit scenarios in its display name", function () {
  const run = reportedRun;
  const feature = readFileSync(`${run.features}/target.feature`, "utf8");
  assert.match(feature, new RegExp(`@unit @${run.cited}\\b`), `fixture invariant: ${run.cited} raises a unit obligation`);
  const passingTestcase = new RegExp(
    `<testcase name="${escaped(run.citingTest)}" classname="${escaped(run.citingClass)}" time="[^"]*"/>`,
  );
  const citingFiles = readdirSync(run.reports)
    .filter((name) => name.endsWith(".xml"))
    .filter((name) => passingTestcase.test(readFileSync(`${run.reports}/${name}`, "utf8")));
  assert.equal(citingFiles.length, 1, `fixture invariant: one report file holds the passing test citing ${run.cited}`);
  cited = run.cited;
  citingLocator = `${run.citingClass}::${run.citingTest}`;
});

Given(
  "a single Surefire report file, whose root is one test suite, in which a passing test cites that scenario in its display name",
  function () {
    assert.ok(existsSync(SINGLE_REPORT_TARGET.report), `missing the real Surefire report: ${SINGLE_REPORT_TARGET.report}`);
    const report = readFileSync(SINGLE_REPORT_TARGET.report, "utf8");
    assert.match(report, /^<\?xml[^>]*>\s*<testsuite\s/, "fixture invariant: the report's root is one test suite");
    assert.doesNotMatch(report, /<testsuites[\s>]/, "fixture invariant: the report holds no testsuites element");
    const passingTestcase = new RegExp(
      `<testcase name="${escaped(SINGLE_REPORT_CITING_TEST)}" classname="${escaped(SINGLE_REPORT_CITING_CLASS)}" time="[^"]*"/>`,
    );
    assert.match(report, passingTestcase, `fixture invariant: the test citing ${SINGLE_REPORT_CITED} passed`);
    citingLocator = `${SINGLE_REPORT_CITING_CLASS}::${SINGLE_REPORT_CITING_TEST}`;
    reportArgs = ["--junit", SINGLE_REPORT_TARGET.report];
  },
);

const NOT_A_JUNIT_XML_REPORT: Record<string, string> = {
  "not XML at all": "Tests run: 1, Failures: 0, Errors: 0, Skipped: 0\n",
  "XML that holds no test suites": "<html><body/></html>",
};

Given("beside the reports Surefire wrote, that directory holds a report file that is {}", function (defect: string) {
  const content = NOT_A_JUNIT_XML_REPORT[defect];
  assert.ok(content !== undefined, `no report file that is "${defect}"`);
  const reports = temporaryDirectory("surefire-reports-");
  cpSync(JAVA_TARGET.reports, reports, { recursive: true });
  notAReport = join(reports, "TEST-example.NotAReport.xml");
  writeFileSync(notAReport, content);
  reportArgs = ["--junit", reports];
});

function reconcileWithTheReports(): void {
  result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, "balance", ...targetArgs, ...reportArgs, "--format", "json"], {
    encoding: "utf8",
  });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
}

When("balance is asked to reconcile that target with that Surefire report file", reconcileWithTheReports);

When("balance is asked to reconcile that target with that directory of Surefire reports", reconcileWithTheReports);

When("balance is asked to reconcile that target with that directory of Gradle reports", reconcileWithTheReports);

Then("the scenario that JUnit 5 test cites reconciles satisfied, by that test", function () {
  let rows: ScenarioRow[];
  try {
    rows = (JSON.parse(result.stdout) as { ledger: { claimReconciliations: ScenarioRow[] } }).ledger.claimReconciliations;
  } catch {
    assert.fail(`expected the reconciliation as JSON; got exit ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }
  const unit = rows.find((row) => row.scnId === cited)?.qualityCheckReconciliations.find((q) => q.qualityCheck === "unit");
  assert.equal(unit?.outcome, "satisfied", `expected ${cited}'s unit obligation satisfied; got ${JSON.stringify(unit)}`);
  assert.equal(
    unit?.evidenceObservation?.locator,
    citingLocator,
    `expected the satisfying observation to be the JUnit 5 test "${citingLocator}"; got ${JSON.stringify(unit)}`,
  );
});

Then("the reports are refused as input the tool cannot read, never read as a verdict", function () {
  assert.equal(result.status, 2, `expected the usage exit; got ${result.status}\n${result.stderr}${result.stdout}`);
  assert.equal(result.stdout, "", "a refused input must not reach a report");
  assert.doesNotMatch(result.stderr, /^\s+at .*:\d+:\d+\)?$/m, `a refusal is typed, never a stack trace:\n${result.stderr}`);
});

Then("the refusal names that report file and the shape a JUnit XML report takes", function () {
  assert.ok(result.stderr.includes(notAReport), `expected stderr to name ${notAReport}; got:\n${result.stderr}`);
  assert.ok(result.stderr.includes("--junit"), `expected stderr to name --junit; got:\n${result.stderr}`);
  assert.ok(
    result.stderr.includes("in the shape of a JUnit XML report"),
    `expected stderr to name the shape a JUnit XML report takes; got:\n${result.stderr}`,
  );
});
