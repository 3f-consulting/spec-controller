import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";
import { temporaryDirectory } from "./support/temporaryDirectory.js";

const RUN_ID = "r1";
const USAGE = 2;

const KEPT_RUN_ARGS = [
  "--features",
  "tests/fixtures/balanced/features",
  "--vitest",
  "tests/fixtures/balanced/vitest.json",
  "--package-json",
  "tests/fixtures/balanced/package.json",
];

interface Run {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

let storeRoot: string;
let filesBefore: Map<string, string>;
let run: Run;

function specController(args: readonly string[]): Run {
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, ...args], { encoding: "utf8" });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function filesUnder(dir: string): Map<string, string> {
  const files = new Map<string, string>();
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const path = join(entry.parentPath, entry.name);
    files.set(path.slice(dir.length), readFileSync(path, "utf8"));
  }
  return files;
}

Given(/^a run store holding (nothing yet|an earlier kept run under the same run-id)$/, function (earlier: string) {
  const scratch = temporaryDirectory("spec-controller-stored-run-");
  storeRoot = join(scratch, "store");
  if (earlier !== "nothing yet") {
    const earlierRun = specController(["--store", storeRoot, "--run-id", RUN_ID, "balance", ...KEPT_RUN_ARGS]);
    const kept = filesUnder(storeRoot);
    assert.deepEqual(
      [...kept.keys()].map((path) => path.split("/").pop()).sort(),
      ["run.yaml", "spec-reconciliation.json", "spec-reconciliation.md"],
      `the earlier kept run did not keep its run:\n${earlierRun.stderr}`,
    );
  }
  filesBefore = filesUnder(storeRoot);
});

When("the operator stores a balance run under that run-id with a flag balance does not accept", function () {
  run = specController(["--store", storeRoot, "--run-id", RUN_ID, "balance", ...KEPT_RUN_ARGS, "--bogus"]);
});

Then("the stored run is refused as a usage error, never reported as a verdict", function () {
  assert.equal(run.status, USAGE, `expected the usage code; got ${run.status}\n${run.stderr}`);
  assert.match(run.stderr, /--bogus/, `the refusal does not name the flag:\n${run.stderr}`);
});

Then("the stored run announces no run directory", function () {
  assert.ok(!run.stdout.includes(storeRoot), `a run directory was announced:\n${run.stdout}`);
});

Then("the refused run added, changed or removed no file under the run store", function () {
  assert.deepEqual(filesUnder(storeRoot), filesBefore);
});

const HELP_NAME: Readonly<Record<string, string>> = { long: "--help", short: "-h" };

let rootBefore: { exists: boolean; isFile: boolean; bytes: string | undefined };

Given(/^a run store that is (not yet made|a regular file)$/, function (root: string) {
  const scratch = temporaryDirectory("spec-controller-stored-help-");
  storeRoot = join(scratch, "store");
  if (root === "a regular file") writeFileSync(storeRoot, "not a directory\n");
  rootBefore = snapshotRoot();
});

When(/^the operator asks for balance's help by its (long|short) name under that run store$/, function (name: string) {
  run = specController(["--store", storeRoot, "--run-id", RUN_ID, "balance", HELP_NAME[name] ?? name]);
});

Then("the help is answered, as it is with no run store", function () {
  const bare = specController(["balance", "--help"]);
  assert.equal(run.status, 0, `expected the help's status; got ${run.status}\n${run.stderr}`);
  assert.equal(run.stderr, "", `the help wrote to stderr:\n${run.stderr}`);
  assert.equal(run.stdout, bare.stdout, "the stored help differs from the help with no store root");
});

Then("the run store is as it was before the run", function () {
  assert.deepEqual(snapshotRoot(), rootBefore);
});

function snapshotRoot(): { exists: boolean; isFile: boolean; bytes: string | undefined } {
  if (!existsSync(storeRoot)) return { exists: false, isFile: false, bytes: undefined };
  const isFile = statSync(storeRoot).isFile();
  return { exists: true, isFile, bytes: isFile ? readFileSync(storeRoot, "utf8") : undefined };
}

const BESIDE: Readonly<Record<string, readonly string[]>> = {
  "with nothing else": [],
  strictly: ["--strict"],
  "with a failing verdict zeroed": ["--exit-zero"],
};

let savedReport: string;
let invocation: readonly string[];

Given(/^a saved reconciliation that is (of an out-of-balance run|at a path that is missing)$/, function (saved: string) {
  const scratch = temporaryDirectory("spec-controller-stored-rerender-");
  storeRoot = join(scratch, "store");
  savedReport = join(scratch, "saved.json");
  if (saved === "at a path that is missing") return;
  const live = specController(["balance", "--features", "tests/fixtures/balanced/features", "--format", `json:${savedReport}`]);
  assert.equal(live.status, 1, `expected the saved run out of balance; got ${live.status}\n${live.stderr}`);
});

When(/^the operator asks for it to be re-rendered under a run store (.+)$/, function (beside: string) {
  const flags = BESIDE[beside];
  assert.ok(flags !== undefined, `no flags for "${beside}"`);
  invocation = ["--store", storeRoot, "--run-id", RUN_ID, "balance", "--render-from-json", savedReport, ...flags];
  run = specController(invocation);
});

Then("the re-render is refused as a usage error, naming the store as what it cannot take", function () {
  assert.equal(run.status, USAGE, `expected the usage code; got ${run.status}\n${run.stderr}`);
  assert.match(run.stderr, /--store\b/, `the refusal does not name --store:\n${run.stderr}`);
});

Then("the refusal names no flag the operator did not give", function () {
  const named = run.stderr.match(/--[a-z][a-z-]*/g) ?? [];
  const notGiven = named.filter((flag) => !invocation.includes(flag));
  assert.deepEqual(notGiven, [], `the refusal names flags the operator did not give:\n${run.stderr}`);
});

Then("the stored re-render produces no report", function () {
  assert.equal(run.stdout, "", `a report reached stdout:\n${run.stdout.slice(0, 400)}`);
});

Then("no run store is made", function () {
  assert.ok(!existsSync(storeRoot), `the store root was made: ${storeRoot}`);
});
