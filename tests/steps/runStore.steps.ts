import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, realpathSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { parse } from "yaml";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";
import { assertTargetOutOfBalance, BALANCED_ARGS, TARGET, TARGET_ARGS } from "./support/outOfBalanceTarget.js";
import { REASON_CODE } from "./support/refusalReason.js";
import { FORMAT_FLAG } from "./support/reportFormat.js";
import { BALANCED, OUT_OF_BALANCE, RUN_ID, specController, USAGE } from "./support/specControllerRun.js";
import { STORED_RUN_FILE_INTENT, storedRunFile } from "./support/storedRunFile.js";
import { temporaryDirectory } from "./support/temporaryDirectory.js";
import type { CommandRun, SpecControllerWorld } from "./support/world.js";

const FIXTURE = {
  features: "tests/fixtures/evidence-observation/features",
  vitest: "tests/fixtures/evidence-observation/vitest.json",
};

const DEMO_TARGET = "demo-store";

Given("a reconcilable target and a run store outside the repo", function (this: SpecControllerWorld) {
  const root = process.cwd();
  assert.ok(existsSync(join(root, FIXTURE.features)), `missing fixture features: ${FIXTURE.features}`);
  assert.ok(existsSync(join(root, FIXTURE.vitest)), `missing fixture vitest report: ${FIXTURE.vitest}`);
  this.storeRoot = temporaryDirectory(this, "spec-controller-rmg004-");
});

When("the operator runs balance under the store modifier and the run-name modifier", function (this: SpecControllerWorld) {
  const root = process.cwd();
  this.balanceResult = spawnSync(
    NODE,
    [
      ...SPEC_CONTROLLER_ARGV,
      "--store",
      this.storeRoot,
      "--run-id",
      RUN_ID,
      "balance",
      "--features",
      FIXTURE.features,
      "--vitest",
      FIXTURE.vitest,
      "--target",
      DEMO_TARGET,
    ],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(this.balanceResult.error, undefined, `CLI failed to spawn: ${this.balanceResult.error?.message}`);
  this.runDir = join(this.storeRoot, DEMO_TARGET, RUN_ID);
});

Then("the stored run ends on the out-of-balance verdict", function (this: SpecControllerWorld) {
  assert.equal(this.balanceResult.status, 1, `expected exit 1 (out-of-balance); got ${this.balanceResult.status}\n${this.balanceResult.stderr}`);
});

Then("a run directory named for the target and run-id exists under the run store", function (this: SpecControllerWorld) {
  assert.ok(existsSync(this.runDir), `expected run directory at ${this.runDir}`);
});

Then("that run directory holds the saved reconciliation, in markdown and in JSON, and the run manifest", function (this: SpecControllerWorld) {
  for (const name of ["spec-reconciliation.md", "spec-reconciliation.json", "run.yaml"]) {
    assert.ok(existsSync(join(this.runDir, name)), `expected ${name} in ${this.runDir}`);
  }
});

Then("the run manifest reads mode balance, the target, and the run-id", function (this: SpecControllerWorld) {
  const manifest = parse(readFileSync(join(this.runDir, "run.yaml"), "utf8")) as Record<string, unknown>;
  assert.equal(manifest["schema_version"], 2);
  assert.equal(manifest["mode"], "balance");
  assert.equal(manifest["target"], DEMO_TARGET);
  assert.equal(manifest["run_id"], RUN_ID);
});

const KEPT_RUN_ARGS = [
  "--features",
  "tests/fixtures/balanced/features",
  "--vitest",
  "tests/fixtures/balanced/vitest.json",
  "--package-json",
  "tests/fixtures/balanced/package.json",
];

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

Given(/^a run store holding (nothing yet|an earlier kept run under the same run-id)$/, function (this: SpecControllerWorld, earlier: string) {
  const scratch = temporaryDirectory(this, "spec-controller-stored-run-");
  this.storeRoot = join(scratch, "store");
  if (earlier !== "nothing yet") {
    const earlierRun = specController(["--store", this.storeRoot, "--run-id", RUN_ID, "balance", ...KEPT_RUN_ARGS]);
    const kept = filesUnder(this.storeRoot);
    assert.deepEqual(
      [...kept.keys()].map((path) => path.split("/").pop()).sort(),
      ["run.yaml", "spec-reconciliation.json", "spec-reconciliation.md"],
      `the earlier kept run did not keep its run:\n${earlierRun.stderr}`,
    );
  }
  this.filesBefore = filesUnder(this.storeRoot);
});

When("the operator stores a balance run under that run-id with a flag balance does not accept", function (this: SpecControllerWorld) {
  this.run = specController(["--store", this.storeRoot, "--run-id", RUN_ID, "balance", ...KEPT_RUN_ARGS, "--bogus"]);
});

Then("the stored run is refused as a usage error, never reported as a verdict", function (this: SpecControllerWorld) {
  assert.equal(this.run.status, USAGE, `expected the usage code; got ${this.run.status}\n${this.run.stderr}`);
  assert.match(this.run.stderr, /--bogus/, `the refusal does not name the flag:\n${this.run.stderr}`);
});

Then("the stored run announces no run directory", function (this: SpecControllerWorld) {
  assert.ok(!this.run.stdout.includes(this.storeRoot), `a run directory was announced:\n${this.run.stdout}`);
});

Then("the refused run added, changed or removed no file under the run store", function (this: SpecControllerWorld) {
  assert.deepEqual(filesUnder(this.storeRoot), this.filesBefore);
});

const HELP_NAME: Readonly<Record<string, string>> = { long: "--help", short: "-h" };

Given(/^a run store that is (not yet made|a regular file)$/, function (this: SpecControllerWorld, root: string) {
  const scratch = temporaryDirectory(this, "spec-controller-stored-help-");
  this.storeRoot = join(scratch, "store");
  if (root === "a regular file") writeFileSync(this.storeRoot, "not a directory\n");
  this.rootBefore = snapshotRoot(this);
});

When(/^the operator asks for balance's help by its (long|short) name under that run store$/, function (this: SpecControllerWorld, name: string) {
  this.run = specController(["--store", this.storeRoot, "--run-id", RUN_ID, "balance", HELP_NAME[name] ?? name]);
});

Then("the help is answered, as it is with no run store", function (this: SpecControllerWorld) {
  const bare = specController(["balance", "--help"]);
  assert.equal(this.run.status, 0, `expected the help's status; got ${this.run.status}\n${this.run.stderr}`);
  assert.equal(this.run.stderr, "", `the help wrote to stderr:\n${this.run.stderr}`);
  assert.equal(this.run.stdout, bare.stdout, "the stored help differs from the help with no store root");
});

Then("the run store is as it was before the run", function (this: SpecControllerWorld) {
  assert.deepEqual(snapshotRoot(this), this.rootBefore);
});

function snapshotRoot(world: SpecControllerWorld): { exists: boolean; isFile: boolean; bytes: string | undefined } {
  if (!existsSync(world.storeRoot)) return { exists: false, isFile: false, bytes: undefined };
  const isFile = statSync(world.storeRoot).isFile();
  return { exists: true, isFile, bytes: isFile ? readFileSync(world.storeRoot, "utf8") : undefined };
}

const TARGET_NAME = "reads-its-own";

const RUN_DIR = join("store", TARGET_NAME, RUN_ID);

const BALANCED_FIXTURE_DIR = join(process.cwd(), "tests", "fixtures", "balanced");

const WORKFLOW = "name: ci\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - run: pnpm test\n";

const MANIFEST = `${JSON.stringify({ name: "stored-input-target", private: true, scripts: { test: "vitest run" }, specController: { runners: { unit: "vitest" } } })}\n`;

const INPUT: Readonly<Record<string, { readonly flag: string; readonly content: (target: string) => string }>> = {
  "cucumber report": { flag: "--cucumber", content: () => "[]\n" },
  "unit test report": { flag: "--vitest", content: (target) => readFileSync(join(target, "vitest.json"), "utf8") },
  "workflow file": { flag: "--ci", content: () => WORKFLOW },
};

function specControllerInTarget(world: SpecControllerWorld, argv: readonly string[]): CommandRun {
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, ...argv], { cwd: world.storedRunTargetDir, encoding: "utf8" });
  assert.equal(result.error, undefined, `the CLI failed to spawn: ${result.error?.message}`);
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function entriesUnder(dir: string): Map<string, string> {
  const entries = new Map<string, string>();
  for (const entry of readdirSync(dir, { recursive: true })) {
    const path = join(dir, String(entry));
    const kind = lstatSync(path);
    if (kind.isSymbolicLink()) entries.set(path, `-> ${readlinkSync(path)}`);
    else if (kind.isFile()) entries.set(path, readFileSync(path, "latin1"));
  }
  return entries;
}

function targetArgs(overrides: Readonly<Record<string, string>>): string[] {
  const flags: Record<string, string> = {
    "--features": "features",
    "--vitest": "vitest.json",
    "--cucumber": "cucumber.json",
    "--ci-steps": "ci-steps.json",
    "--package-json": "package.json",
    "--ci": "ci.yml",
    "--target": TARGET_NAME,
    ...overrides,
  };
  return Object.entries(flags).flat();
}

Given(
  new RegExp(
    `^a balanced target whose (cucumber report|unit test report|workflow file) sits where a stored run of it would write (${STORED_RUN_FILE_INTENT}), over (nothing yet|an earlier kept run under the same run-id)$`,
  ),
  function (this: SpecControllerWorld, input: string, intent: string, earlier: string) {
    const file = storedRunFile(intent);
    this.storedRunTargetDir = join(temporaryDirectory(this, "spec-controller-stored-input-"), "target");
    mkdirSync(join(this.storedRunTargetDir, "features"), { recursive: true });
    copyFileSync(join(BALANCED_FIXTURE_DIR, "features", "target.feature"), join(this.storedRunTargetDir, "features", "target.feature"));
    copyFileSync(join(BALANCED_FIXTURE_DIR, "vitest.json"), join(this.storedRunTargetDir, "vitest.json"));
    writeFileSync(join(this.storedRunTargetDir, "cucumber.json"), "[]\n");
    writeFileSync(join(this.storedRunTargetDir, "ci-steps.json"), "{}\n");
    writeFileSync(join(this.storedRunTargetDir, "package.json"), MANIFEST);
    writeFileSync(join(this.storedRunTargetDir, "ci.yml"), WORKFLOW);
    const store = ["--store", "store", "--run-id", RUN_ID];
    if (earlier === "nothing yet") {
      mkdirSync(join(this.storedRunTargetDir, RUN_DIR), { recursive: true });
      writeFileSync(join(this.storedRunTargetDir, RUN_DIR, file), INPUT[input]!.content(this.storedRunTargetDir));
    } else {
      const kept = specControllerInTarget(this, [...store, "balance", ...targetArgs({})]);
      assert.equal(kept.status, 0, `the earlier kept run did not complete:\n${kept.stderr}`);
    }
    this.namedInput = join(RUN_DIR, file);
    this.invocationArgs = [...store, "balance", ...targetArgs({ [INPUT[input]!.flag]: this.namedInput })];
  },
);

When("the operator stores a run of it reading that input", function (this: SpecControllerWorld) {
  this.storedRunInputsBefore = entriesUnder(this.storedRunTargetDir);
  this.run = specControllerInTarget(this, this.invocationArgs);
});

Then("the stored run is refused as a usage error, naming that file", function (this: SpecControllerWorld) {
  assert.equal(this.run.status, USAGE, `expected the usage code; got ${this.run.status}\n${this.run.stderr}`);
  assert.ok(this.run.stderr.includes(this.namedInput), `the refusal does not name ${this.namedInput}:\n${this.run.stderr}`);
});

Then("its refusal is a single line with no stack trace", function (this: SpecControllerWorld) {
  assert.equal(this.run.stderr.trimEnd().split("\n").length, 1, `the refusal is not one line:\n${this.run.stderr}`);
  assert.doesNotMatch(this.run.stderr, /^\s+at /m, "the refusal carries a stack trace");
});

Then("no kept run is announced", function (this: SpecControllerWorld) {
  assert.equal(this.run.stdout, "", `a kept run was announced:\n${this.run.stdout}`);
});

Then("every file of the target and its store is left exactly as it was", function (this: SpecControllerWorld) {
  assert.deepEqual(entriesUnder(this.storedRunTargetDir), this.storedRunInputsBefore, "the refused stored run added, changed or removed a file");
});

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

const RUN_DIRECTORY_OBSTACLE: Readonly<Record<string, (runDir: string) => void>> = {
  "nothing it may write into": (runDir) => chmodSync(runDir, 0o555),
  "a directory where the saved reconciliation, in markdown, goes": (runDir) => mkdirSync(join(runDir, "spec-reconciliation.md")),
  "a directory where the saved reconciliation, in JSON, goes": (runDir) => mkdirSync(join(runDir, "spec-reconciliation.json")),
};

Given(/^an out-of-balance target and a run store that is (.+)$/, function (this: SpecControllerWorld, location: string) {
  assertTargetOutOfBalance();
  const arrange = STORE_ROOT[location];
  assert.ok(arrange, `no store root is arranged for "${location}"`);
  this.storeScratch = temporaryDirectory(this, "spec-controller-unwritable-");
  this.storeRoot = arrange(this.storeScratch);
});

When("the operator stores a run of it under that run store", function (this: SpecControllerWorld) {
  this.run = specController(["--store", this.storeRoot, "--run-id", RUN_ID, "balance", ...TARGET_ARGS]);
});

Then(/^the refusal names the run directory and says (.+)$/, function (this: SpecControllerWorld, reason: string) {
  const code = REASON_CODE[reason];
  assert.ok(code, `no operating-system code is named for "${reason}"`);
  const runDir = join(this.storeRoot, TARGET, RUN_ID);
  assert.ok(this.run.stderr.includes(runDir), `the refusal does not name ${runDir}:\n${this.run.stderr}`);
  assert.ok(this.run.stderr.includes(code), `the refusal does not give ${code}:\n${this.run.stderr}`);
});

Then("no run directory is announced", function (this: SpecControllerWorld) {
  assert.equal(this.run.stdout, "", `stdout announced something:\n${this.run.stdout}`);
});

Given(/^an out-of-balance target and a run store whose run directory already holds (.+)$/, function (this: SpecControllerWorld, obstacle: string) {
  assertTargetOutOfBalance();
  const arrange = RUN_DIRECTORY_OBSTACLE[obstacle];
  assert.ok(arrange, `no obstacle is arranged for "${obstacle}"`);
  this.storeScratch = temporaryDirectory(this, "spec-controller-unwritable-");
  this.storeRoot = join(this.storeScratch, "store");
  const runDir = join(this.storeRoot, TARGET, RUN_ID);
  mkdirSync(runDir, { recursive: true });
  arrange(runDir);
});

Then(new RegExp(`^the refusal names (${STORED_RUN_FILE_INTENT}) in the run directory and says (.+)$`), function (this: SpecControllerWorld, file: string, reason: string) {
  const code = REASON_CODE[reason];
  assert.ok(code, `no operating-system code is named for "${reason}"`);
  const path = join(this.storeRoot, TARGET, RUN_ID, storedRunFile(file));
  assert.ok(this.run.stderr.includes(path), `the refusal does not name ${path}:\n${this.run.stderr}`);
  assert.ok(this.run.stderr.includes(code), `the refusal does not give ${code}:\n${this.run.stderr}`);
});

function filesByPathUnder(root: string): Map<string, string> {
  const files = new Map<string, string>();
  if (!existsSync(root)) return files;
  for (const entry of readdirSync(root, { recursive: true })) {
    const path = join(root, String(entry));
    if (statSync(path).isFile()) files.set(path, readFileSync(path, "utf8"));
  }
  return files;
}

Given(/^an out-of-balance target and a run store holding (nothing yet|an earlier kept run under the same run-id)$/, function (this: SpecControllerWorld, earlier: string) {
  assertTargetOutOfBalance();
  this.storeScratch = temporaryDirectory(this, "spec-controller-store-shared-");
  this.storeRoot = join(this.storeScratch, "store");
  if (earlier !== "nothing yet") {
    const kept = specController(["--store", this.storeRoot, "--run-id", RUN_ID, "balance", ...TARGET_ARGS]);
    assert.equal(kept.status, OUT_OF_BALANCE, `the earlier kept run did not complete:\n${kept.stderr}`);
    assert.ok(existsSync(join(this.storeRoot, TARGET, RUN_ID, "run.yaml")), "the earlier kept run left no run.yaml");
  }
  this.storeBefore = filesByPathUnder(this.storeRoot);
});

When(new RegExp(`^the operator stores a run of it and also asks for the (markdown|json) report at (${STORED_RUN_FILE_INTENT}) in the run directory$`), function (this: SpecControllerWorld, format: string, file: string) {
  const path = join(this.storeRoot, TARGET, RUN_ID, storedRunFile(file));
  this.run = specController(["--store", this.storeRoot, "--run-id", RUN_ID, "balance", ...TARGET_ARGS, "--format", `${FORMAT_FLAG[format]}:${path}`]);
});

Then(new RegExp(`^the refusal names (${STORED_RUN_FILE_INTENT}) in the run directory$`), function (this: SpecControllerWorld, file: string) {
  const path = join(this.storeRoot, TARGET, RUN_ID, storedRunFile(file));
  assert.ok(this.run.stderr.includes(path), `the refusal does not name ${path}:\n${this.run.stderr}`);
});

Then("no file under the run store was added, changed or removed", function (this: SpecControllerWorld) {
  assert.deepEqual(filesByPathUnder(this.storeRoot), this.storeBefore, "the refused stored run changed the files under the store root");
});

const EARLIER_TARGET = "earlier";

const EARLIER_RUN_ID = "r0";

Given("an out-of-balance target and a run store holding an earlier stored run of a balanced target", function (this: SpecControllerWorld) {
  assertTargetOutOfBalance();
  this.storeScratch = temporaryDirectory(this, "spec-controller-store-earlier-");
  this.storeRoot = join(this.storeScratch, "store");
  const earlier = specController(["--store", this.storeRoot, "--run-id", EARLIER_RUN_ID, "balance", ...BALANCED_ARGS, "--target", EARLIER_TARGET]);
  assert.equal(earlier.status, BALANCED, `the earlier stored run did not complete:\n${earlier.stderr}`);
  assert.ok(existsSync(join(this.storeRoot, EARLIER_TARGET, EARLIER_RUN_ID, "run.yaml")), "the earlier stored run left no run.yaml");
  this.storeBefore = filesByPathUnder(this.storeRoot);
});

function inEarlierRun(world: SpecControllerWorld, file: string): string {
  return join(world.storeRoot, EARLIER_TARGET, EARLIER_RUN_ID, storedRunFile(file));
}

When(
  new RegExp(`^the operator makes (a bare run|a run stored under another run id) of it and also asks for the (markdown|json) report at (${STORED_RUN_FILE_INTENT}) in the earlier run's directory$`),
  function (this: SpecControllerWorld, how: string, format: string, file: string) {
    const formatArgs = ["--format", `${FORMAT_FLAG[format]}:${inEarlierRun(this, file)}`];
    const storeArgs = how === "a bare run" ? [] : ["--store", this.storeRoot, "--run-id", RUN_ID];
    this.run = specController([...storeArgs, "balance", ...TARGET_ARGS, ...formatArgs]);
  },
);

Then(new RegExp(`^the refusal names (${STORED_RUN_FILE_INTENT}) in the earlier run's directory$`), function (this: SpecControllerWorld, file: string) {
  const path = inEarlierRun(this, file);
  assert.ok(this.run.stderr.includes(path), `the refusal does not name ${path}:\n${this.run.stderr}`);
});

Given(new RegExp(`^a link to (${STORED_RUN_FILE_INTENT}) in the earlier run's directory$`), function (this: SpecControllerWorld, file: string) {
  mkdirSync(join(this.storeScratch, "links"));
  this.earlierRunLink = join(this.storeScratch, "links", "report");
  symlinkSync(relative(dirname(this.earlierRunLink), inEarlierRun(this, file)), this.earlierRunLink);
});

Then("the refusal names the link and the earlier run's directory", function (this: SpecControllerWorld) {
  const earlierRunDir = realpathSync(join(this.storeRoot, EARLIER_TARGET, EARLIER_RUN_ID));
  assert.ok(this.run.stderr.includes(this.earlierRunLink), `the refusal does not name ${this.earlierRunLink}:\n${this.run.stderr}`);
  assert.ok(this.run.stderr.includes(earlierRunDir), `the refusal does not name ${earlierRunDir}:\n${this.run.stderr}`);
});
