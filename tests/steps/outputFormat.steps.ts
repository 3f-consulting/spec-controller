import { Given, When, Then, After } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

const FIXTURE = {
  features: "tests/fixtures/evidence-observation/features",
  vitest: "tests/fixtures/evidence-observation/vitest.json",
  cucumber: "tests/fixtures/evidence-observation/cucumber.json",
};

let fmt003FilePath: string;
let fmt003Run: SpawnSyncReturns<string>;

let corpusCwd: string;
let fmt005Result: SpawnSyncReturns<string>;

let fmt006Cwd: string;
let fmt006JsonPath: string;
let fmt006Result: SpawnSyncReturns<string>;

let fmt007Cwd: string;
let fmt007Result: SpawnSyncReturns<string>;

When("the operator asks the built CLI for the markdown report in a file", function () {
  const repoRoot = process.cwd();
  const abs = (p: string): string => join(repoRoot, p);
  fmt003FilePath = join(corpusCwd, "spec-reconciliation.md");
  fmt003Run = spawnSync(
    NODE,
    [
      ...SPEC_CONTROLLER_ARGV,
      "balance",
      "--features", abs(FIXTURE.features),
      "--vitest", abs(FIXTURE.vitest),
      "--cucumber", abs(FIXTURE.cucumber),
      "--target", "evidence observation-fixture",
      "--format", `md:${fmt003FilePath}`,
    ],
    { cwd: corpusCwd, encoding: "utf8" }
  );
});

Then("the markdown report is in that file, and the run prints nothing", function () {
  assert.equal(fmt003Run.error, undefined, `the CLI subprocess failed to spawn: ${fmt003Run.error?.message}`);
  assert.equal(
    fmt003Run.status,
    1,
    `expected exit 1 (the fixture is out of balance); got ${fmt003Run.status}\n${fmt003Run.stderr}`
  );
  assert.ok(existsSync(fmt003FilePath), `expected the markdown report at ${fmt003FilePath}; it does not exist`);
  const report = readFileSync(fmt003FilePath, "utf8");
  assert.match(report, /^## Run provenance$/m, `expected the markdown report in the file; got:\n${report}`);
  assert.match(report, /^\| Scenario \|/m, `expected the scenario ledger in the file; got:\n${report}`);
  assert.equal(fmt003Run.stdout, "", `expected nothing on stdout; got:\n${fmt003Run.stdout}`);
});

After({ tags: "@SCN-FMT-003" }, function () {
  if (corpusCwd && existsSync(corpusCwd)) rmSync(corpusCwd, { recursive: true, force: true });
});

Given("a target corpus to reconcile", function () {
  corpusCwd = mkdtempSync(join(tmpdir(), "spec-controller-corpus-"));
  assert.ok(
    existsSync(join(process.cwd(), FIXTURE.features)),
    "the reconcilable fixture features dir is missing"
  );
});

When("the CLI is run with --format md and --format json", function () {
  const repoRoot = process.cwd();
  const abs = (p: string): string => join(repoRoot, p);
  fmt005Result = spawnSync(
    NODE,
    [
      ...SPEC_CONTROLLER_ARGV,
      "balance",
      "--features", abs(FIXTURE.features),
      "--vitest", abs(FIXTURE.vitest),
      "--cucumber", abs(FIXTURE.cucumber),
      "--target", "evidence observation-fixture",
      "--format", "md",
      "--format", "json",
    ],
    { cwd: corpusCwd, encoding: "utf8" }
  );
});

Then("the CLI exits non-zero", function () {
  assert.equal(
    fmt005Result.error,
    undefined,
    `expected the CLI subprocess to run; it failed to spawn: ${fmt005Result.error?.message}`
  );
  assert.notEqual(
    fmt005Result.status,
    0,
    `expected a non-zero exit rejecting two outputs both routed to stdout; got exit ${fmt005Result.status}\n` +
      `stdout:\n${fmt005Result.stdout}\nstderr:\n${fmt005Result.stderr}`
  );
});

Then("stderr hints to give one of the outputs a :<path>", function () {
  const stderr = fmt005Result.stderr ?? "";
  assert.match(
    stderr,
    /stdout/i,
    `expected stderr to explain the stdout collision; got:\n${stderr}`
  );
  assert.match(
    stderr,
    /:<path>/,
    `expected stderr to hint at giving one output a :<path>; got:\n${stderr}`
  );
});

After({ tags: "@SCN-FMT-005" }, function () {
  if (corpusCwd && existsSync(corpusCwd)) rmSync(corpusCwd, { recursive: true, force: true });
});

Given("a target corpus to reconcile with a legacy --json destination", function () {
  fmt006Cwd = mkdtempSync(join(tmpdir(), "spec-controller-fmt006-"));
  fmt006JsonPath = join(fmt006Cwd, "out.json");
  assert.ok(
    existsSync(join(process.cwd(), FIXTURE.features)),
    "the reconcilable fixture features dir is missing"
  );
});

When("the CLI is run with the removed --json flag", function () {
  const repoRoot = process.cwd();
  const abs = (p: string): string => join(repoRoot, p);
  fmt006Result = spawnSync(
    NODE,
    [
      ...SPEC_CONTROLLER_ARGV,
      "balance",
      "--features", abs(FIXTURE.features),
      "--vitest", abs(FIXTURE.vitest),
      "--cucumber", abs(FIXTURE.cucumber),
      "--target", "evidence observation-fixture",
      "--json", fmt006JsonPath,
    ],
    { cwd: fmt006Cwd, encoding: "utf8" }
  );
});

Then("the CLI exits non-zero and does not create the --json file", function () {
  assert.equal(
    fmt006Result.error,
    undefined,
    `expected the CLI subprocess to run; it failed to spawn: ${fmt006Result.error?.message}`
  );
  assert.notEqual(
    fmt006Result.status,
    0,
    `expected a non-zero exit rejecting the removed --json flag; got exit ${fmt006Result.status}\n` +
      `stdout:\n${fmt006Result.stdout}\nstderr:\n${fmt006Result.stderr}`
  );
  assert.ok(
    !existsSync(fmt006JsonPath),
    `expected the removed --json flag NOT to write ${fmt006JsonPath}; the file exists (the legacy write path is still live)`
  );
});

Then("stderr hints to use --format json:<path>", function () {
  const stderr = fmt006Result.stderr ?? "";
  assert.match(
    stderr,
    /--format json:<path>/,
    `expected stderr to hint at using --format json:<path>; got:\n${stderr}`
  );
});

After({ tags: "@SCN-FMT-006" }, function () {
  if (fmt006Cwd && existsSync(fmt006Cwd)) rmSync(fmt006Cwd, { recursive: true, force: true });
});

Given("a target corpus to reconcile with an unsupported --format", function () {
  fmt007Cwd = mkdtempSync(join(tmpdir(), "spec-controller-fmt007-"));
  assert.ok(
    existsSync(join(process.cwd(), FIXTURE.features)),
    "the reconcilable fixture features dir is missing"
  );
});

When("the CLI is run with --format xml", function () {
  const repoRoot = process.cwd();
  const abs = (p: string): string => join(repoRoot, p);
  fmt007Result = spawnSync(
    NODE,
    [
      ...SPEC_CONTROLLER_ARGV,
      "balance",
      "--features", abs(FIXTURE.features),
      "--vitest", abs(FIXTURE.vitest),
      "--cucumber", abs(FIXTURE.cucumber),
      "--target", "evidence observation-fixture",
      "--format", "xml",
    ],
    { cwd: fmt007Cwd, encoding: "utf8" }
  );
});

Then("the CLI exits non-zero rejecting the unknown format", function () {
  assert.equal(
    fmt007Result.error,
    undefined,
    `expected the CLI subprocess to run; it failed to spawn: ${fmt007Result.error?.message}`
  );
  assert.notEqual(
    fmt007Result.status,
    0,
    `expected a non-zero exit rejecting the unknown format xml; got exit ${fmt007Result.status}\n` +
      `stdout:\n${fmt007Result.stdout}\nstderr:\n${fmt007Result.stderr}`
  );
});

Then("stderr lists the supported formats md and json", function () {
  const stderr = fmt007Result.stderr ?? "";
  assert.match(
    stderr,
    /\bmd\b/,
    `expected stderr to list md as a supported format; got:\n${stderr}`
  );
  assert.match(
    stderr,
    /\bjson\b/,
    `expected stderr to list json as a supported format; got:\n${stderr}`
  );
});

After({ tags: "@SCN-FMT-007" }, function () {
  if (fmt007Cwd && existsSync(fmt007Cwd)) rmSync(fmt007Cwd, { recursive: true, force: true });
});
