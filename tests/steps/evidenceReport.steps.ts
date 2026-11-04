import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BALANCED_INPUTS } from "./support/balanceTarget.js";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";
import { entryText, shownAmong, shownEntry, showsEntry } from "./support/catalogue.js";
import { showsHeading } from "./support/reportLines.js";
import {
  CLAIM_RECONCILIATIONS_SECTION,
  claimReconciliationsOf,
  claimReconciliationsSection,
  withClaimReconciliations,
  withoutClaimReconciliations,
} from "./support/reportClaimReconciliations.js";
import { RECONCILIATION_TOTALS_PATH, reconciliationTotalsSection, withReconciliationTotalsUnderEarlierKey } from "./support/reportReconciliationTotals.js";
import { temporaryDirectory } from "./support/temporaryDirectory.js";
import type { ArrangedTarget, ExpectedEntry, ReportedRun, SpecControllerWorld } from "./support/world.js";

Given(
  "a target, and the Vitest report option pointing at a report that exists but is not valid JSON",
  function (this: SpecControllerWorld) {
    const root = process.cwd();
    this.unparseableReport = join(temporaryDirectory(this, "scn-cli-014-"), "unparseable-report.json");
    writeFileSync(this.unparseableReport, "not valid json at all {{{");

    assert.ok(existsSync(this.unparseableReport), "the fixture report must EXIST — this is not the missing-path case");
    this.invocationArgs = [
      "--features",
      join(root, BALANCED_INPUTS.features),
      "--vitest",
      this.unparseableReport,
    ];
  },
);

Then("the refusal names the unparseable report and the parse failure", function (this: SpecControllerWorld) {
  const subject = entryText("flagged-report", { flag: "--vitest" });
  assert.ok(
    shownAmong(this.balanceResult.stderr, ["not-valid-json", "not-valid-json-in-shape"], { subject, path: this.unparseableReport }) !== undefined,
    `expected stderr to name the unparseable report ${this.unparseableReport} and the PARSE failure; got:\n${this.balanceResult.stderr}`,
  );
  assert.doesNotMatch(
    this.balanceResult.stderr,
    /^\s+at .*:\d+:\d+\)?$/m,
    `expected a TYPED usage error, but the process crashed with a stack trace:\n${this.balanceResult.stderr}`,
  );
});

const GO_TARGET = {
  features: "tests/fixtures/go/features",
  packageJson: "tests/fixtures/go/package.json",
  ci: "tests/fixtures/go",
  report: "tests/fixtures/go/report.xml",
};

const GO_CITED = "SCN-GOF-001";

const CITING_SUBTEST = `example.com/gofixture/cited::TestCited/[${GO_CITED}]_a_passing_subtest_cites_its_scenario`;

interface ScenarioRow {
  readonly claim: string;
  readonly qualityCheckReconciliations: ReadonlyArray<{
    readonly qualityCheckKind: string;
    readonly outcome?: string;
    readonly evidenceObservations?: ReadonlyArray<{ readonly outcome: string; readonly locator?: string; readonly testName?: string }>;
  }>;
}

function reconcileWithTheReports(this: SpecControllerWorld): void {
  this.balanceResult = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, "balance", ...this.targetArgs, ...this.reportArgs, "--format", "json"], {
    encoding: "utf8",
  });
  assert.equal(this.balanceResult.error, undefined, `CLI failed to spawn: ${this.balanceResult.error?.message}`);
}

function satisfiedUnitReconciliationOf(world: SpecControllerWorld, claim: string): ScenarioRow["qualityCheckReconciliations"][number] | undefined {
  let rows: ScenarioRow[];
  try {
    rows = claimReconciliationsOf<ScenarioRow>(JSON.parse(world.balanceResult.stdout));
  } catch {
    assert.fail(`expected the reconciliation as JSON; got exit ${world.balanceResult.status}\nstdout:\n${world.balanceResult.stdout}\nstderr:\n${world.balanceResult.stderr}`);
  }
  const unit = rows.find((row) => row.claim === claim)?.qualityCheckReconciliations.find((q) => q.qualityCheckKind === "unit");
  assert.deepEqual(unit?.evidenceObservations?.map((o) => o.outcome), ["satisfied"], `expected ${claim}'s unit obligation satisfied; got ${JSON.stringify(unit)}`);
  return unit;
}

Given("a target whose unit tests are a Go suite and whose scenario raises a unit evidence obligation", function (this: SpecControllerWorld) {
  const feature = readFileSync(`${GO_TARGET.features}/target.feature`, "utf8");
  assert.match(feature, new RegExp(`@unit @${GO_CITED}\\b`), `fixture invariant: ${GO_CITED} raises a unit obligation`);
  this.targetArgs = ["--features", GO_TARGET.features, "--package-json", GO_TARGET.packageJson, "--ci", GO_TARGET.ci];
});

Given("a gotestsum report in which a passing subtest cites that scenario in its name", function (this: SpecControllerWorld) {
  assert.ok(existsSync(GO_TARGET.report), `missing the real gotestsum report: ${GO_TARGET.report}`);
  const [classname, name] = CITING_SUBTEST.split("::");
  const passingTestcase = new RegExp(
    `<testcase classname="${classname}" name="${name!.replace(/[[\]]/g, "\\$&")}" time="[^"]*"></testcase>`,
  );
  assert.match(readFileSync(GO_TARGET.report, "utf8"), passingTestcase, `fixture invariant: the subtest citing ${GO_CITED} passed`);
  this.reportArgs = ["--junit", GO_TARGET.report];
});

When("balance is asked to reconcile that target with the gotestsum report", reconcileWithTheReports);

Then("the scenario that Go subtest cites reconciles satisfied, by that subtest", function (this: SpecControllerWorld) {
  const unit = satisfiedUnitReconciliationOf(this, GO_CITED);
  assert.equal(
    unit?.evidenceObservations?.[0]?.locator,
    CITING_SUBTEST,
    `expected the satisfying observation to be the Go subtest "${CITING_SUBTEST}"; got ${JSON.stringify(unit)}`,
  );
});

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

const escaped = (text: string): string => text.replace(/[[\]]/g, "\\$&");

Given("a target whose unit tests are a Java suite and whose scenario raises a unit evidence obligation", function (this: SpecControllerWorld) {
  const feature = readFileSync(`${SINGLE_REPORT_TARGET.features}/target.feature`, "utf8");
  assert.match(feature, new RegExp(`@unit @${SINGLE_REPORT_CITED}\\b`), `fixture invariant: ${SINGLE_REPORT_CITED} raises a unit obligation`);
  this.citedScenario = SINGLE_REPORT_CITED;
  this.targetArgs = [
    "--features", SINGLE_REPORT_TARGET.features,
    "--package-json", SINGLE_REPORT_TARGET.packageJson,
    "--ci", SINGLE_REPORT_TARGET.ci,
  ];
});

function aTargetWhoseRunWroteAReportDirectory(world: SpecControllerWorld, run: ReportedRun, writer: string): void {
  assert.ok(existsSync(run.reports), `missing the real ${writer} report directory: ${run.reports}`);
  const reportFiles = readdirSync(run.reports).filter((name) => /^TEST-.*\.xml$/.test(name));
  assert.ok(reportFiles.length > 1, `fixture invariant: ${writer} wrote one report file per test class; got ${reportFiles.join(", ")}`);
  world.reportedRun = run;
  world.targetArgs = ["--features", run.features, "--package-json", run.packageJson, "--ci", run.ci];
  world.reportArgs = ["--junit", run.reports];
}

Given(
  "a target whose unit tests are a Java suite that Maven Surefire has run, writing its reports into a directory",
  function (this: SpecControllerWorld) {
    aTargetWhoseRunWroteAReportDirectory(this, JAVA_RUN, "Surefire");
  },
);

Given(
  "a target whose unit tests are a Kotlin suite that Gradle has run, writing its reports into a directory",
  function (this: SpecControllerWorld) {
    aTargetWhoseRunWroteAReportDirectory(this, KOTLIN_RUN, "Gradle");
  },
);

Given("in that run a passing test cites one of the target's unit scenarios in its display name", function (this: SpecControllerWorld) {
  const run = this.reportedRun;
  const feature = readFileSync(`${run.features}/target.feature`, "utf8");
  assert.match(feature, new RegExp(`@unit @${run.cited}\\b`), `fixture invariant: ${run.cited} raises a unit obligation`);
  const passingTestcase = new RegExp(
    `<testcase name="${escaped(run.citingTest)}" classname="${escaped(run.citingClass)}" time="[^"]*"/>`,
  );
  const citingFiles = readdirSync(run.reports)
    .filter((name) => name.endsWith(".xml"))
    .filter((name) => passingTestcase.test(readFileSync(`${run.reports}/${name}`, "utf8")));
  assert.equal(citingFiles.length, 1, `fixture invariant: one report file holds the passing test citing ${run.cited}`);
  this.citedScenario = run.cited;
  this.citingLocator = `${run.citingClass}::${run.citingTest}`;
});

Given(
  "a single Surefire report file, whose root is one test suite, in which a passing test cites that scenario in its display name",
  function (this: SpecControllerWorld) {
    assert.ok(existsSync(SINGLE_REPORT_TARGET.report), `missing the real Surefire report: ${SINGLE_REPORT_TARGET.report}`);
    const report = readFileSync(SINGLE_REPORT_TARGET.report, "utf8");
    assert.match(report, /^<\?xml[^>]*>\s*<testsuite\s/, "fixture invariant: the report's root is one test suite");
    assert.doesNotMatch(report, /<testsuites[\s>]/, "fixture invariant: the report holds no testsuites element");
    const passingTestcase = new RegExp(
      `<testcase name="${escaped(SINGLE_REPORT_CITING_TEST)}" classname="${escaped(SINGLE_REPORT_CITING_CLASS)}" time="[^"]*"/>`,
    );
    assert.match(report, passingTestcase, `fixture invariant: the test citing ${SINGLE_REPORT_CITED} passed`);
    this.citingLocator = `${SINGLE_REPORT_CITING_CLASS}::${SINGLE_REPORT_CITING_TEST}`;
    this.reportArgs = ["--junit", SINGLE_REPORT_TARGET.report];
  },
);

const NOT_A_JUNIT_XML_REPORT: Record<string, string> = {
  "not XML at all": "Tests run: 1, Failures: 0, Errors: 0, Skipped: 0\n",
  "XML that holds no test suites": "<html><body/></html>",
};

Given("beside the reports Surefire wrote, that directory holds a report file that is {}", function (this: SpecControllerWorld, defect: string) {
  const content = NOT_A_JUNIT_XML_REPORT[defect];
  assert.ok(content !== undefined, `no report file that is "${defect}"`);
  const reports = temporaryDirectory(this, "surefire-reports-");
  cpSync(JAVA_TARGET.reports, reports, { recursive: true });
  this.notAReport = join(reports, "TEST-example.NotAReport.xml");
  writeFileSync(this.notAReport, content);
  this.reportArgs = ["--junit", reports];
});

When("balance is asked to reconcile that target with that Surefire report file", reconcileWithTheReports);

When("balance is asked to reconcile that target with that directory of Surefire reports", reconcileWithTheReports);

When("balance is asked to reconcile that target with that directory of Gradle reports", reconcileWithTheReports);

Then("the scenario that JUnit 5 test cites reconciles satisfied, by that test", function (this: SpecControllerWorld) {
  const unit = satisfiedUnitReconciliationOf(this, this.citedScenario);
  assert.equal(
    unit?.evidenceObservations?.[0]?.locator,
    this.citingLocator,
    `expected the satisfying observation to be the JUnit 5 test "${this.citingLocator}"; got ${JSON.stringify(unit)}`,
  );
});

Then("the reports are refused as input the tool cannot read, never read as a verdict", function (this: SpecControllerWorld) {
  assert.equal(this.balanceResult.status, 2, `expected the usage exit; got ${this.balanceResult.status}\n${this.balanceResult.stderr}${this.balanceResult.stdout}`);
  assert.equal(this.balanceResult.stdout, "", "a refused input must not reach a report");
  assert.doesNotMatch(this.balanceResult.stderr, /^\s+at .*:\d+:\d+\)?$/m, `a refusal is typed, never a stack trace:\n${this.balanceResult.stderr}`);
});

Then("the refusal names that report file and the shape a JUnit XML report takes", function (this: SpecControllerWorld) {
  assert.ok(this.balanceResult.stderr.includes(this.notAReport), `expected stderr to name ${this.notAReport}; got:\n${this.balanceResult.stderr}`);
  assert.ok(this.balanceResult.stderr.includes("--junit"), `expected stderr to name --junit; got:\n${this.balanceResult.stderr}`);
  assert.ok(
    this.balanceResult.stderr.includes(entryText("junit-xml-report-shape")),
    `expected stderr to name the shape a JUnit XML report takes; got:\n${this.balanceResult.stderr}`,
  );
});

const JEST_TARGET = {
  features: "tests/fixtures/jest/features",
  packageJson: "tests/fixtures/jest/package.json",
  ci: "tests/fixtures/jest",
  report: "tests/fixtures/jest/report.json",
};

const JEST_CITED = "SCN-JSF-001";

const JEST_CITING_TEST = `[${JEST_CITED}] a passing test cites its scenario`;

interface JestReport {
  readonly testResults: ReadonlyArray<{
    readonly assertionResults: ReadonlyArray<{ readonly title: string; readonly status: string }>;
  }>;
}

Given("a target whose unit tests are a Jest suite and whose scenario raises a unit evidence obligation", function (this: SpecControllerWorld) {
  const feature = readFileSync(`${JEST_TARGET.features}/target.feature`, "utf8");
  assert.match(feature, new RegExp(`@unit @${JEST_CITED}\\b`), `fixture invariant: ${JEST_CITED} raises a unit obligation`);
  this.targetArgs = ["--features", JEST_TARGET.features, "--package-json", JEST_TARGET.packageJson, "--ci", JEST_TARGET.ci];
});

Given("a Jest report in which a passing test cites that scenario in its title", function (this: SpecControllerWorld) {
  assert.ok(existsSync(JEST_TARGET.report), `missing the real Jest report: ${JEST_TARGET.report}`);
  const report = JSON.parse(readFileSync(JEST_TARGET.report, "utf8")) as JestReport;
  const citing = report.testResults.flatMap((file) => file.assertionResults).filter((a) => a.title === JEST_CITING_TEST);
  assert.deepEqual(
    citing.map((a) => a.status),
    ["passed"],
    `fixture invariant: exactly one test titled "${JEST_CITING_TEST}", and it passed`,
  );
  this.reportArgs = ["--jest", JEST_TARGET.report];
});

When("balance is asked to reconcile that target with the Jest report", reconcileWithTheReports);

Then("the scenario that Jest test cites reconciles satisfied, by that test", function (this: SpecControllerWorld) {
  const unit = satisfiedUnitReconciliationOf(this, JEST_CITED);
  assert.equal(
    unit?.evidenceObservations?.[0]?.testName,
    JEST_CITING_TEST,
    `expected the satisfying observation to be the Jest test "${JEST_CITING_TEST}"; got ${JSON.stringify(unit)}`,
  );
});

const PYTEST_TARGET = {
  features: "tests/fixtures/pytest/features",
  packageJson: "tests/fixtures/pytest/package.json",
  ci: "tests/fixtures/pytest",
  report: "tests/fixtures/pytest/report.xml",
};

const PYTEST_CITED = "SCN-PYF-001";

const PYTEST_CITING_TEST = "test_passing_cited";

Given("a target whose scenario raises a unit evidence obligation", function (this: SpecControllerWorld) {
  const feature = readFileSync(`${PYTEST_TARGET.features}/target.feature`, "utf8");
  assert.match(feature, new RegExp(`@unit @${PYTEST_CITED}\\b`), `fixture invariant: ${PYTEST_CITED} raises a unit obligation`);
  this.targetArgs = ["--features", PYTEST_TARGET.features, "--package-json", PYTEST_TARGET.packageJson, "--ci", PYTEST_TARGET.ci];
});

Given("a pytest report in which a passing test cites that scenario", function (this: SpecControllerWorld) {
  assert.ok(existsSync(PYTEST_TARGET.report), `missing the real pytest report: ${PYTEST_TARGET.report}`);
  const testcase = new RegExp(
    `<testcase classname="test_cases" name="${PYTEST_CITING_TEST}"[^>]*><properties><property name="scn" value="${PYTEST_CITED}" /></properties></testcase>`,
  );
  assert.match(readFileSync(PYTEST_TARGET.report, "utf8"), testcase, `fixture invariant: ${PYTEST_CITING_TEST} passes and cites ${PYTEST_CITED}`);
  this.reportArgs = ["--pytest", PYTEST_TARGET.report];
});

When("balance is asked to reconcile that target with the pytest report", reconcileWithTheReports);

Then("the scenario reconciles satisfied", function (this: SpecControllerWorld) {
  const unit = satisfiedUnitReconciliationOf(this, PYTEST_CITED);
  assert.match(
    unit?.evidenceObservations?.[0]?.locator ?? "",
    new RegExp(PYTEST_CITING_TEST),
    `expected the satisfying observation to be the pytest test ${PYTEST_CITING_TEST}; got ${JSON.stringify(unit)}`,
  );
});

const RSPEC_TARGET = {
  features: "tests/fixtures/rspec/features",
  packageJson: "tests/fixtures/rspec/package.json",
  ci: "tests/fixtures/rspec",
  report: "tests/fixtures/rspec/report.json",
};

const RSPEC_CITED = "SCN-RSF-001";

const CITING_EXAMPLE = `[${RSPEC_CITED}] a passing example cites its scenario`;

interface RspecReport {
  readonly examples: ReadonlyArray<{ readonly description: string; readonly full_description: string; readonly status: string }>;
}

Given("a target whose unit tests are an RSpec suite and whose scenario raises a unit evidence obligation", function (this: SpecControllerWorld) {
  const feature = readFileSync(`${RSPEC_TARGET.features}/target.feature`, "utf8");
  assert.match(feature, new RegExp(`@unit @${RSPEC_CITED}\\b`), `fixture invariant: ${RSPEC_CITED} raises a unit obligation`);
  this.targetArgs = ["--features", RSPEC_TARGET.features, "--package-json", RSPEC_TARGET.packageJson, "--ci", RSPEC_TARGET.ci];
});

Given("an RSpec report in which a passing example cites that scenario in its description", function (this: SpecControllerWorld) {
  assert.ok(existsSync(RSPEC_TARGET.report), `missing the real RSpec report: ${RSPEC_TARGET.report}`);
  const report = JSON.parse(readFileSync(RSPEC_TARGET.report, "utf8")) as RspecReport;
  const citing = report.examples.filter((example) => example.description === CITING_EXAMPLE);
  assert.deepEqual(
    citing.map((example) => example.status),
    ["passed"],
    `fixture invariant: exactly one example described "${CITING_EXAMPLE}", and it passed`,
  );
  this.reportArgs = ["--rspec", RSPEC_TARGET.report];
});

When("balance is asked to reconcile that target with the RSpec report", reconcileWithTheReports);

Then("the scenario that RSpec example cites reconciles satisfied, by that example", function (this: SpecControllerWorld) {
  const unit = satisfiedUnitReconciliationOf(this, RSPEC_CITED);
  assert.equal(
    unit?.evidenceObservations?.[0]?.testName,
    `An RSpec fixture suite ${CITING_EXAMPLE}`,
    `expected the satisfying observation to be the RSpec example "${CITING_EXAMPLE}"; got ${JSON.stringify(unit)}`,
  );
});

const FEATURE = "@UIN\nFeature: a target\n\n  @unit @SCN-UIN-001\n  Scenario: it works\n    Given a thing\n";

function targetDir(world: SpecControllerWorld): string {
  const dir = temporaryDirectory(world, "unreadable-input-");
  mkdirSync(join(dir, "features"));
  writeFileSync(join(dir, "features", "target.feature"), FEATURE);
  return dir;
}

function reportTarget(world: SpecControllerWorld, flag: string, file: string, document: unknown, refusal: ExpectedEntry): ArrangedTarget {
  const dir = targetDir(world);
  writeFileSync(join(dir, file), JSON.stringify(document));
  return { dir, args: ["--features", "features", `--${flag}`, file], named: file, where: `--${flag}`, refusal };
}

const LIST = entryText("shape-kind-list");

const OBJECT = entryText("shape-kind-object");

const kindOf = (type: string): string => entryText("shape-kind-of-type", { type });

const wrongKind = (where: string, found: string, expected: string): string => entryText("shape-wrong-kind", { where, found, expected });

const atTop = (found: string, expected: string): string => wrongKind(entryText("shape-top-level"), found, expected);

const missing = (path: string): string => entryText("shape-field-missing", { path });

const inShape = (fault: string): ExpectedEntry => ["not-in-shape", { fault }];

function rowOf<T>(rows: Record<string, T>, name: string): T {
  const row = rows[name];
  assert.ok(row !== undefined, `no row named "${name}"`);
  return row;
}

const VITEST: Record<string, readonly [unknown, ExpectedEntry]> = {
  "no list of test results": [{ numTotalTests: 0 }, inShape(missing("testResults"))],
  "a list where the report belongs": [[], inShape(atTop(LIST, OBJECT))],
  "test results that are not a list": [{ testResults: "x" }, inShape(wrongKind("testResults", kindOf("string"), LIST))],
  "a test file that is not an object": [{ testResults: [1] }, inShape(wrongKind("testResults[0]", kindOf("number"), OBJECT))],
  "a test file whose assertions are not a list": [
    { testResults: [{ assertionResults: {} }] },
    inShape(wrongKind("testResults[0].assertionResults", OBJECT, LIST)),
  ],
  "a test file whose name is not a string": [
    { testResults: [{ name: 1, assertionResults: [] }] },
    inShape(wrongKind("testResults[0].name", kindOf("number"), kindOf("string"))),
  ],
};

Given("a target whose Vitest report parses but holds {}", function (this: SpecControllerWorld, defect: string) {
  const [document, refusal] = rowOf(VITEST, defect);
  this.target = reportTarget(this, "vitest", "vitest.json", document, refusal);
});

const CUCUMBER: Record<string, readonly [unknown, ExpectedEntry]> = {
  "an object where the list of features belongs": [{}, inShape(atTop(OBJECT, LIST))],
  "a string where the list of features belongs": ["x", inShape(atTop(kindOf("string"), LIST))],
  "a feature whose scenarios are not a list": [[{ elements: "x" }], inShape(wrongKind("[0].elements", kindOf("string"), LIST))],
  "a scenario whose tags are not a list": [[{ elements: [{ tags: {} }] }], inShape(wrongKind("[0].elements[0].tags", OBJECT, LIST))],
  "a scenario whose steps are not a list": [[{ elements: [{ steps: "x" }] }], inShape(wrongKind("[0].elements[0].steps", kindOf("string"), LIST))],
  "a feature whose location is not a string": [[{ uri: 1, elements: [] }], inShape(wrongKind("[0].uri", kindOf("number"), kindOf("string")))],
};

Given("a target whose Cucumber report parses but holds {}", function (this: SpecControllerWorld, defect: string) {
  const [document, refusal] = rowOf(CUCUMBER, defect);
  this.target = reportTarget(this, "cucumber", "cucumber.json", document, refusal);
});

const CI_STEPS: Record<string, readonly [unknown, ExpectedEntry]> = {
  "a list where the record belongs": [[], inShape(atTop(LIST, OBJECT))],
  "nothing where the record belongs": [null, inShape(atTop("null", OBJECT))],
  "a scenario-coded step that is not an object": [{ "SCN-UIN-001": "success" }, inShape(wrongKind("SCN-UIN-001", kindOf("string"), OBJECT))],
  "a scenario-coded step whose outcome is not a string": [
    { "SCN-UIN-001": { outcome: 1 } },
    inShape(wrongKind("SCN-UIN-001.outcome", kindOf("number"), kindOf("string"))),
  ],
};

Given("a target whose CI step record parses but holds {}", function (this: SpecControllerWorld, defect: string) {
  const [document, refusal] = rowOf(CI_STEPS, defect);
  this.target = reportTarget(this, "ci-steps", "ci-steps.json", document, refusal);
});

const NOT_JUNIT_XML: Record<string, string> = {
  "not XML at all": "collected 3 items\n3 passed in 0.01s\n",
  "a JSON report rather than XML": '{"testResults":[]}',
  "XML that holds no test suites": "<html><body/></html>",
};

Given(/^a target whose pytest report is (?!well formed and holds nothing$)(.+)$/, function (this: SpecControllerWorld, defect: string) {
  const dir = targetDir(this);
  writeFileSync(join(dir, "report.xml"), rowOf(NOT_JUNIT_XML, defect));
  this.target = { dir, args: ["--features", "features", "--pytest", "report.xml"], named: "report.xml", where: "--pytest" };
});

Given(/^a target whose JUnit report is (?!well formed and holds nothing$)(.+)$/, function (this: SpecControllerWorld, defect: string) {
  const dir = targetDir(this);
  writeFileSync(join(dir, "report.xml"), rowOf(NOT_JUNIT_XML, defect));
  this.target = { dir, args: ["--features", "features", "--junit", "report.xml"], named: "report.xml", where: "--junit" };
});

const NOT_JEST_JSON: Record<string, string> = {
  "not JSON at all": "PASS src/a.test.ts\nTests: 3 passed, 3 total\n",
  "a JUnit XML report rather than JSON": '<?xml version="1.0" encoding="UTF-8"?><testsuites name="jest tests"></testsuites>',
  "JSON that holds no test results": '{"numTotalTests":0}',
};

Given(/^a target whose Jest report is (?!well formed and holds nothing$)(.+)$/, function (this: SpecControllerWorld, defect: string) {
  const dir = targetDir(this);
  writeFileSync(join(dir, "jest.json"), rowOf(NOT_JEST_JSON, defect));
  this.target = { dir, args: ["--features", "features", "--jest", "jest.json"], named: "jest.json", where: "--jest" };
});

const NOT_RSPEC_JSON: Record<string, string> = {
  "not JSON at all": "Finished in 0.01 seconds\n3 examples, 0 failures\n",
  "a JUnit XML report rather than JSON": '<?xml version="1.0" encoding="UTF-8"?><testsuite name="rspec" tests="0"></testsuite>',
  "JSON that holds no examples": '{"numTotalTests":0,"testResults":[]}',
};

Given(/^a target whose RSpec report is (?!well formed and holds nothing$)(.+)$/, function (this: SpecControllerWorld, defect: string) {
  const dir = targetDir(this);
  writeFileSync(join(dir, "rspec.json"), rowOf(NOT_RSPEC_JSON, defect));
  this.target = { dir, args: ["--features", "features", "--rspec", "rspec.json"], named: "rspec.json", where: "--rspec" };
});

const MANIFEST: Record<string, readonly [string, ExpectedEntry]> = {
  "a list where the manifest belongs": ["[]", inShape(atTop(LIST, OBJECT))],
  "scripts that are not a map": ['{"scripts":"x"}', inShape(wrongKind("scripts", kindOf("string"), OBJECT))],
  "a script that is not a string": ['{"scripts":{"lint":5}}', inShape(wrongKind("scripts.lint", kindOf("number"), kindOf("string")))],
  "text that does not parse": ["{not json", ["not-valid-json", {}]],
};

Given("a target whose manifest, {}, holds {}", function (this: SpecControllerWorld, how: string, defect: string) {
  const [text, refusal] = rowOf(MANIFEST, defect);
  const dir = targetDir(this);
  writeFileSync(join(dir, "package.json"), text);
  const named = how === "given by name" ? ["--package-json", "package.json"] : [];
  this.target = { dir, args: ["--features", "features", ...named], named: "package.json", where: "", refusal };
});

const EMPTY_PYTEST_REPORT =
  '<?xml version="1.0" encoding="utf-8"?><testsuites name="pytest tests"><testsuite name="pytest" errors="0" failures="0" skipped="0" tests="0" time="0.004" /></testsuites>';

const EMPTY_GOTESTSUM_REPORT = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<testsuites tests="0" failures="0" errors="0" time="0.001000">',
  '\t<testsuite tests="0" failures="0" time="0.000000" name="example.com/empty" timestamp="2026-10-14T22:35:27Z">',
  '\t\t<properties>',
  '\t\t\t<property name="go.version" value="go1.27.2 linux/amd64"></property>',
  "\t\t</properties>",
  "\t</testsuite>",
  "</testsuites>",
].join("\n");

const EMPTY_RSPEC_REPORT = JSON.stringify({
  version: "3.13.6",
  messages: ["No examples found."],
  examples: [],
  summary: { duration: 0.000021, example_count: 0, failure_count: 0, pending_count: 0, errors_outside_of_examples_count: 0 },
  summary_line: "0 examples, 0 failures",
});

const EMPTY: Record<string, readonly [string, string, string | null]> = {
  "Vitest report": ["vitest", "vitest.json", JSON.stringify({ testResults: [] })],
  "pytest report": ["pytest", "report.xml", EMPTY_PYTEST_REPORT],
  "Jest report": ["jest", "jest.json", JSON.stringify({ numTotalTests: 0, success: true, testResults: [] })],
  "RSpec report": ["rspec", "rspec.json", EMPTY_RSPEC_REPORT],
  "JUnit report": ["junit", "report.xml", EMPTY_GOTESTSUM_REPORT],
  "JUnit report directory": ["junit", "surefire-reports", null],
  "Cucumber report": ["cucumber", "cucumber.json", "[]"],
  "CI step record": ["ci-steps", "ci-steps.json", "{}"],
};

Given("a target whose {} is well formed and holds nothing", function (this: SpecControllerWorld, input: string) {
  const [flag, file, text] = rowOf(EMPTY, input);
  const dir = targetDir(this);
  if (text === null) mkdirSync(join(dir, file));
  else writeFileSync(join(dir, file), text);
  this.target = { dir, args: ["--features", "features", `--${flag}`, file], named: file, where: "" };
});

const PATH_KINDS: Record<string, (dir: string) => readonly [readonly string[], string]> = {
  "feature corpus a regular file": (dir) => {
    writeFileSync(join(dir, "corpus.txt"), "not a directory\n");
    return [["--features", "corpus.txt"], "corpus.txt"];
  },
  "feature corpus a single feature file": () => [["--features", "features/target.feature"], "features/target.feature"],
  "feature corpus a directory holding a directory named as a feature file": (dir) => {
    mkdirSync(join(dir, "features", "nested.feature"));
    return [["--features", "features"], join("features", "nested.feature")];
  },
  "CI workflows a directory holding a directory named as a workflow file": (dir) => {
    mkdirSync(join(dir, "workflows", "nested.yml"), { recursive: true });
    return [["--features", "features", "--ci", "workflows"], join("workflows", "nested.yml")];
  },
  "JUnit reports a directory holding a directory named as a JUnit report": (dir) => {
    mkdirSync(join(dir, "surefire-reports", "TEST-example.NestedTest.xml"), { recursive: true });
    return [["--features", "features", "--junit", "surefire-reports"], join("surefire-reports", "TEST-example.NestedTest.xml")];
  },
};

Given("a target whose {} path is {}", function (this: SpecControllerWorld, input: string, kind: string) {
  const dir = targetDir(this);
  const [args, path] = rowOf(PATH_KINDS, `${input} ${kind}`)(dir);
  this.target = { dir, args, named: path, where: args.find((arg) => arg.startsWith("--") && arg !== "--features") ?? "--features" };
});

const NOT_PERMITTED: Record<string, (dir: string) => readonly [readonly string[], string, string]> = {
  "a feature file": (dir) => {
    chmodSync(join(dir, "features", "target.feature"), 0o000);
    return [["--features", "features"], join("features", "target.feature"), "--features"];
  },
  "the feature corpus directory": (dir) => {
    chmodSync(join(dir, "features"), 0o000);
    return [["--features", "features"], "features", "--features"];
  },
  "a subdirectory of the feature corpus, holding a feature file,": (dir) => {
    mkdirSync(join(dir, "features", "area"));
    writeFileSync(join(dir, "features", "area", "nested.feature"), FEATURE.replace(/UIN/g, "UIA"));
    chmodSync(join(dir, "features", "area"), 0o000);
    return [["--features", "features"], join("features", "area"), "--features"];
  },
  "the CI workflow file": (dir) => {
    writeFileSync(join(dir, "ci.yml"), "jobs: {}\n");
    chmodSync(join(dir, "ci.yml"), 0o000);
    return [["--features", "features", "--ci", "ci.yml"], "ci.yml", "--ci"];
  },
  "the CI workflows directory": (dir) => {
    mkdirSync(join(dir, "workflows"));
    chmodSync(join(dir, "workflows"), 0o000);
    return [["--features", "features", "--ci", "workflows"], "workflows", "--ci"];
  },
  "the manifest read by default": (dir) => {
    writeFileSync(join(dir, "package.json"), "{}");
    chmodSync(join(dir, "package.json"), 0o000);
    return [["--features", "features"], "package.json", entryText("default-package-json")];
  },
  "the Vitest report": (dir) => {
    writeFileSync(join(dir, "vitest.json"), '{"testResults":[]}');
    chmodSync(join(dir, "vitest.json"), 0o000);
    return [["--features", "features", "--vitest", "vitest.json"], "vitest.json", "--vitest"];
  },
  "the pytest report": (dir) => {
    writeFileSync(join(dir, "report.xml"), EMPTY_PYTEST_REPORT);
    chmodSync(join(dir, "report.xml"), 0o000);
    return [["--features", "features", "--pytest", "report.xml"], "report.xml", "--pytest"];
  },
  "the Jest report": (dir) => {
    writeFileSync(join(dir, "jest.json"), '{"numTotalTests":0,"success":true,"testResults":[]}');
    chmodSync(join(dir, "jest.json"), 0o000);
    return [["--features", "features", "--jest", "jest.json"], "jest.json", "--jest"];
  },
  "the RSpec report": (dir) => {
    writeFileSync(join(dir, "rspec.json"), EMPTY_RSPEC_REPORT);
    chmodSync(join(dir, "rspec.json"), 0o000);
    return [["--features", "features", "--rspec", "rspec.json"], "rspec.json", "--rspec"];
  },
  "the JUnit report": (dir) => {
    writeFileSync(join(dir, "report.xml"), EMPTY_GOTESTSUM_REPORT);
    chmodSync(join(dir, "report.xml"), 0o000);
    return [["--features", "features", "--junit", "report.xml"], "report.xml", "--junit"];
  },
  "the JUnit report directory": (dir) => {
    mkdirSync(join(dir, "surefire-reports"));
    writeFileSync(join(dir, "surefire-reports", "TEST-example.ExampleTest.xml"), EMPTY_GOTESTSUM_REPORT);
    chmodSync(join(dir, "surefire-reports"), 0o000);
    return [["--features", "features", "--junit", "surefire-reports"], "surefire-reports", "--junit"];
  },
};

Given("a target in which {} is not permitted to be read", function (this: SpecControllerWorld, input: string) {
  const dir = targetDir(this);
  const [args, named, where] = rowOf(NOT_PERMITTED, input)(dir);
  this.target = { dir, args, named, where };
});

const notSaved = (fault: string): ExpectedEntry => ["not-a-saved-reconciliation", { fault }];

type SavedShape = readonly [(saved: Record<string, unknown>) => unknown, ExpectedEntry];

const NOT_A_SAVED_RECONCILIATION: Record<string, readonly SavedShape[]> = {
  "a list, not a reconciliation": [[() => [], notSaved(atTop(LIST, OBJECT))]],
  "a reconciliation with no ledger": [[withoutClaimReconciliations, notSaved(missing(CLAIM_RECONCILIATIONS_SECTION))]],
  "holding a section of the wrong kind": [
    [(saved) => ({ ...saved, errorsInTheInputs: { scenarioCodeErrors: "x" } }), notSaved(wrongKind("errorsInTheInputs.scenarioCodeErrors", kindOf("string"), LIST))],
  ],
  "unreadable below its top": [[(saved) => withClaimReconciliations(saved, [{}]), ["not-renderable-as-saved", {}]]],
  "a reconciliation that does not name its corpus": [
    [(saved) => ({ ...saved, runProvenance: { ...(saved["runProvenance"] as object), corpus: undefined } }), notSaved(missing("runProvenance.corpus"))],
  ],
  "in an earlier report shape": [
    [
      (saved) => ({
        ...saved,
        summary: { ...(saved["summary"] as object), ...reconciliationTotalsSection(undefined), evidenceObservations: undefined },
      }),
      notSaved(missing(RECONCILIATION_TOTALS_PATH)),
    ],
    [(saved) => withReconciliationTotalsUnderEarlierKey(saved as { summary: object }), notSaved(missing(RECONCILIATION_TOTALS_PATH))],
    [
      (saved) => ({ ...withoutClaimReconciliations(saved), ledger: claimReconciliationsSection(claimReconciliationsOf(saved)) }),
      notSaved(missing(CLAIM_RECONCILIATIONS_SECTION)),
    ],
    [(saved) => ({ ...saved, errors: { configuration: { keysNotRead: ["x"] } } }), notSaved(missing("errorsInTheInputs"))],
  ],
};

function savedReconciliation(dir: string): Record<string, unknown> {
  const run = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, "balance", "--features", "features", "--format", "json:good.json"], {
    cwd: dir,
    encoding: "utf8",
  });
  assert.equal(run.status, 1, `expected the target to save an out-of-balance run; got ${run.status}\n${run.stderr}`);
  return JSON.parse(readFileSync(join(dir, "good.json"), "utf8")) as Record<string, unknown>;
}

Given("a saved report that parses but is {}", function (this: SpecControllerWorld, defect: string) {
  const dir = targetDir(this);
  const good = savedReconciliation(dir);
  const [first, ...more] = rowOf(NOT_A_SAVED_RECONCILIATION, defect).map(([broken, refusal], i): ArrangedTarget => {
    const file = i === 0 ? "saved.json" : `saved-${i + 1}.json`;
    writeFileSync(join(dir, file), JSON.stringify(broken(good)));
    return { dir, args: ["--render-from-json", file], named: file, where: "", refusal };
  });
  this.target = { ...first!, more };
});

const STORED: Record<string, (dir: string) => readonly [readonly string[], string]> = {
  "feature corpus": (dir) => {
    writeFileSync(join(dir, "corpus.txt"), "not a directory\n");
    return [["--features", "corpus.txt"], "corpus.txt"];
  },
  "Cucumber report": (dir) => {
    writeFileSync(join(dir, "cucumber.json"), "{}");
    return [["--features", "features", "--cucumber", "cucumber.json"], "cucumber.json"];
  },
};

Given("a stored run's target whose {} is one the tool cannot read in shape", function (this: SpecControllerWorld, input: string) {
  const dir = targetDir(this);
  this.storeRoot = join(dir, "store");
  mkdirSync(this.storeRoot);
  const [args, named] = rowOf(STORED, input)(dir);
  this.target = { dir, args, named, where: named };
});

When("a stored balance run reads that input", function (this: SpecControllerWorld) {
  const argv = ["--store", this.storeRoot, "--run-id", "r1", "balance", ...this.target.args];
  this.balanceResult = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, ...argv], { cwd: this.target.dir, encoding: "utf8" });
  assert.equal(this.balanceResult.error, undefined, `CLI failed to spawn: ${this.balanceResult.error?.message}`);
});

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name).slice(dir.length + 1));
}

Then("the refused run leaves nothing in the run store", function (this: SpecControllerWorld) {
  assert.deepEqual(filesUnder(this.storeRoot), [], "a refused run must store nothing: no run.yaml and no report");
});

const NOT_YAML = "jobs:\n  ci: [\n";

const YAML_PARSE_ERROR = "Flow sequence in block collection must be sufficiently indented and end with a ]";

const UNPARSEABLE_WORKFLOW: Record<string, (dir: string) => ArrangedTarget> = {
  "--ci workflow file": (dir) => {
    writeFileSync(join(dir, "ci.yml"), NOT_YAML);
    return { dir, args: ["--features", "features", "--ci", "ci.yml"], named: "ci.yml", where: entryText("flagged-workflows", { flag: "--ci" }) };
  },
  "workflow in the --ci folder": (dir) => {
    mkdirSync(join(dir, "workflows"));
    writeFileSync(join(dir, "workflows", "a-lint.yml"), "jobs:\n  lint:\n    steps:\n      - run: pnpm lint\n");
    writeFileSync(join(dir, "workflows", "build.yml"), NOT_YAML);
    return { dir, args: ["--features", "features", "--ci", "workflows"], named: join("workflows", "build.yml"), where: entryText("flagged-workflows", { flag: "--ci" }) };
  },
  "workflow read by default": (dir) => {
    mkdirSync(join(dir, ".github", "workflows"), { recursive: true });
    writeFileSync(join(dir, ".github", "workflows", "ci.yml"), NOT_YAML);
    return {
      dir,
      args: ["--features", "features"],
      named: join(".github", "workflows", "ci.yml"),
      where: entryText("default-ci-workflows"),
    };
  },
};

Given("a target whose {} does not parse as YAML", function (this: SpecControllerWorld, workflow: string) {
  this.target = rowOf(UNPARSEABLE_WORKFLOW, workflow)(targetDir(this));
});

Then("the refusal names the workflow and the parse error", function (this: SpecControllerWorld) {
  const file = shownEntry(this.balanceResult.stderr, "workflow-not-yaml", { workflows: this.target.where })?.["file"] ?? "";
  assert.ok(file.endsWith(this.target.named), `expected stderr to name ${this.target.where} and ${this.target.named}; got:\n${this.balanceResult.stderr}`);
  assert.ok(this.balanceResult.stderr.includes(YAML_PARSE_ERROR), `expected stderr to carry the YAML parser's error; got:\n${this.balanceResult.stderr}`);
});

function balanceReading(target: ArrangedTarget): SpawnSyncReturns<string> {
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, "balance", ...target.args], { cwd: target.dir, encoding: "utf8" });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  return result;
}

When("the balance run reads that input", function (this: SpecControllerWorld) {
  this.balanceResult = balanceReading(this.target);
  this.moreBalanceResults = (this.target.more ?? []).map((target) => [target, balanceReading(target)] as const);
});

// A row may hold several inputs; each is read on its own.
function eachReading(world: SpecControllerWorld): readonly (readonly [ArrangedTarget, SpawnSyncReturns<string>])[] {
  return [[world.target, world.balanceResult], ...world.moreBalanceResults];
}

Given("a target whose working directory has since been removed", function (this: SpecControllerWorld) {
  const parent = temporaryDirectory(this, "unreadable-input-");
  const removed = join(parent, "removed");
  mkdirSync(removed);
  this.target = { dir: removed, args: [], named: "features", where: entryText("default-feature-corpus") };
});

When("balance is asked to reconcile it with no feature corpus given", function (this: SpecControllerWorld) {
  const script = 'cd "$1" && rmdir "$1" && shift && exec "$@"';
  this.balanceResult = spawnSync("/bin/sh", ["-c", script, "sh", this.target.dir, NODE, ...SPEC_CONTROLLER_ARGV, "balance", ...this.target.args], {
    encoding: "utf8",
  });
  assert.equal(this.balanceResult.error, undefined, `CLI failed to spawn: ${this.balanceResult.error?.message}`);
  assert.equal(existsSync(this.target.dir), false, "the working directory should have been removed before the binary ran");
});

Then("the input is refused as one the tool cannot read, never read as a verdict", function (this: SpecControllerWorld) {
  for (const [, result] of eachReading(this)) {
    assert.equal(result.status, 2, `expected the usage exit; got ${result.status}\n${result.stderr}${result.stdout}`);
    assert.ok(!result.stdout.includes(entryText("report-title")), "a refused input must not reach a report");
    assert.doesNotMatch(result.stderr, /^\s+at .*:\d+:\d+\)?$/m, `a refusal is typed, never a stack trace:\n${result.stderr}`);
  }
});

Then("the refusal names the input and where its shape is wrong", function (this: SpecControllerWorld) {
  for (const [target, result] of eachReading(this)) {
    const [code, values] = target.refusal ?? ["", {}];
    const path = shownEntry(result.stderr, code, values)?.["path"] ?? "";
    assert.ok(path.endsWith(target.named), `expected the refusal ${code} naming ${target.named} with ${JSON.stringify(values)}; got:\n${result.stderr}`);
  }
});

Then("the refusal names the pytest report and the shape pytest writes", function (this: SpecControllerWorld) {
  assert.ok(this.balanceResult.stderr.includes(this.target.where), `expected stderr to name ${this.target.where}; got:\n${this.balanceResult.stderr}`);
  assert.ok(this.balanceResult.stderr.includes(this.target.named), `expected stderr to name ${this.target.named}; got:\n${this.balanceResult.stderr}`);
  assert.ok(
    this.balanceResult.stderr.includes(entryText("junit-report-shape")),
    `expected stderr to name the shape pytest writes; got:\n${this.balanceResult.stderr}`,
  );
});

Then("the refusal names the Jest report and the shape Jest writes", function (this: SpecControllerWorld) {
  assert.ok(this.balanceResult.stderr.includes(this.target.where), `expected stderr to name ${this.target.where}; got:\n${this.balanceResult.stderr}`);
  assert.ok(this.balanceResult.stderr.includes(this.target.named), `expected stderr to name ${this.target.named}; got:\n${this.balanceResult.stderr}`);
  assert.ok(
    this.balanceResult.stderr.includes(entryText("jest-report-shape")),
    `expected stderr to name the shape Jest writes; got:\n${this.balanceResult.stderr}`,
  );
});

Then("the refusal names the RSpec report and the shape RSpec writes", function (this: SpecControllerWorld) {
  assert.ok(this.balanceResult.stderr.includes(this.target.where), `expected stderr to name ${this.target.where}; got:\n${this.balanceResult.stderr}`);
  assert.ok(this.balanceResult.stderr.includes(this.target.named), `expected stderr to name ${this.target.named}; got:\n${this.balanceResult.stderr}`);
  assert.ok(
    this.balanceResult.stderr.includes(entryText("rspec-report-shape")),
    `expected stderr to name the shape RSpec writes; got:\n${this.balanceResult.stderr}`,
  );
});

Then("the refusal names the JUnit report and the shape a JUnit XML report takes", function (this: SpecControllerWorld) {
  assert.ok(this.balanceResult.stderr.includes(this.target.where), `expected stderr to name ${this.target.where}; got:\n${this.balanceResult.stderr}`);
  assert.ok(this.balanceResult.stderr.includes(this.target.named), `expected stderr to name ${this.target.named}; got:\n${this.balanceResult.stderr}`);
  assert.ok(
    this.balanceResult.stderr.includes(entryText("junit-xml-report-shape")),
    `expected stderr to name the shape a JUnit XML report takes; got:\n${this.balanceResult.stderr}`,
  );
  assert.doesNotMatch(this.balanceResult.stderr, /pytest/, `a --junit refusal names no single runner; got:\n${this.balanceResult.stderr}`);
});

Then("the run reads it and reaches its verdict", function (this: SpecControllerWorld) {
  assert.equal(this.balanceResult.status, 1, `expected the out-of-balance verdict of a target with no evidence; got ${this.balanceResult.status}\n${this.balanceResult.stderr}`);
  assert.equal(this.balanceResult.stderr, "", "a report that was read says nothing on stderr");
  assert.ok(showsHeading(this.balanceResult.stdout, 1, "report-title"), `expected the report's title; got:\n${this.balanceResult.stdout}`);
  const supplied = `\`${this.target.args[2]} ${this.target.args[3]}\``;
  assert.ok(this.balanceResult.stdout.includes(supplied), `expected the report to list ${supplied} among its inputs`);
});

Then("the refusal names the input it could not read and the path", function (this: SpecControllerWorld) {
  assert.ok(this.balanceResult.stderr.includes(this.target.where), `expected stderr to name ${this.target.where}; got:\n${this.balanceResult.stderr}`);
  assert.ok(this.balanceResult.stderr.includes(this.target.named), `expected stderr to name ${this.target.named}; got:\n${this.balanceResult.stderr}`);
});

Then("the refusal names the feature corpus read by default and the working directory's read failure", function (this: SpecControllerWorld) {
  assert.ok(
    showsEntry(this.balanceResult.stderr, "could-not-be-read", { subject: this.target.where, path: this.target.named }),
    `expected the could-not-be-read refusal of ${this.target.where}; got:\n${this.balanceResult.stderr}`,
  );
  assert.match(this.balanceResult.stderr, /uv_cwd/, `expected the working directory's read failure; got:\n${this.balanceResult.stderr}`);
});

Then("the refusal says the tool was not permitted to read it", function (this: SpecControllerWorld) {
  const reason = shownAmong(this.balanceResult.stderr, ["could-not-be-read", "working-directory-unreadable"])?.["reason"] ?? "";
  assert.match(reason, /EACCES|EPERM/, `expected an unreadable-input refusal for the operating system's reason; got:\n${this.balanceResult.stderr}`);
});
