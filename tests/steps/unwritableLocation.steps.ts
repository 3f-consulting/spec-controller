import { After, Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

const RUN_ID = "r1";
const TARGET = "unwritable";

const TARGET_ARGS = [
  "--features",
  "tests/fixtures/evidence-observation/features",
  "--vitest",
  "tests/fixtures/evidence-observation/vitest.json",
  "--target",
  TARGET,
];

/** The status the target reconciles to on its own: out of balance. */
const OUT_OF_BALANCE = 1;
const USAGE = 2;

/** Each reason the scenarios name, as the operating system spells it. */
const REASON_CODE: Readonly<Record<string, string>> = {
  "permission was denied": "EACCES",
  "a parent is not a directory": "ENOTDIR",
  "the destination is a directory": "EISDIR",
  "the parent does not exist": "ENOENT",
  "the location already exists": "EEXIST",
};

/** Each store root a run directory cannot be created under, built under a scratch directory. */
const STORE_ROOT: Readonly<Record<string, (dir: string) => string>> = {
  "a regular file": (dir) => {
    writeFileSync(join(dir, "regular"), "");
    return join(dir, "regular");
  },
  "a path under a regular file": (dir) => {
    writeFileSync(join(dir, "regular"), "");
    return join(dir, "regular", "store");
  },
  "a directory it may not write": (dir) => {
    mkdirSync(join(dir, "read-only"));
    chmodSync(join(dir, "read-only"), 0o555);
    return join(dir, "read-only");
  },
  "a path under a directory it may not write": (dir) => {
    mkdirSync(join(dir, "read-only"));
    chmodSync(join(dir, "read-only"), 0o555);
    return join(dir, "read-only", "store");
  },
  "a root whose run directory is a file": (dir) => {
    mkdirSync(join(dir, "store", TARGET), { recursive: true });
    writeFileSync(join(dir, "store", TARGET, RUN_ID), "");
    return join(dir, "store");
  },
};

/** Each obstacle a run directory can already hold, built into `<root>/<target>/<run-id>`. */
const RUN_DIRECTORY_OBSTACLE: Readonly<Record<string, (runDir: string) => void>> = {
  "nothing it may write into": (runDir) => chmodSync(runDir, 0o555),
  "a directory named spec-reconciliation.md": (runDir) => mkdirSync(join(runDir, "spec-reconciliation.md")),
  "a directory named spec-reconciliation.json": (runDir) => mkdirSync(join(runDir, "spec-reconciliation.json")),
  "a directory named run.yaml": (runDir) => mkdirSync(join(runDir, "run.yaml")),
  "a run.yaml it may not write": (runDir) => {
    writeFileSync(join(runDir, "run.yaml"), "an earlier run's manifest\n");
    chmodSync(join(runDir, "run.yaml"), 0o444);
  },
};

const FORMAT_FLAG: Readonly<Record<string, string>> = { json: "json", markdown: "md" };

/** Each unwritable destination the scenarios name, built under a scratch directory. */
const DESTINATION: Readonly<Record<string, (dir: string) => string>> = {
  "a read-only file": (dir) => {
    const path = join(dir, "read-only.json");
    writeFileSync(path, "earlier\n");
    chmodSync(path, 0o444);
    return path;
  },
  "a path under a regular file": (dir) => {
    writeFileSync(join(dir, "regular"), "");
    return join(dir, "regular", "report.json");
  },
  "a file in a directory it may not write": (dir) => {
    const readOnly = join(dir, "read-only");
    mkdirSync(readOnly);
    chmodSync(readOnly, 0o555);
    return join(readOnly, "report.json");
  },
  "an existing directory": (dir) => {
    const path = join(dir, "a-directory");
    mkdirSync(path);
    return path;
  },
  "a file whose parent directory does not exist": (dir) => join(dir, "missing", "report.json"),
};

interface Run {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

let scratch: string | undefined;
let destination: string;
let run: Run;
let targetStatus: number | null | undefined;
let markdownSpec: string;
let storeRoot: string;
let markdownPath: string | undefined;
let markdownBefore: string | undefined;

function specController(args: readonly string[]): Run {
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, ...args], { cwd: process.cwd(), encoding: "utf8" });
  assert.equal(result.error, undefined, `the CLI failed to spawn: ${result.error?.message}`);
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

/** The target's own verdict, read once, so every refusal below is seen to outrank a real 1. */
function assertTargetOutOfBalance(): void {
  targetStatus ??= specController(["balance", ...TARGET_ARGS]).status;
  assert.equal(targetStatus, OUT_OF_BALANCE, "the target must reconcile out of balance on its own");
}

function restoreWritable(dir: string): void {
  chmodSync(dir, 0o755);
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) restoreWritable(path);
    else chmodSync(path, 0o644);
  }
}

After({ tags: "@SCN-FMT-008 or @SCN-FMT-009 or @SCN-RMG-008 or @SCN-RMG-009" }, function () {
  if (scratch === undefined) return;
  restoreWritable(scratch);
  rmSync(scratch, { recursive: true, force: true });
  scratch = undefined;
});

Given(/^an out-of-balance target and a report destination that is (.+)$/, function (location: string) {
  assertTargetOutOfBalance();
  const arrange = DESTINATION[location];
  assert.ok(arrange, `no destination is arranged for "${location}"`);
  scratch = mkdtempSync(join(tmpdir(), "spec-controller-unwritable-"));
  destination = arrange(scratch);
});

When(/^the operator asks for the (json|markdown) report to be written to that destination$/, function (format: string) {
  run = specController(["balance", ...TARGET_ARGS, "--format", `${FORMAT_FLAG[format]}:${destination}`]);
});

Then("the run is refused as a usage error, never reported as a verdict", function () {
  assert.equal(run.status, USAGE, `expected the usage code; got ${run.status}\n${run.stderr}`);
});

Then(/^the refusal names the destination and says (.+)$/, function (reason: string) {
  const code = REASON_CODE[reason];
  assert.ok(code, `no operating-system code is named for "${reason}"`);
  assert.ok(run.stderr.includes(destination), `the refusal does not name ${destination}:\n${run.stderr}`);
  assert.ok(run.stderr.includes(code), `the refusal does not give ${code}:\n${run.stderr}`);
});

Then("the refusal carries no stack trace", function () {
  assert.doesNotMatch(run.stderr, /^\s+at /m, `a stack trace reached stderr:\n${run.stderr}`);
  assert.equal(run.stderr.trimEnd().split("\n").length, 1, `the refusal is not one line:\n${run.stderr}`);
});

Then("no report is printed", function () {
  assert.equal(run.stdout, "", `a report reached stdout:\n${run.stdout.slice(0, 400)}`);
});

Given("an out-of-balance target and a json report destination under a regular file", function () {
  assertTargetOutOfBalance();
  scratch = mkdtempSync(join(tmpdir(), "spec-controller-unwritable-"));
  destination = DESTINATION["a path under a regular file"]!(scratch);
});

Given(/^a markdown report destination that is (the terminal|a file that does not exist|a file holding an earlier run)$/, function (markdown: string) {
  const dir = scratch;
  assert.ok(dir !== undefined, "the json destination is arranged first");
  markdownPath = markdown === "the terminal" ? undefined : join(dir, "report.md");
  markdownSpec = markdownPath === undefined ? "md" : `md:${markdownPath}`;
  markdownBefore = undefined;
  if (markdown === "a file holding an earlier run" && markdownPath !== undefined) {
    markdownBefore = "an earlier run's report\n";
    writeFileSync(markdownPath, markdownBefore);
  }
});

When(/^the operator asks for both reports, the (markdown|json) one named first$/, function (first: string) {
  const json = `json:${destination}`;
  const formats = first === "markdown" ? [markdownSpec, json] : [json, markdownSpec];
  run = specController(["balance", ...TARGET_ARGS, ...formats.flatMap((spec) => ["--format", spec])]);
});

Then("the markdown report destination is left exactly as it was", function () {
  if (markdownPath === undefined) return;
  if (markdownBefore === undefined) {
    assert.equal(existsSync(markdownPath), false, `${markdownPath} was created by a refused run`);
  } else {
    assert.equal(readFileSync(markdownPath, "utf8"), markdownBefore, `${markdownPath} was overwritten by a refused run`);
  }
});

Given(/^an out-of-balance target and a store root that is (.+)$/, function (location: string) {
  assertTargetOutOfBalance();
  const arrange = STORE_ROOT[location];
  assert.ok(arrange, `no store root is arranged for "${location}"`);
  scratch = mkdtempSync(join(tmpdir(), "spec-controller-unwritable-"));
  storeRoot = arrange(scratch);
});

When("the operator stores a run of it under that root", function () {
  run = specController(["--store", storeRoot, "--run-id", RUN_ID, "balance", ...TARGET_ARGS]);
});

Then(/^the refusal names the run directory and says (.+)$/, function (reason: string) {
  const code = REASON_CODE[reason];
  assert.ok(code, `no operating-system code is named for "${reason}"`);
  const runDir = join(storeRoot, TARGET, RUN_ID);
  assert.ok(run.stderr.includes(runDir), `the refusal does not name ${runDir}:\n${run.stderr}`);
  assert.ok(run.stderr.includes(code), `the refusal does not give ${code}:\n${run.stderr}`);
});

Then("no run directory is announced", function () {
  assert.equal(run.stdout, "", `stdout announced something:\n${run.stdout}`);
});

Given(/^an out-of-balance target and a store root whose run directory already holds (.+)$/, function (obstacle: string) {
  assertTargetOutOfBalance();
  const arrange = RUN_DIRECTORY_OBSTACLE[obstacle];
  assert.ok(arrange, `no obstacle is arranged for "${obstacle}"`);
  scratch = mkdtempSync(join(tmpdir(), "spec-controller-unwritable-"));
  storeRoot = join(scratch, "store");
  const runDir = join(storeRoot, TARGET, RUN_ID);
  mkdirSync(runDir, { recursive: true });
  arrange(runDir);
});

Then(/^the refusal names the run directory's (.+) and says (.+)$/, function (file: string, reason: string) {
  const code = REASON_CODE[reason];
  assert.ok(code, `no operating-system code is named for "${reason}"`);
  const path = join(storeRoot, TARGET, RUN_ID, file);
  assert.ok(run.stderr.includes(path), `the refusal does not name ${path}:\n${run.stderr}`);
  assert.ok(run.stderr.includes(code), `the refusal does not give ${code}:\n${run.stderr}`);
});
