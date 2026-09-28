import { After, Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, closeSync, existsSync, linkSync, lstatSync, readlinkSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
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

After({ tags: "@SCN-FMT-008 or @SCN-FMT-009 or @SCN-FMT-010 or @SCN-FMT-011 or @SCN-FMT-012 or @SCN-RMG-008 or @SCN-RMG-009 or @SCN-RMG-010" }, function () {
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

/** The report file two outputs share, the second path to it, and each destination's bytes before the run. */
let sharedFile: string;
let secondPath: string;
let firstPath: string;
let thirdPath: string;
let throughStdout = false;
let sharedBefore: string | undefined;
let namedOutputs: readonly [string, string];

/** Each second path to the report file, built beside it; the first path is the one the operator names first. */
const SECOND_PATH: Readonly<Record<string, (file: string, dir: string) => { first: string; second: string }>> = {
  "the same path": (file) => ({ first: file, second: file }),
  "the path spelled from the current folder": (file) => ({ first: file, second: `./${relative(process.cwd(), file)}` }),
  "its absolute path": (file) => ({ first: relative(process.cwd(), file), second: file }),
  "a path through a sibling folder and back": (file, dir) => {
    mkdirSync(join(dir, "sibling"));
    return { first: file, second: `${dir}/sibling/../shared.out` };
  },
  "a symbolic link to it": (file, dir) => {
    symlinkSync(file, join(dir, "link.out"));
    return { first: file, second: join(dir, "link.out") };
  },
  "a path through a link to its folder": (file) => {
    symlinkSync(join(scratch!, "dir"), join(scratch!, "dir-link"));
    return { first: file, second: join(scratch!, "dir-link", "shared.out") };
  },
  "a hard link to it": (file, dir) => {
    linkSync(file, join(dir, "hard.out"));
    return { first: file, second: join(dir, "hard.out") };
  },
  "where standard output is redirected": (file) => ({ first: file, second: file }),
};

Given(/^an out-of-balance target and a report file that (does not exist|holds an earlier run)$/, function (state: string) {
  assertTargetOutOfBalance();
  scratch = mkdtempSync(join(tmpdir(), "spec-controller-shared-"));
  mkdirSync(join(scratch, "dir"));
  sharedFile = join(scratch, "dir", "shared.out");
  thirdPath = join(scratch, "dir", "third.json");
  sharedBefore = state === "holds an earlier run" ? "an earlier run's report\n" : undefined;
  if (sharedBefore !== undefined) writeFileSync(sharedFile, sharedBefore);
});

Given(/^a second path to that file that is (.+)$/, function (alias: string) {
  const arrange = SECOND_PATH[alias];
  assert.ok(arrange, `no second path is arranged for "${alias}"`);
  ({ first: firstPath, second: secondPath } = arrange(sharedFile, join(scratch!, "dir")));
  throughStdout = alias === "where standard output is redirected";
});

When(
  /^the operator asks for the (markdown|json) report at the file and the (markdown|json) report at the second path, and a third report at a file of its own$/,
  function (first: string, second: string) {
    const firstFlag = FORMAT_FLAG[first]!;
    const firstSpec = throughStdout ? firstFlag : `${firstFlag}:${firstPath}`;
    const secondSpec = `${FORMAT_FLAG[second]}:${secondPath}`;
    namedOutputs = [throughStdout ? `${firstFlag} on standard output` : firstSpec, secondSpec];
    const args = ["balance", ...TARGET_ARGS, ...[firstSpec, secondSpec, `json:${thirdPath}`].flatMap((spec) => ["--format", spec])];
    run = throughStdout ? specControllerInto(sharedFile, args) : specController(args);
  },
);

/** Runs the CLI with its standard output appended to `file`, as a shell's `>>` would. */
function specControllerInto(file: string, args: readonly string[]): Run {
  const fd = openSync(file, "a");
  try {
    const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, ...args], { cwd: process.cwd(), encoding: "utf8", stdio: ["ignore", fd, "pipe"] });
    assert.equal(result.error, undefined, `the CLI failed to spawn: ${result.error?.message}`);
    return { status: result.status, stdout: "", stderr: result.stderr };
  } finally {
    closeSync(fd);
  }
}

Then("the refusal names both outputs that share the file", function () {
  for (const output of namedOutputs) {
    assert.ok(run.stderr.includes(output), `the refusal does not name ${output}:\n${run.stderr}`);
  }
});

Then("every destination is left exactly as it was", function () {
  if (sharedBefore === undefined) {
    assert.equal(existsSync(sharedFile), false, `${sharedFile} was created by a refused run`);
  } else {
    assert.equal(readFileSync(sharedFile, "utf8"), sharedBefore, `${sharedFile} was overwritten by a refused run`);
  }
  assert.equal(existsSync(thirdPath), false, `${thirdPath} was created by a refused run`);
});

/** Where standard output goes for a run; undefined while it is a pipe the step reads. */
let stdoutFile: string | undefined;

Given(/^an out-of-balance target whose standard output is (a pipe|a file)$/, function (connectedTo: string) {
  assertTargetOutOfBalance();
  scratch = mkdtempSync(join(tmpdir(), "spec-controller-stdout-path-"));
  stdoutFile = connectedTo === "a file" ? join(scratch, "stdout.txt") : undefined;
});

/** The `--format` spec that asks for `fmt` at a destination the scenario names. */
function specAt(fmt: string, destination: string): string {
  if (destination === "standard output") return fmt;
  if (destination === "a link to /dev/stdout") {
    const link = join(scratch!, "to-stdout");
    if (!existsSync(link)) symlinkSync("/dev/stdout", link);
    return `${fmt}:${link}`;
  }
  return `${fmt}:${destination}`;
}

const STDOUT_DESTINATION = "(standard output|/dev/stdout|/dev/fd/1|a link to /dev/stdout)";

When(new RegExp(`^the operator asks for the markdown report at ${STDOUT_DESTINATION} and the json report at ${STDOUT_DESTINATION}$`), function (first: string, second: string) {
  const args = ["balance", ...TARGET_ARGS, "--format", specAt("md", first), "--format", specAt("json", second)];
  if (stdoutFile === undefined) {
    run = specController(args);
    return;
  }
  writeFileSync(stdoutFile, "");
  run = specControllerInto(stdoutFile, args);
});

Then("the refusal says more than one output routes to standard output", function () {
  assert.ok(run.stderr.includes("More than one output routes to stdout"), `the refusal does not say so:\n${run.stderr}`);
});

Then("no report reaches standard output", function () {
  const printed = stdoutFile === undefined ? run.stdout : readFileSync(stdoutFile, "utf8");
  assert.equal(printed, "", `a report reached standard output:\n${printed.slice(0, 400)}`);
});

/** A target that reconciles in balance on its own, read with no workflows, so its run exits on the balanced code. */
const BALANCED_ARGS = [
  "--features",
  "tests/fixtures/balanced/features",
  "--vitest",
  "tests/fixtures/balanced/vitest.json",
  "--package-json",
  "tests/fixtures/balanced/package.json",
  "--ci",
  "tests/fixtures/balanced",
];
const BALANCED = 0;

let linkPath: string;
let linkTargetPath: string;

Given("a balanced target and a link to a report file that does not exist yet", function () {
  scratch = mkdtempSync(join(tmpdir(), "spec-controller-link-"));
  linkTargetPath = join(scratch, "report.json");
  linkPath = join(scratch, "link.json");
  symlinkSync(linkTargetPath, linkPath);
});

When("the operator asks for the json report to be written at the link", function () {
  run = specController(["balance", ...BALANCED_ARGS, "--format", `json:${linkPath}`]);
});

Then("the run succeeds and nothing is refused", function () {
  assert.equal(run.status, BALANCED, `expected the balanced code; got ${run.status}\n${run.stderr}`);
  assert.equal(run.stderr, "", `something reached stderr:\n${run.stderr}`);
});

Then("the json report is written into the file the link points to, and the link still points there", function () {
  assert.ok(existsSync(linkTargetPath), `${linkTargetPath} was not written`);
  assert.match(readFileSync(linkTargetPath, "utf8"), /^\{/, `${linkTargetPath} does not hold the json report`);
  assert.ok(lstatSync(linkPath).isSymbolicLink(), `${linkPath} is no longer a link`);
  assert.equal(readlinkSync(linkPath), linkTargetPath, `${linkPath} no longer points at ${linkTargetPath}`);
});

/** Every file under the store root, with its bytes, as it stood before the stored run. */
let storeBefore: ReadonlyMap<string, string>;

function filesUnder(root: string): Map<string, string> {
  const files = new Map<string, string>();
  if (!existsSync(root)) return files;
  for (const entry of readdirSync(root, { recursive: true })) {
    const path = join(root, String(entry));
    if (statSync(path).isFile()) files.set(path, readFileSync(path, "utf8"));
  }
  return files;
}

Given(/^an out-of-balance target and a store root holding (nothing yet|an earlier kept run under the same run-id)$/, function (earlier: string) {
  assertTargetOutOfBalance();
  scratch = mkdtempSync(join(tmpdir(), "spec-controller-store-shared-"));
  storeRoot = join(scratch, "store");
  if (earlier !== "nothing yet") {
    const kept = specController(["--store", storeRoot, "--run-id", RUN_ID, "balance", ...TARGET_ARGS]);
    assert.equal(kept.status, OUT_OF_BALANCE, `the earlier kept run did not complete:\n${kept.stderr}`);
    assert.ok(existsSync(join(storeRoot, TARGET, RUN_ID, "run.yaml")), "the earlier kept run left no run.yaml");
  }
  storeBefore = filesUnder(storeRoot);
});

When(/^the operator stores a run of it and also asks for the (markdown|json) report at the run directory's (.+)$/, function (format: string, file: string) {
  const path = join(storeRoot, TARGET, RUN_ID, file);
  run = specController(["--store", storeRoot, "--run-id", RUN_ID, "balance", ...TARGET_ARGS, "--format", `${FORMAT_FLAG[format]}:${path}`]);
});

Then(/^the refusal names the run directory's (spec-reconciliation\.md|spec-reconciliation\.json|run\.yaml)$/, function (file: string) {
  const path = join(storeRoot, TARGET, RUN_ID, file);
  assert.ok(run.stderr.includes(path), `the refusal does not name ${path}:\n${run.stderr}`);
});

Then("no file under the store root was added, changed or removed", function () {
  assert.deepEqual(filesUnder(storeRoot), storeBefore, "the refused stored run changed the files under the store root");
});
