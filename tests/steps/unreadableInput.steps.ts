import { After, Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

const FEATURE = "@UIN\nFeature: a target\n\n  @unit @SCN-UIN-001\n  Scenario: it works\n    Given a thing\n";

interface Target {
  readonly dir: string;
  readonly args: readonly string[];
  readonly named: string;
  readonly where: string;
}

let target: Target;
let result: SpawnSyncReturns<string>;
const temporaryDirectories: string[] = [];

function targetDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "unreadable-input-"));
  temporaryDirectories.push(dir);
  mkdirSync(join(dir, "features"));
  writeFileSync(join(dir, "features", "target.feature"), FEATURE);
  return dir;
}

function reportTarget(flag: string, file: string, document: unknown, where: string): Target {
  const dir = targetDir();
  writeFileSync(join(dir, file), JSON.stringify(document));
  return { dir, args: ["--features", "features", `--${flag}`, file], named: file, where };
}

function rowOf<T>(rows: Record<string, T>, name: string): T {
  const row = rows[name];
  assert.ok(row !== undefined, `no row named "${name}"`);
  return row;
}

const VITEST: Record<string, readonly [unknown, string]> = {
  "no list of test results": [{ numTotalTests: 0 }, "testResults is missing"],
  "a list where the report belongs": [[], "the top level is a list, not an object"],
  "test results that are not a list": [{ testResults: "x" }, "testResults is a string, not a list"],
  "a test file that is not an object": [{ testResults: [1] }, "testResults[0] is a number, not an object"],
  "a test file whose assertions are not a list": [
    { testResults: [{ assertionResults: {} }] },
    "testResults[0].assertionResults is an object, not a list",
  ],
  "a test file whose name is not a string": [
    { testResults: [{ name: 1, assertionResults: [] }] },
    "testResults[0].name is a number, not a string",
  ],
};

Given("a target whose Vitest report parses but holds {}", function (defect: string) {
  const [document, where] = rowOf(VITEST, defect);
  target = reportTarget("vitest", "vitest.json", document, where);
});

const CUCUMBER: Record<string, readonly [unknown, string]> = {
  "an object where the list of features belongs": [{}, "the top level is an object, not a list"],
  "a string where the list of features belongs": ["x", "the top level is a string, not a list"],
  "a feature whose scenarios are not a list": [[{ elements: "x" }], "[0].elements is a string, not a list"],
  "a scenario whose tags are not a list": [[{ elements: [{ tags: {} }] }], "[0].elements[0].tags is an object, not a list"],
  "a scenario whose steps are not a list": [[{ elements: [{ steps: "x" }] }], "[0].elements[0].steps is a string, not a list"],
  "a feature whose location is not a string": [[{ uri: 1, elements: [] }], "[0].uri is a number, not a string"],
};

Given("a target whose Cucumber report parses but holds {}", function (defect: string) {
  const [document, where] = rowOf(CUCUMBER, defect);
  target = reportTarget("cucumber", "cucumber.json", document, where);
});

const CI_STEPS: Record<string, readonly [unknown, string]> = {
  "a list where the record belongs": [[], "the top level is a list, not an object"],
  "nothing where the record belongs": [null, "the top level is null, not an object"],
  "a scenario-coded step that is not an object": [{ "SCN-UIN-001": "success" }, "SCN-UIN-001 is a string, not an object"],
  "a scenario-coded step whose outcome is not a string": [
    { "SCN-UIN-001": { outcome: 1 } },
    "SCN-UIN-001.outcome is a number, not a string",
  ],
};

Given("a target whose CI step record parses but holds {}", function (defect: string) {
  const [document, where] = rowOf(CI_STEPS, defect);
  target = reportTarget("ci-steps", "ci-steps.json", document, where);
});

const NOT_JUNIT_XML: Record<string, string> = {
  "not XML at all": "collected 3 items\n3 passed in 0.01s\n",
  "a JSON report rather than XML": '{"testResults":[]}',
  "XML that holds no test suites": "<html><body/></html>",
};

Given(/^a target whose pytest report is (?!well formed and holds nothing$)(.+)$/, function (defect: string) {
  const dir = targetDir();
  writeFileSync(join(dir, "report.xml"), rowOf(NOT_JUNIT_XML, defect));
  target = { dir, args: ["--features", "features", "--pytest", "report.xml"], named: "report.xml", where: "--pytest" };
});

Given(/^a target whose JUnit report is (?!well formed and holds nothing$)(.+)$/, function (defect: string) {
  const dir = targetDir();
  writeFileSync(join(dir, "report.xml"), rowOf(NOT_JUNIT_XML, defect));
  target = { dir, args: ["--features", "features", "--junit", "report.xml"], named: "report.xml", where: "--junit" };
});

const NOT_JEST_JSON: Record<string, string> = {
  "not JSON at all": "PASS src/a.test.ts\nTests: 3 passed, 3 total\n",
  "a JUnit XML report rather than JSON": '<?xml version="1.0" encoding="UTF-8"?><testsuites name="jest tests"></testsuites>',
  "JSON that holds no test results": '{"numTotalTests":0}',
};

Given(/^a target whose Jest report is (?!well formed and holds nothing$)(.+)$/, function (defect: string) {
  const dir = targetDir();
  writeFileSync(join(dir, "jest.json"), rowOf(NOT_JEST_JSON, defect));
  target = { dir, args: ["--features", "features", "--jest", "jest.json"], named: "jest.json", where: "--jest" };
});

const NOT_RSPEC_JSON: Record<string, string> = {
  "not JSON at all": "Finished in 0.01 seconds\n3 examples, 0 failures\n",
  "a JUnit XML report rather than JSON": '<?xml version="1.0" encoding="UTF-8"?><testsuite name="rspec" tests="0"></testsuite>',
  "JSON that holds no examples": '{"numTotalTests":0,"testResults":[]}',
};

Given(/^a target whose RSpec report is (?!well formed and holds nothing$)(.+)$/, function (defect: string) {
  const dir = targetDir();
  writeFileSync(join(dir, "rspec.json"), rowOf(NOT_RSPEC_JSON, defect));
  target = { dir, args: ["--features", "features", "--rspec", "rspec.json"], named: "rspec.json", where: "--rspec" };
});

const MANIFEST: Record<string, readonly [string, string]> = {
  "a list where the manifest belongs": ["[]", "the top level is a list, not an object"],
  "scripts that are not a map": ['{"scripts":"x"}', "scripts is a string, not an object"],
  "a script that is not a string": ['{"scripts":{"lint":5}}', "scripts.lint is a number, not a string"],
  "text that does not parse": ["{not json", "is not valid JSON"],
};

Given("a target whose manifest, {}, holds {}", function (how: string, defect: string) {
  const [text, where] = rowOf(MANIFEST, defect);
  const dir = targetDir();
  writeFileSync(join(dir, "package.json"), text);
  const named = how === "given by name" ? ["--package-json", "package.json"] : [];
  target = { dir, args: ["--features", "features", ...named], named: "package.json", where };
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

Given("a target whose {} is well formed and holds nothing", function (input: string) {
  const [flag, file, text] = rowOf(EMPTY, input);
  const dir = targetDir();
  if (text === null) mkdirSync(join(dir, file));
  else writeFileSync(join(dir, file), text);
  target = { dir, args: ["--features", "features", `--${flag}`, file], named: file, where: "" };
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

Given("a target whose {} path is {}", function (input: string, kind: string) {
  const dir = targetDir();
  const [args, path] = rowOf(PATH_KINDS, `${input} ${kind}`)(dir);
  target = { dir, args, named: path, where: args.find((arg) => arg.startsWith("--") && arg !== "--features") ?? "--features" };
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
    return [["--features", "features"], "package.json", "package.json read by default"];
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

Given("a target in which {} is not permitted to be read", function (input: string) {
  const dir = targetDir();
  const [args, named, where] = rowOf(NOT_PERMITTED, input)(dir);
  target = { dir, args, named, where };
});

const NOT_A_SAVED_RECONCILIATION: Record<string, readonly [(saved: Record<string, unknown>) => unknown, string]> = {
  "a list, not a reconciliation": [() => [], "the top level is a list, not an object"],
  "a reconciliation with no ledger": [(saved) => ({ ...saved, ledger: undefined }), "ledger is missing"],
  "holding a section of the wrong kind": [
    (saved) => ({ ...saved, scenarioCodeErrors: "x" }),
    "scenarioCodeErrors is a string, not a list",
  ],
  "unreadable below its top": [(saved) => ({ ...saved, ledger: { scenarioReconciliations: [null] } }), "could not be rendered"],
  "a reconciliation that does not name its corpus": [
    (saved) => ({ ...saved, runProvenance: { ...(saved["runProvenance"] as object), corpus: undefined } }),
    "runProvenance.corpus is missing",
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

Given("a saved report that parses but is {}", function (defect: string) {
  const [broken, where] = rowOf(NOT_A_SAVED_RECONCILIATION, defect);
  const dir = targetDir();
  writeFileSync(join(dir, "saved.json"), JSON.stringify(broken(savedReconciliation(dir))));
  target = { dir, args: ["--render-from-json", "saved.json"], named: "saved.json", where };
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

let store = "";

Given("a stored run's target whose {} is one the tool cannot read in shape", function (input: string) {
  const dir = targetDir();
  store = join(dir, "store");
  mkdirSync(store);
  const [args, named] = rowOf(STORED, input)(dir);
  target = { dir, args, named, where: named };
});

When("a stored balance run reads that input", function () {
  const argv = ["--store", store, "--run-id", "r1", "balance", ...target.args];
  result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, ...argv], { cwd: target.dir, encoding: "utf8" });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
});

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name).slice(dir.length + 1));
}

Then("the refused run leaves nothing in the run store", function () {
  assert.deepEqual(filesUnder(store), [], "a refused run must store nothing: no run.yaml and no report");
});

When("the balance run reads that input", function () {
  result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, "balance", ...target.args], { cwd: target.dir, encoding: "utf8" });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
});

Given("a target whose working directory has since been removed", function () {
  const parent = mkdtempSync(join(tmpdir(), "unreadable-input-"));
  temporaryDirectories.push(parent);
  const removed = join(parent, "removed");
  mkdirSync(removed);
  target = { dir: removed, args: [], named: "features", where: "The feature corpus read by default" };
});

When("balance is asked to reconcile it with no feature corpus given", function () {
  const script = 'cd "$1" && rmdir "$1" && shift && exec "$@"';
  result = spawnSync("/bin/sh", ["-c", script, "sh", target.dir, NODE, ...SPEC_CONTROLLER_ARGV, "balance", ...target.args], {
    encoding: "utf8",
  });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  assert.equal(existsSync(target.dir), false, "the working directory should have been removed before the binary ran");
});

Then("the input is refused as one the tool cannot read, never read as a verdict", function () {
  assert.equal(result.status, 2, `expected the usage exit; got ${result.status}\n${result.stderr}${result.stdout}`);
  assert.doesNotMatch(result.stdout, /Evidence Reconciliation/, "a refused input must not reach a report");
  assert.doesNotMatch(result.stderr, /^\s+at .*:\d+:\d+\)?$/m, `a refusal is typed, never a stack trace:\n${result.stderr}`);
});

Then("the refusal names the input and where its shape is wrong", function () {
  assert.ok(result.stderr.includes(target.named), `expected stderr to name ${target.named}; got:\n${result.stderr}`);
  assert.ok(result.stderr.includes(target.where), `expected stderr to say "${target.where}"; got:\n${result.stderr}`);
});

Then("the refusal names the pytest report and the shape pytest writes", function () {
  assert.ok(result.stderr.includes(target.where), `expected stderr to name ${target.where}; got:\n${result.stderr}`);
  assert.ok(result.stderr.includes(target.named), `expected stderr to name ${target.named}; got:\n${result.stderr}`);
  assert.ok(
    result.stderr.includes("the JUnit XML report pytest --junitxml writes"),
    `expected stderr to name the shape pytest writes; got:\n${result.stderr}`,
  );
});

Then("the refusal names the Jest report and the shape Jest writes", function () {
  assert.ok(result.stderr.includes(target.where), `expected stderr to name ${target.where}; got:\n${result.stderr}`);
  assert.ok(result.stderr.includes(target.named), `expected stderr to name ${target.named}; got:\n${result.stderr}`);
  assert.ok(
    result.stderr.includes("the JSON report jest --json writes"),
    `expected stderr to name the shape Jest writes; got:\n${result.stderr}`,
  );
});

Then("the refusal names the RSpec report and the shape RSpec writes", function () {
  assert.ok(result.stderr.includes(target.where), `expected stderr to name ${target.where}; got:\n${result.stderr}`);
  assert.ok(result.stderr.includes(target.named), `expected stderr to name ${target.named}; got:\n${result.stderr}`);
  assert.ok(
    result.stderr.includes("the JSON report rspec --format json writes"),
    `expected stderr to name the shape RSpec writes; got:\n${result.stderr}`,
  );
});

Then("the refusal names the JUnit report and the shape a JUnit XML report takes", function () {
  assert.ok(result.stderr.includes(target.where), `expected stderr to name ${target.where}; got:\n${result.stderr}`);
  assert.ok(result.stderr.includes(target.named), `expected stderr to name ${target.named}; got:\n${result.stderr}`);
  assert.ok(
    result.stderr.includes("in the shape of a JUnit XML report"),
    `expected stderr to name the shape a JUnit XML report takes; got:\n${result.stderr}`,
  );
  assert.doesNotMatch(result.stderr, /pytest/, `a --junit refusal names no single runner; got:\n${result.stderr}`);
});

Then("the run reads it and reaches its verdict", function () {
  assert.equal(result.status, 1, `expected the out-of-balance verdict of a target with no evidence; got ${result.status}\n${result.stderr}`);
  assert.equal(result.stderr, "", "a report that was read says nothing on stderr");
  assert.match(result.stdout, /^# Evidence Reconciliation/m);
  const supplied = `\`${target.args[2]} ${target.args[3]}\``;
  assert.ok(result.stdout.includes(supplied), `expected the report to list ${supplied} among its inputs`);
});

Then("the refusal names the input it could not read and the path", function () {
  assert.ok(result.stderr.includes(target.where), `expected stderr to name ${target.where}; got:\n${result.stderr}`);
  assert.ok(result.stderr.includes(target.named), `expected stderr to name ${target.named}; got:\n${result.stderr}`);
});

Then("the refusal names the feature corpus read by default and the working directory's read failure", function () {
  assert.ok(
    result.stderr.startsWith(`${target.where} could not be read: ${target.named} (`),
    `expected stderr to name the feature corpus read by default; got:\n${result.stderr}`,
  );
  assert.match(result.stderr, /uv_cwd/, `expected the working directory's read failure; got:\n${result.stderr}`);
});

Then("the refusal says the tool was not permitted to read it", function () {
  assert.match(result.stderr, /could not be read/, `expected the refusal to say the input could not be read; got:\n${result.stderr}`);
  assert.match(result.stderr, /EACCES|EPERM/, `expected the operating system's reason; got:\n${result.stderr}`);
});

After(function () {
  for (const directory of temporaryDirectories.splice(0)) {
    for (const entry of ["features", join("features", "area"), "workflows", "surefire-reports"]) {
      const path = join(directory, entry);
      if (existsSync(path)) chmodSync(path, 0o755);
    }
    for (const entry of [join("features", "target.feature"), "ci.yml", "package.json", "vitest.json"]) {
      const path = join(directory, entry);
      if (existsSync(path)) chmodSync(path, 0o644);
    }
    rmSync(directory, { recursive: true, force: true });
  }
});
